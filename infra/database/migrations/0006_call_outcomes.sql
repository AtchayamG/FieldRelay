-- FieldRelay 0006: structured outcomes extracted from completed calls.
--
-- This is the row that turns a phone call into a business decision. CALL-E
-- returns a structured_result matching the JSON Schema FieldRelay declared when
-- it created the call, plus its own judgment of whether the task was completed
-- and how confident it is.
--
-- What is deliberately NOT stored here:
--   * transcripts and recordings — security doc 08 requires access controls and
--     retention rules that do not exist yet, so they are discarded at the
--     webhook boundary rather than persisted and forgotten about.
--   * the provider's free-text summary — it is unvalidated call content, and an
--     approval decision must rest on the schema-validated fields instead.
--
-- One outcome per call task: a call reaches a terminal state once, and a
-- redelivered webhook must update that row rather than append a second opinion.

CREATE TABLE IF NOT EXISTS call_outcomes (
  call_task_id      uuid PRIMARY KEY REFERENCES call_tasks(id) ON DELETE CASCADE,

  -- The schema-validated answer. Bounded by a size check so a malformed or
  -- hostile payload cannot bloat the row.
  structured_result jsonb NOT NULL,

  -- CALL-E's own judgment that the goal was achieved. Distinct from the call
  -- having connected: a call can complete while the task fails.
  task_completed    boolean NOT NULL,

  -- 0..1, with the provider's own label. An approval policy should gate on
  -- this rather than trusting every answer equally.
  confidence_score  numeric(4, 3) CHECK (
                      confidence_score IS NULL OR
                      (confidence_score >= 0 AND confidence_score <= 1)
                    ),
  confidence_label  text CHECK (
                      confidence_label IS NULL OR char_length(confidence_label) <= 32
                    ),

  -- Set when the answer did not satisfy the declared schema. The outcome is
  -- still recorded, because "the call happened but the answer was unusable" is
  -- itself a fact an operator must see, rather than silently discarding it.
  validation_failed boolean NOT NULL DEFAULT false,

  received_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT call_outcomes_result_size CHECK (pg_column_size(structured_result) <= 8192)
);

CREATE INDEX IF NOT EXISTS call_outcomes_received_at_idx
  ON call_outcomes (received_at DESC);

INSERT INTO schema_migrations (version) VALUES ('0006_call_outcomes')
  ON CONFLICT (version) DO NOTHING;
