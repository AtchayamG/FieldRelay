-- Dispatches: the point at which FieldRelay creates an obligation to pay
-- someone. Everything before this is reversible; a vendor who has been told to
-- attend cannot be un-told, so the constraints here are deliberately strict.

CREATE TABLE IF NOT EXISTS dispatches (
  id                UUID PRIMARY KEY,
  display_id        TEXT NOT NULL UNIQUE,
  incident_id       UUID NOT NULL REFERENCES incidents (id) ON DELETE RESTRICT,
  call_task_id      UUID NOT NULL REFERENCES call_tasks (id) ON DELETE RESTRICT,

  -- NOT NULL and UNIQUE together are the whole safety story:
  --   NOT NULL  - a dispatch cannot exist without an authorising decision;
  --   UNIQUE    - one approval can only ever release one dispatch, so a
  --               double-click or a retried request cannot put two vendors on
  --               the same job. An application-level check would be a race.
  approval_id       UUID NOT NULL UNIQUE REFERENCES approvals (id) ON DELETE RESTRICT,

  contact_id        TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (
                      status IN ('scheduled', 'en_route', 'on_site', 'completed', 'cancelled')
                    ),

  -- Stored as the vendor said it, never parsed into a numeric column.
  -- "$35, more if the valve is seized" has no correct numeric reading, and a
  -- NUMERIC column would force us to invent one.
  quoted_amount_text TEXT,

  scheduled_for     TIMESTAMPTZ,
  dispatched_by     TEXT NOT NULL,
  dispatched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_reason  TEXT,
  version           INTEGER NOT NULL DEFAULT 1,

  -- A cancelled dispatch means somebody was told not to come. That has a cost,
  -- and the reason is the useful part of the record.
  CONSTRAINT dispatches_cancelled_needs_reason CHECK (
    status <> 'cancelled' OR (cancelled_reason IS NOT NULL AND length(trim(cancelled_reason)) > 0)
  )
);

-- The board is read by status and by recency far more often than by id.
CREATE INDEX IF NOT EXISTS dispatches_status_idx ON dispatches (status, dispatched_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS dispatches_incident_idx ON dispatches (incident_id, dispatched_at DESC);

-- Human-readable identifiers come from a sequence rather than a count, so two
-- concurrent releases cannot be handed the same number.
CREATE SEQUENCE IF NOT EXISTS dispatch_display_seq START 1;
