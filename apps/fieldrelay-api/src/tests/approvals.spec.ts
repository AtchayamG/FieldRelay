import { randomUUID } from 'node:crypto';
import {
  CONFIDENCE_REVIEW_THRESHOLD,
  evaluateApprovalRequirement,
  requiresApproval
} from '../application/approval-policy';
import { DecideApprovalUseCase } from '../application/decide-approval.use-case';
import { ListApprovalsUseCase } from '../application/list-approvals.use-case';
import { CallOutcome } from '../application/call-outcome';
import { CallValidationError, NotFoundError } from '../application/errors';
import { Approval, ApprovalInvariantError } from '../domain/approval.entity';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';

const CALL_TASK_ID = '11111111-1111-4111-8111-111111111111';
const INCIDENT_ID = '22222222-2222-4222-8222-222222222222';
const RECEIVED_AT = new Date('2026-07-26T10:00:00.000Z');

function outcome(overrides: Partial<CallOutcome> = {}): CallOutcome {
  return {
    callTaskId: CALL_TASK_ID,
    structuredResult: { available: 'yes' },
    taskCompleted: true,
    confidenceScore: 0.9,
    confidenceLabel: 'high',
    validationFailed: false,
    receivedAt: RECEIVED_AT,
    ...overrides
  };
}

describe('approval policy', () => {
  it('lets a clean, confident, cost-free answer through without a human', () => {
    // Sending every answer to a person would make the automation pointless.
    expect(evaluateApprovalRequirement(outcome())).toEqual([]);
    expect(requiresApproval(outcome())).toBe(false);
  });

  it('always asks a person before committing money', () => {
    // CALL-E can discover that a vendor will attend for $360. Only a human can
    // agree to pay it.
    const reasons = evaluateApprovalRequirement(
      outcome({ structuredResult: { available: 'yes', quoted_amount_text: '$360' } })
    );
    expect(reasons).toContain('cost_commitment');
  });

  it('asks when the provider was not confident it understood', () => {
    expect(
      evaluateApprovalRequirement(outcome({ confidenceScore: CONFIDENCE_REVIEW_THRESHOLD - 0.01 }))
    ).toContain('low_confidence');
  });

  it('treats an absent confidence as low, not as confident', () => {
    // No opinion is not the same as a good opinion.
    expect(evaluateApprovalRequirement(outcome({ confidenceScore: null }))).toContain(
      'low_confidence'
    );
  });

  it('asks when part of the answer was discarded', () => {
    expect(evaluateApprovalRequirement(outcome({ validationFailed: true }))).toContain(
      'incomplete_answer'
    );
  });

  it('asks when the call finished but the goal was not achieved', () => {
    expect(evaluateApprovalRequirement(outcome({ taskCompleted: false }))).toContain(
      'task_not_completed'
    );
  });

  it('accumulates every reason rather than stopping at the first', () => {
    // The person deciding needs the whole picture, not the first problem found.
    const reasons = evaluateApprovalRequirement(
      outcome({
        structuredResult: { quoted_amount_text: '$900' },
        taskCompleted: false,
        confidenceScore: 0.2,
        validationFailed: true
      })
    );
    expect(reasons).toHaveLength(4);
  });
});

describe('Approval entity', () => {
  function pending(): Approval {
    return Approval.create({
      id: randomUUID(),
      displayId: 'APP-2042-0001',
      incidentId: INCIDENT_ID,
      callTaskId: CALL_TASK_ID,
      reasons: ['cost_commitment'],
      outcomeReceivedAt: RECEIVED_AT,
      createdAt: RECEIVED_AT
    });
  }

  it('refuses to exist without a reason it can explain', () => {
    expect(() =>
      Approval.create({
        id: randomUUID(),
        displayId: 'APP-2042-0002',
        incidentId: INCIDENT_ID,
        callTaskId: CALL_TASK_ID,
        reasons: [],
        outcomeReceivedAt: RECEIVED_AT,
        createdAt: RECEIVED_AT
      })
    ).toThrow(ApprovalInvariantError);
  });

  it('records who decided and when', () => {
    const approval = pending();
    const at = new Date('2026-07-26T11:00:00.000Z');
    approval.decide({
      status: 'approved',
      decidedBy: 'ops.demo@fieldrelay.io',
      decisionNote: 'Rate is within policy.',
      at,
      currentOutcomeReceivedAt: RECEIVED_AT
    });

    expect(approval.status).toBe('approved');
    expect(approval.decidedBy).toBe('ops.demo@fieldrelay.io');
    expect(approval.decidedAt).toEqual(at);
    expect(approval.version).toBe(2);
  });

  it('refuses a second decision instead of overwriting the first', () => {
    // The first decision is the accountable one. Overwriting it would erase who
    // committed the organisation to what.
    const approval = pending();
    approval.decide({
      status: 'approved',
      decidedBy: 'first@fieldrelay.io',
      decisionNote: null,
      at: new Date(),
      currentOutcomeReceivedAt: RECEIVED_AT
    });

    expect(() =>
      approval.decide({
        status: 'rejected',
        decidedBy: 'second@fieldrelay.io',
        decisionNote: null,
        at: new Date(),
        currentOutcomeReceivedAt: RECEIVED_AT
      })
    ).toThrow(/already approved/);
    expect(approval.decidedBy).toBe('first@fieldrelay.io');
  });

  it('refuses a decision made against a superseded answer', () => {
    // The approver would be agreeing to something they never read.
    const approval = pending();
    expect(() =>
      approval.decide({
        status: 'approved',
        decidedBy: 'ops.demo@fieldrelay.io',
        decisionNote: null,
        at: new Date(),
        currentOutcomeReceivedAt: new Date('2026-07-26T10:05:00.000Z')
      })
    ).toThrow(/outcome changed/);
    expect(approval.status).toBe('pending');
  });

  it('refuses an anonymous decision', () => {
    const approval = pending();
    expect(() =>
      approval.decide({
        status: 'approved',
        decidedBy: '   ',
        decisionNote: null,
        at: new Date(),
        currentOutcomeReceivedAt: RECEIVED_AT
      })
    ).toThrow(ApprovalInvariantError);
  });
});

