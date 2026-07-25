-- FieldRelay 0003: replay-safe provider callbacks and call.start reservation tracking.

ALTER TABLE operation_idempotency
  ADD COLUMN IF NOT EXISTS call_task_id uuid REFERENCES call_tasks(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS provider_callbacks (
  event_id           text PRIMARY KEY CHECK (char_length(event_id) BETWEEN 1 AND 128),
  provider_task_id   text NOT NULL CHECK (char_length(provider_task_id) BETWEEN 1 AND 128),
  status             text NOT NULL CHECK (
                       status IN ('ringing', 'connected', 'completed', 'failed', 'no_answer')
                     ),
  payload_hash       text NOT NULL CHECK (char_length(payload_hash) = 64),
  processed          boolean NOT NULL DEFAULT false,
  processing_outcome text CHECK (
                       processing_outcome IS NULL OR
                       processing_outcome IN (
                         'processed', 'same_state_noop',
                         'rejected_unknown_task', 'rejected_invalid_transition'
                       )
                     ),
  received_at        timestamptz NOT NULL DEFAULT now(),
  processed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS provider_callbacks_provider_task_id_idx
  ON provider_callbacks (provider_task_id, received_at DESC);

INSERT INTO schema_migrations (version) VALUES ('0003_call_callbacks')
  ON CONFLICT (version) DO NOTHING;
