import { TransactionPort } from './persistence.port';
import { StartCallResult } from './start-call.use-case';

export interface ReconcileStaleReservationsInput {
  cutoff: Date;
  limit?: number;
}

export interface ReconciledReservationItem {
  key: string;
  callTaskId: string | null;
  outcome: 'marked_outcome_unknown' | 'completed_existing_status' | 'completed_missing_task';
  status: string;
}

export interface ReconcileStaleReservationsResult {
  reconciledCount: number;
  items: ReconciledReservationItem[];
}

export class ReconcileStaleReservationsUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(
    input: ReconcileStaleReservationsInput
  ): Promise<ReconcileStaleReservationsResult> {
    const cutoff = input.cutoff;
    const requestedLimit = input.limit ?? 100;
    // Hard maximum batch size of 100
    const limit = Math.min(Math.max(1, requestedLimit), 100);

    const staleReservations = await this.transactions.withTransaction((uow) =>
      uow.idempotency.findStaleReservations('call.start', cutoff, limit)
    );

    const items: ReconciledReservationItem[] = [];

    for (const stale of staleReservations) {
      const itemResult = await this.transactions.withTransaction(async (uow) => {
        const now = new Date();
        const callTaskId = stale.callTaskId;

        if (!callTaskId) {
          // Missing task ID in reservation
          const sanitizedResult: StartCallResult = {
            callTaskId: 'unknown',
            displayId: 'UNKNOWN',
            providerTaskId: 'unknown',
            status: 'outcome_unknown',
            simulated: true
          };
          await uow.idempotency.complete('call.start', stale.key, sanitizedResult);
          await uow.audit.append({
            actorType: 'system',
            actorId: 'fieldrelay-api',
            action: 'call.reservation.reconciled_missing_task',
            entityType: 'operation_idempotency',
            entityId: stale.key,
            correlationId: `reconcile_${stale.key}`,
            metadata: {
              idempotencyKey: stale.key,
              reason: 'no_associated_call_task_id'
            }
          });
          return {
            key: stale.key,
            callTaskId: null,
            outcome: 'completed_missing_task' as const,
            status: 'outcome_unknown'
          };
        }

        const task = await uow.calls.findById(callTaskId);

        if (!task) {
          // Associated task does not exist
          const sanitizedResult: StartCallResult = {
            callTaskId,
            displayId: 'UNKNOWN',
            providerTaskId: 'unknown',
            status: 'outcome_unknown',
            simulated: true
          };
          await uow.idempotency.complete('call.start', stale.key, sanitizedResult);
          await uow.audit.append({
            actorType: 'system',
            actorId: 'fieldrelay-api',
            action: 'call.reservation.reconciled_missing_task',
            entityType: 'call_task',
            entityId: callTaskId,
            correlationId: `reconcile_${stale.key}`,
            metadata: {
              idempotencyKey: stale.key,
              callTaskId,
              reason: 'task_not_found'
            }
          });
          return {
            key: stale.key,
            callTaskId,
            outcome: 'completed_missing_task' as const,
            status: 'outcome_unknown'
          };
        }

        // Matching task exists
        if (task.status === 'queued') {
          // Atomically mark queued task outcome_unknown
          task.markOutcomeUnknown(now);
          await uow.calls.update(task);

          const sanitizedResult: StartCallResult = {
            callTaskId: task.id,
            displayId: task.displayId,
            providerTaskId: task.providerTaskId ?? 'unknown',
            status: 'outcome_unknown',
            simulated: task.simulated
          };

          await uow.idempotency.complete('call.start', stale.key, sanitizedResult);
          await uow.audit.append({
            actorType: 'system',
            actorId: 'fieldrelay-api',
            action: 'call.reservation.reconciled_queued_task',
            entityType: 'call_task',
            entityId: task.id,
            correlationId: `reconcile_${stale.key}`,
            metadata: {
              idempotencyKey: stale.key,
              callTaskId: task.id,
              previousStatus: 'queued',
              newStatus: 'outcome_unknown'
            }
          });

          return {
            key: stale.key,
            callTaskId: task.id,
            outcome: 'marked_outcome_unknown' as const,
            status: 'outcome_unknown'
          };
        } else {
          // Task already moved past queued (e.g. ringing, connected, completed, failed, no_answer, outcome_unknown)
          const sanitizedResult: StartCallResult = {
            callTaskId: task.id,
            displayId: task.displayId,
            providerTaskId: task.providerTaskId ?? 'unknown',
            status: task.status,
            simulated: task.simulated
          };

          await uow.idempotency.complete('call.start', stale.key, sanitizedResult);
          await uow.audit.append({
            actorType: 'system',
            actorId: 'fieldrelay-api',
            action: 'call.reservation.reconciled_existing_status',
            entityType: 'call_task',
            entityId: task.id,
            correlationId: `reconcile_${stale.key}`,
            metadata: {
              idempotencyKey: stale.key,
              callTaskId: task.id,
              taskStatus: task.status
            }
          });

          return {
            key: stale.key,
            callTaskId: task.id,
            outcome: 'completed_existing_status' as const,
            status: task.status
          };
        }
      });

      items.push(itemResult);
    }

    return {
      reconciledCount: items.length,
      items
    };
  }
}
