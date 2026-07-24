-- FieldRelay 0002: durable, privacy-bounded CALL-E task records.

CREATE SEQUENCE IF NOT EXISTS call_task_display_seq AS bigint START WITH 1;

CREATE TABLE call_tasks (
  id                    uuid PRIMARY KEY,
  display_id            text NOT NULL UNIQUE
                          CHECK (char_length(display_id) BETWEEN 1 AND 64),
  incident_id           uuid NOT NULL REFERENCES incidents(id),
  provider              text NOT NULL CHECK (char_length(provider) BETWEEN 1 AND 64),
  provider_task_id      text CHECK (
                          provider_task_id IS NULL OR
                          char_length(provider_task_id) BETWEEN 1 AND 128
                        ),
  purpose               text NOT NULL CHECK (
                          purpose IN (
                            'vendor_availability',
                            'appointment_confirmation',
                            'status_update'
                          )
                        ),
  authorized_contact_id text NOT NULL
                          CHECK (char_length(authorized_contact_id) BETWEEN 1 AND 64),
  status                text NOT NULL CHECK (
                          status IN (
                            'queued', 'ringing', 'connected', 'completed',
                            'failed', 'no_answer', 'outcome_unknown'
                          )
                        ),
  simulated             boolean NOT NULL,
  failure_code          text CHECK (
                          failure_code IS NULL OR failure_code = 'provider_unavailable'
                        ),
  timeout_seconds       integer NOT NULL CHECK (timeout_seconds BETWEEN 30 AND 900),
  retries               integer NOT NULL CHECK (retries BETWEEN 0 AND 3),
  created_at            timestamptz NOT NULL,
  updated_at            timestamptz NOT NULL,
  version               integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  CONSTRAINT call_tasks_unknown_has_failure
    CHECK ((status = 'outcome_unknown') = (failure_code IS NOT NULL))
);

CREATE INDEX call_tasks_created_at_id_idx
  ON call_tasks (created_at DESC, id DESC);
CREATE INDEX call_tasks_status_created_at_idx
  ON call_tasks (status, created_at DESC, id DESC);
CREATE INDEX call_tasks_incident_created_at_idx
  ON call_tasks (incident_id, created_at DESC, id DESC);

INSERT INTO schema_migrations (version) VALUES ('0002_call_tasks')
  ON CONFLICT (version) DO NOTHING;
