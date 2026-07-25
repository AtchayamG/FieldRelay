-- FieldRelay 0004: let call tasks be purged without breaking their replay guard.
--
-- 0003 added operation_idempotency.call_task_id as a plain reference with no
-- delete rule, which made call_tasks effectively undeletable: any purge, any
-- retention job, and any test teardown hit
--   "update or delete on table call_tasks violates foreign key constraint
--    operation_idempotency_call_task_id_fkey".
--
-- The two rows have different lifetimes on purpose. A call task is operational
-- data subject to retention (security doc 08). Its idempotency record is a
-- replay guard whose whole job is to outlive the operation, so that a retry
-- arriving after the task is gone still cannot place a second call. Deleting
-- the task must therefore null the reference, not cascade into the guard and
-- not block the delete.

ALTER TABLE operation_idempotency
  DROP CONSTRAINT IF EXISTS operation_idempotency_call_task_id_fkey;

ALTER TABLE operation_idempotency
  ADD CONSTRAINT operation_idempotency_call_task_id_fkey
  FOREIGN KEY (call_task_id) REFERENCES call_tasks(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

INSERT INTO schema_migrations (version) VALUES ('0004_idempotency_task_fk')
  ON CONFLICT (version) DO NOTHING;
