import { randomUUID } from 'node:crypto';
import { Dispatch, DispatchInvariantError } from '../domain/dispatch.entity';
import {
  AdvanceDispatchUseCase,
  ListDispatchesUseCase,
  ReleaseDispatchUseCase
} from '../application/dispatch.use-cases';
import { Approval } from '../domain/approval.entity';
import { CallTask } from '../domain/call-task.entity';
import { InMemoryDatabase, InMemoryTransactionManager } from '../infrastructure/persistence/memory/in-memory-unit-of-work';

// A dispatch is the only object in FieldRelay that creates an obligation to pay
// someone. These tests are mostly about what it refuses to do.

function baseProps() {
  return {
    id: randomUUID(),
    displayId: 'DSP-2042-0001',
    incidentId: randomUUID(),
    callTaskId: randomUUID(),
    approvalId: randomUUID(),
    contactId: 'CNS-4491',
    quotedAmountText: '$35',
    scheduledFor: null,
    dispatchedBy: 'ops.demo@fieldrelay.io',
    dispatchedAt: new Date(),
    approvalStatus: 'approved'
  };
}

describe('Dispatch entity', () => {
  it('refuses to exist without an approved approval', () => {
    for (const status of ['pending', 'rejected']) {
      expect(() => Dispatch.create({ ...baseProps(), approvalStatus: status })).toThrow(
        DispatchInvariantError
      );
    }
  });

  it('names the person who released it', () => {
    expect(() => Dispatch.create({ ...baseProps(), dispatchedBy: '   ' })).toThrow(
      /who released it/
    );
  });

  it('refuses a transition that skips the middle of the job', () => {
    const dispatch = Dispatch.create(baseProps());
    // scheduled -> on_site would mean a vendor arrived without ever leaving.
    expect(() => dispatch.advance({ to: 'on_site', at: new Date() })).toThrow(
      /cannot become on_site/
    );
  });

  it('refuses to move a job that has already finished', () => {
    const dispatch = Dispatch.create(baseProps());
    dispatch.advance({ to: 'en_route', at: new Date() });
    dispatch.advance({ to: 'on_site', at: new Date() });
    dispatch.advance({ to: 'completed', at: new Date() });

    expect(() => dispatch.advance({ to: 'en_route', at: new Date() })).toThrow(
      /terminal state/
    );
  });

  it('refuses to cancel without recording why', () => {
    const dispatch = Dispatch.create(baseProps());
    expect(() => dispatch.advance({ to: 'cancelled', at: new Date() })).toThrow(
      /must record why/
    );
    expect(() => dispatch.advance({ to: 'cancelled', at: new Date(), reason: '   ' })).toThrow(
      /must record why/
    );
  });

  it('keeps the cancellation reason it was given', () => {
    const dispatch = Dispatch.create(baseProps());
    dispatch.advance({ to: 'cancelled', at: new Date(), reason: 'Tenant rescheduled' });
    expect(dispatch.status).toBe('cancelled');
    expect(dispatch.cancelledReason).toBe('Tenant rescheduled');
  });
});

