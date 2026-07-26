-- FieldRelay 0007: human approval gate over a validated call outcome.
--
-- This is the row that makes an automated phone call accountable. CALL-E can
-- learn that a vendor will attend for $360; only a person can commit to paying
-- it. Nothing downstream — dispatch, commitments — may proceed from an outcome
-- that required approval and did not get one.

-- Human-readable identifiers come from a sequence rather than a count, so two
-- concurrent transactions cannot mint the same display ID.
CREATE SEQUENCE IF NOT EXISTS approval_display_seq START 1;

CREATE TABLE IF NOT EXISTS approvals (
  id                 uuid PRIMARY KEY,
  display_id         text NOT NULL UNIQUE CHECK (char_length(display_id) BETWEEN 1 AND 32),
  incident_id        uuid NOT NULL REFERENCES incidents(id),
  call_task_id       uuid NOT NULL REFERENCES call_tasks(id) ON DELETE CASCADE,

  status             text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Why a human was asked at all. Stored so the queue can explain itself and so
  -- a later policy change does not rewrite the history of past decisions.
  reasons            jsonb NOT NULL,

  -- Snapshot of the outcome timestamp this approval was raised against. A
  -- decision made against a superseded answer is refused rather than applied:
  -- the approver would be committing to something they never saw.
  outcome_received_at timestamptz NOT NULL,

  decided_by         text CHECK (decided_by IS NULL OR char_length(decided_by) <= 200),
  decided_at         timestamptz,
  -- Operator's reason, bounded. Never populated from provider data.
  decision_note      text CHECK (decision_note IS NULL OR char_length(decision_note) <= 500),

  created_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,

  -- A decided approval must carry who decided it and when; a pending one must
  -- carry neither. Enforced here so the invariant cannot be broken by any
  -- future write path.
  CONSTRAINT approvals_decision_complete CHECK (
    (status = 'pending'  AND decided_by IS NULL AND decided_at IS NULL) OR
    (status <> 'pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  )
);

-- One approval per call task: a single answer is decided once, not repeatedly.
CREATE UNIQUE INDEX IF NOT EXISTS approvals_call_task_id_key ON approvals (call_task_id);

-- The queue's default view: oldest pending first, because an approval that has
-- been waiting longest is usually the one blocking a resolution.
CREATE INDEX IF NOT EXISTS approvals_pending_idx
  ON approvals (created_at ASC) WHERE status = 'pending';

INSERT INTO schema_migrations (version) VALUES ('0007_approvals')
  ON CONFLICT (version) DO NOTHING;
