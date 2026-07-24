-- FieldRelay 0001: incidents, append-only audit events, operation idempotency.
--
-- Applied either by `pnpm --filter fieldrelay-api db:migrate` or by the local
-- Docker Compose Postgres on first boot. The final INSERT records the version
-- so both paths agree on what has already run.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- Incidents
-- --------------------------------------------------------------------------

-- Human-readable identifiers only; the UUID is the primary key. The 2042 year
-- segment marks every generated identifier as fictional demo data.
CREATE SEQUENCE IF NOT EXISTS incident_display_seq AS bigint START WITH 1;

CREATE TABLE incidents (
  id          uuid PRIMARY KEY,
  display_id  text NOT NULL UNIQUE,
  property_id text NOT NULL CHECK (char_length(property_id) BETWEEN 1 AND 64),
  unit        text CHECK (unit IS NULL OR char_length(unit) BETWEEN 1 AND 32),
  type        text NOT NULL CHECK (
                type IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'other')
              ),
  priority    text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status      text NOT NULL CHECK (
                status IN ('intake', 'triage', 'calling', 'awaiting_approval',
                           'dispatched', 'resolved', 'cancelled')
              ),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  reported_by text NOT NULL CHECK (char_length(reported_by) BETWEEN 1 AND 128),
  created_at  timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL,
  version     integer NOT NULL DEFAULT 1 CHECK (version >= 1)
);

-- Matches the keyset pagination sort key (created_at DESC, id DESC).
CREATE INDEX incidents_created_at_id_idx ON incidents (created_at DESC, id DESC);
CREATE INDEX incidents_status_created_at_idx ON incidents (status, created_at DESC, id DESC);

-- --------------------------------------------------------------------------
-- Audit events (append-only)
-- --------------------------------------------------------------------------

CREATE TABLE audit_events (
  id             bigserial PRIMARY KEY,
  actor_type     text NOT NULL CHECK (actor_type IN ('user', 'system', 'agent')),
  actor_id       text NOT NULL,
  action         text NOT NULL,
  entity_type    text NOT NULL,
  entity_id      text NOT NULL,
  correlation_id text NOT NULL,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_events_correlation_idx ON audit_events (correlation_id);

-- Append-only is enforced by the database, not by convention, so an
-- application bug or an ad-hoc session cannot rewrite history.
CREATE OR REPLACE FUNCTION audit_events_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only; % is not permitted', TG_OP;
END;
$$;

CREATE TRIGGER audit_events_no_row_rewrite
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();

CREATE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_append_only();

-- --------------------------------------------------------------------------
-- Operation idempotency
-- --------------------------------------------------------------------------

-- One row per (operation, Idempotency-Key). The primary key is the mutual
-- exclusion mechanism: the first writer inserts, every later writer blocks on
-- that row until the first commits and then reads the recorded outcome.
CREATE TABLE operation_idempotency (
  operation       text NOT NULL CHECK (operation IN ('incident.create', 'call.start')),
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 255),
  request_hash    text NOT NULL,
  state           text NOT NULL CHECK (state IN ('in_progress', 'completed')),
  result          jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  PRIMARY KEY (operation, idempotency_key),
  -- A completed operation must have a replayable result to hand back.
  CONSTRAINT operation_idempotency_completed_has_result
    CHECK (state <> 'completed' OR result IS NOT NULL)
);

-- Supports reaping abandoned in-progress reservations.
CREATE INDEX operation_idempotency_state_created_at_idx
  ON operation_idempotency (state, created_at);

INSERT INTO schema_migrations (version) VALUES ('0001_incidents')
  ON CONFLICT (version) DO NOTHING;
