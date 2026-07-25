-- FieldRelay 0005: operator-changeable runtime settings.
--
-- Holds the small number of values an operator may change from inside the
-- application rather than by editing the deployment environment. Today that is
-- the live call target: the single phone number a real CALL-E call may reach.
--
-- Deliberately narrow. This is not a general key/value store for application
-- config: every key is enumerated by a CHECK constraint, so a new setting
-- requires a migration and therefore a review. A number that reaches this table
-- still cannot be dialled unless CALL_E_MODE=live and
-- CALLE_ALLOW_RUNTIME_DIAL_TARGET=true, so a public judge deployment is
-- unaffected by whatever is stored here.

CREATE TABLE IF NOT EXISTS runtime_settings (
  key        text PRIMARY KEY CHECK (key IN ('live_dial_target')),
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL CHECK (char_length(updated_by) BETWEEN 1 AND 200)
);

INSERT INTO schema_migrations (version) VALUES ('0005_runtime_settings')
  ON CONFLICT (version) DO NOTHING;