describe('DecideApprovalUseCase', () => {
  async function setup() {
    const database = new InMemoryDatabase();
    const transactions = new InMemoryTransactionManager(database);
    const approval = Approval.create({
      id: randomUUID(),
      displayId: 'APP-2042-0001',
      incidentId: INCIDENT_ID,
      callTaskId: CALL_TASK_ID,
      reasons: ['cost_commitment', 'low_confidence'],
      outcomeReceivedAt: RECEIVED_AT,
      createdAt: RECEIVED_AT
    });

    await transactions.withTransaction(async (uow) => {
      await uow.approvals.insert(approval);
      await uow.outcomes.upsert(outcome());
    });

    return { database, transactions, approval };
  }

  it('records an accountable decision and audits it', async () => {
    const { database, transactions, approval } = await setup();
    const useCase = new DecideApprovalUseCase(transactions);

    const result = await useCase.execute({
      approvalId: approval.id,
      decision: 'approved',
      decidedBy: 'ops.demo@fieldrelay.io',
      decisionNote: 'Within the agreed rate.',
      correlationId: 'req_1'
    });

    expect(result.approval.status).toBe('approved');
    const event = database.auditEvents.find((entry) => entry.action === 'approval.approved');
    expect(event?.actorId).toBe('ops.demo@fieldrelay.io');
    // Whether a note was left, never what it said: the note may quote the call.
    expect(event?.metadata.noteProvided).toBe(true);
    expect(JSON.stringify(event?.metadata)).not.toContain('agreed rate');
  });

  it.each([
    ['a missing approval', { approvalId: randomUUID() }, NotFoundError],
    ['a malformed id', { approvalId: 'not-a-uuid' }, CallValidationError],
    ['an unsupported decision', { decision: 'maybe' as 'approved' }, CallValidationError]
  ])('refuses %s', async (_label, overrides, expected) => {
    const { transactions, approval } = await setup();
    const useCase = new DecideApprovalUseCase(transactions);

    await expect(
      useCase.execute({
        approvalId: approval.id,
        decision: 'approved',
        decidedBy: 'ops.demo@fieldrelay.io',
        correlationId: 'req_1',
        ...overrides
      })
    ).rejects.toBeInstanceOf(expected);
  });

  it('refuses a decision once the answer has been superseded', async () => {
    const { transactions, approval } = await setup();
    // A later webhook redelivered a different answer for the same call.
    await transactions.withTransaction((uow) =>
      uow.outcomes.upsert(outcome({ receivedAt: new Date('2026-07-26T10:30:00.000Z') }))
    );

    const useCase = new DecideApprovalUseCase(transactions);
    await expect(
      useCase.execute({
        approvalId: approval.id,
        decision: 'approved',
        decidedBy: 'ops.demo@fieldrelay.io',
        correlationId: 'req_1'
      })
    ).rejects.toThrow(/outcome changed/);
  });
});

describe('ListApprovalsUseCase', () => {
  it('returns each approval beside the answer being decided on', async () => {
    const database = new InMemoryDatabase();
    const transactions = new InMemoryTransactionManager(database);
    await transactions.withTransaction(async (uow) => {
      await uow.approvals.insert(
        Approval.create({
          id: randomUUID(),
          displayId: 'APP-2042-0001',
          incidentId: INCIDENT_ID,
          callTaskId: CALL_TASK_ID,
          reasons: ['cost_commitment'],
          outcomeReceivedAt: RECEIVED_AT,
          createdAt: RECEIVED_AT
        })
      );
      await uow.outcomes.upsert(outcome({ structuredResult: { quoted_amount_text: '$360' } }));
    });

    const result = await new ListApprovalsUseCase(transactions).execute({ status: 'pending' });

    expect(result.pendingCount).toBe(1);
    // An approval queue that made someone open a second screen to see what they
    // are approving would not get used.
    expect(result.items[0].outcome?.structuredResult).toEqual({ quoted_amount_text: '$360' });
  });

  it.each([
    ['an out-of-range limit', { limit: 500 }],
    ['an unknown status', { status: 'maybe' }],
    ['a malformed incident id', { incidentId: 'nope' }]
  ])('rejects %s', async (_label, input) => {
    const transactions = new InMemoryTransactionManager(new InMemoryDatabase());
    await expect(new ListApprovalsUseCase(transactions).execute(input)).rejects.toBeInstanceOf(
      CallValidationError
    );
  });
});