describe('ReleaseDispatchUseCase', () => {
  function build(approvalStatus: 'pending' | 'approved' | 'rejected') {
    const db = new InMemoryDatabase();
    const transactions = new InMemoryTransactionManager(db);

    const incidentId = randomUUID();
    const callTask = CallTask.rehydrate({
      id: randomUUID(),
      displayId: 'CALL-2042-0001',
      incidentId,
      provider: 'call-e',
      providerTaskId: 'call_x',
      purpose: 'vendor_availability',
      authorizedContactId: 'CNS-4491',
      status: 'completed',
      simulated: false,
      failureCode: null,
      timeoutSeconds: 300,
      retries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    });
    db.callTasks.push(callTask);

    const approval = Approval.create({
      id: randomUUID(),
      displayId: 'APP-2042-0001',
      incidentId,
      callTaskId: callTask.id,
      reasons: ['cost_commitment'],
      outcomeReceivedAt: new Date(),
      createdAt: new Date()
    });
    if (approvalStatus !== 'pending') {
      approval.decide({
        status: approvalStatus,
        decidedBy: 'ops.demo@fieldrelay.io',
        decisionNote: null,
        at: new Date(),
        currentOutcomeReceivedAt: approval.outcomeReceivedAt
      });
    }
    db.approvals.push(approval);

    db.outcomes.set(callTask.id, {
      callTaskId: callTask.id,
      structuredResult: { available: 'yes', quoted_amount_text: '$35' },
      taskCompleted: true,
      confidenceScore: 0.82,
      confidenceLabel: 'high',
      validationFailed: false,
      receivedAt: approval.outcomeReceivedAt
    });

    return { db, transactions, approval, callTask };
  }

  it('refuses to dispatch against a pending approval', async () => {
    const { transactions, approval } = build('pending');
    const useCase = new ReleaseDispatchUseCase(transactions);

    await expect(
      useCase.execute({
        approvalId: approval.id,
        dispatchedBy: 'ops.demo@fieldrelay.io',
        correlationId: 'req-1'
      })
    ).rejects.toThrow(/Only an approved decision/);
  });

  it('refuses to dispatch against a rejected approval', async () => {
    const { transactions, approval } = build('rejected');
    const useCase = new ReleaseDispatchUseCase(transactions);

    await expect(
      useCase.execute({
        approvalId: approval.id,
        dispatchedBy: 'ops.demo@fieldrelay.io',
        correlationId: 'req-1'
      })
    ).rejects.toThrow(/rejected/);
  });

  it('sends exactly one vendor when the same approval is released twice', async () => {
    const { db, transactions, approval } = build('approved');
    const useCase = new ReleaseDispatchUseCase(transactions);

    const first = await useCase.execute({
      approvalId: approval.id,
      dispatchedBy: 'ops.demo@fieldrelay.io',
      correlationId: 'req-1'
    });
    const second = await useCase.execute({
      approvalId: approval.id,
      dispatchedBy: 'ops.demo@fieldrelay.io',
      correlationId: 'req-2'
    });

    expect(second.id).toBe(first.id);
    expect(db.dispatches).toHaveLength(1);
  });

  it('takes the vendor from the call that was actually made, not the request', async () => {
    const { transactions, approval, callTask } = build('approved');
    const useCase = new ReleaseDispatchUseCase(transactions);

    const dispatch = await useCase.execute({
      approvalId: approval.id,
      dispatchedBy: 'ops.demo@fieldrelay.io',
      correlationId: 'req-1'
    });

    expect(dispatch.contactId).toBe(callTask.authorizedContactId);
  });

  it('carries the quoted amount forward as spoken, never parsed', async () => {
    const { transactions, approval } = build('approved');
    const useCase = new ReleaseDispatchUseCase(transactions);

    const dispatch = await useCase.execute({
      approvalId: approval.id,
      dispatchedBy: 'ops.demo@fieldrelay.io',
      correlationId: 'req-1'
    });

    expect(dispatch.quotedAmountText).toBe('$35');
    expect(typeof dispatch.quotedAmountText).toBe('string');
  });

  it('carries no amount forward when the answer failed validation', async () => {
    const { db, transactions, approval, callTask } = build('approved');
    const stored = db.outcomes.get(callTask.id)!;
    db.outcomes.set(callTask.id, { ...stored, validationFailed: true });

    const dispatch = await new ReleaseDispatchUseCase(transactions).execute({
      approvalId: approval.id,
      dispatchedBy: 'ops.demo@fieldrelay.io',
      correlationId: 'req-1'
    });

    expect(dispatch.quotedAmountText).toBeNull();
  });

  it('never writes the quoted amount into the audit trail', async () => {
    const { db, transactions, approval } = build('approved');
    await new ReleaseDispatchUseCase(transactions).execute({
      approvalId: approval.id,
      dispatchedBy: 'ops.demo@fieldrelay.io',
      correlationId: 'req-1'
    });

    // The figure came from a stranger on a telephone; the audit log records
    // that a price existed, not what it was.
    expect(JSON.stringify(db.auditEvents)).not.toContain('$35');
    expect(JSON.stringify(db.auditEvents)).toContain('quotedAmountPresent');
  });

  it('rejects a scheduledFor that is not a timestamp', async () => {
    const { transactions, approval } = build('approved');
    await expect(
      new ReleaseDispatchUseCase(transactions).execute({
        approvalId: approval.id,
        dispatchedBy: 'ops.demo@fieldrelay.io',
        scheduledFor: 'tomorrow afternoon',
        correlationId: 'req-1'
      })
    ).rejects.toThrow(/ISO-8601/);
  });

  it('lists newest first, because a board shows what is happening now', async () => {
    const { transactions, approval } = build('approved');
    await new ReleaseDispatchUseCase(transactions).execute({
      approvalId: approval.id,
      dispatchedBy: 'ops.demo@fieldrelay.io',
      correlationId: 'req-1'
    });

    const page = await new ListDispatchesUseCase(transactions).execute({});
    expect(page.items).toHaveLength(1);
    expect(page.items[0].approvalId).toBe(approval.id);
  });

  it('records who moved the job and what it moved from', async () => {
    const { db, transactions, approval } = build('approved');
    const dispatch = await new ReleaseDispatchUseCase(transactions).execute({
      approvalId: approval.id,
      dispatchedBy: 'ops.demo@fieldrelay.io',
      correlationId: 'req-1'
    });

    await new AdvanceDispatchUseCase(transactions).execute({
      dispatchId: dispatch.id,
      to: 'en_route',
      actorId: 'ops.demo@fieldrelay.io',
      correlationId: 'req-2'
    });

    const event = db.auditEvents.find((e) => e.action === 'dispatch.en_route');
    expect(event).toBeDefined();
    expect(event?.metadata).toMatchObject({ from: 'scheduled', to: 'en_route' });
  });
});
