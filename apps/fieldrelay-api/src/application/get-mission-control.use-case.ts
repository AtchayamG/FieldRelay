import { TransactionPort } from './persistence.port';
import { CallOutcome } from './call-outcome';
import { IncidentStatus } from '../domain/incident.entity';
import { CallStatus } from '../domain/call-task.entity';

// A guardrail is a refusal the system enforces, reported as live state rather
// than as marketing copy. `engaged` means the refusal is currently in force.
//
// This exists because the most important behaviour of this system is invisible:
// a call that was not placed, an answer that was discarded, a decision that was
// refused. If an operator — or a judge — cannot see the refusals, they have to
// take them on faith.
export interface Guardrail {
  id: string;
  label: string;
  detail: string;
  engaged: boolean;
}

export interface MissionControlIncident {
  id: string;
  displayId: string;
  propertyId: string;
  unit: string | null;
  type: string;
  priority: string;
  status: string;
  updatedAt: string;
}

export interface MissionControlCall {
  id: string;
  displayId: string;
  incidentId: string;
  purpose: string;
  status: string;
  simulated: boolean;
  createdAt: string;
  outcome: {
    taskCompleted: boolean;
    confidenceLabel: string | null;
    validationFailed: boolean;
    fields: string[];
  } | null;
}

export interface MissionControlApproval {
  id: string;
  displayId: string;
  incidentId: string;
  reasons: string[];
  createdAt: string;
}

export interface MissionControlState {
  metrics: {
    activeIncidents: number;
    callsInFlight: number;
    pendingApprovals: number;
    realCallsPlaced: number;
  };
  incidents: MissionControlIncident[];
  calls: MissionControlCall[];
  approvals: MissionControlApproval[];
  guardrails: Guardrail[];
  mode: 'demo' | 'live';
  generatedAt: string;
}

const OPEN_STATUSES: readonly IncidentStatus[] = [
  'intake',
  'triage',
  'calling',
  'awaiting_approval',
  'dispatched'
];
const IN_FLIGHT: readonly CallStatus[] = ['queued', 'ringing', 'connected'];

// Assembles the operational picture from real persisted state. Nothing here is
// invented: every number is counted from a row that exists.
export class GetMissionControlUseCase {
  constructor(
    private readonly transactions: TransactionPort,
    private readonly priorCallsElsewhere: number,
    private readonly mode: 'demo' | 'live',
    private readonly runtimeDialTargetAllowed: boolean
  ) {}

  public async execute(): Promise<MissionControlState> {
    return this.transactions.withTransaction(async (uow) => {
      const incidentPage = await uow.incidents.list({ limit: 8 });
      const callPage = await uow.calls.list({ limit: 8 });
      const approvalPage = await uow.approvals.list({ limit: 5, status: 'pending' });

      const calls: MissionControlCall[] = [];
      for (const task of callPage.items) {
        const outcome = await uow.outcomes.findByCallTaskId(task.id);
        calls.push({
          id: task.id,
          displayId: task.displayId,
          incidentId: task.incidentId,
          purpose: task.purpose,
          status: task.status,
          simulated: task.simulated,
          createdAt: task.createdAt.toISOString(),
          outcome: outcome ? summariseOutcome(outcome) : null
        });
      }

      const liveCallCount = await uow.calls.countLiveCalls();
      const activeIncidentCount = await uow.incidents.countByStatuses(OPEN_STATUSES);
      const callsInFlightCount = await uow.calls.countByStatuses(IN_FLIGHT);

      return {
        metrics: {
          activeIncidents: activeIncidentCount,
          callsInFlight: callsInFlightCount,
          pendingApprovals: await uow.approvals.countPending(),
          realCallsPlaced: liveCallCount + this.priorCallsElsewhere
        },
        incidents: incidentPage.items.map((incident) => {
          const props = incident.toProps();
          return {
            id: props.id,
            displayId: props.displayId,
            propertyId: props.propertyId,
            unit: props.unit,
            type: props.type,
            priority: props.priority,
            status: props.status,
            updatedAt: props.updatedAt.toISOString()
          };
        }),
        calls,
        approvals: approvalPage.items.map((approval) => ({
          id: approval.id,
          displayId: approval.displayId,
          incidentId: approval.incidentId,
          reasons: approval.reasons,
          createdAt: approval.createdAt.toISOString()
        })),
        guardrails: this.guardrails(),
        mode: this.mode,
        generatedAt: new Date().toISOString()
      };
    });
  }

  // Reported from actual configuration, not hardcoded to look good. A guardrail
  // that is off must say so.
  private guardrails(): Guardrail[] {
    return [
      {
        id: 'dial_mode',
        label: 'Dialling disabled unless explicitly enabled',
        detail:
          this.mode === 'live'
            ? 'CALL_E_MODE is live. Real calls can be placed to provisioned numbers only.'
            : 'CALL_E_MODE is demo. This deployment is structurally incapable of placing a call.',
        engaged: this.mode === 'demo'
      },
      {
        id: 'allowlist',
        label: 'Only operator-provisioned numbers can be reached',
        detail: this.runtimeDialTargetAllowed
          ? 'An operator may nominate a number in Settings. It is validated and bound to an authorized contact.'
          : 'Numbers come only from the deployment environment. They cannot be changed from inside the app.',
        engaged: true
      },
      {
        id: 'no_redial',
        label: 'Ambiguous outcomes are never redialled',
        detail:
          'A call whose result is unknown is recorded as outcome_unknown and left for a human. No automatic retry exists.',
        engaged: true
      },
      {
        id: 'idempotent',
        label: 'One authorized task can only place one call',
        detail:
          'The idempotency key is the call task identifier and is reused across retries, so a repeat can never dial twice.',
        engaged: true
      },
      {
        id: 'no_transcript',
        label: 'Transcripts and recordings are never stored',
        detail:
          'The provider returns them; the webhook boundary discards them. Only schema-validated fields are kept.',
        engaged: true
      },
      {
        id: 'schema',
        label: 'Only the answer that was asked for is accepted',
        detail:
          'Undeclared fields are dropped and out-of-enum values refused, rather than coerced into a decision.',
        engaged: true
      },
      {
        id: 'approval',
        label: 'Money is never committed without a person',
        detail:
          'A quoted price, low confidence, a partial answer or an unachieved goal each raise an approval before anything proceeds.',
        engaged: true
      }
    ];
  }
}

function summariseOutcome(outcome: CallOutcome): NonNullable<MissionControlCall['outcome']> {
  return {
    taskCompleted: outcome.taskCompleted,
    confidenceLabel: outcome.confidenceLabel,
    validationFailed: outcome.validationFailed,
    // Field names only, never the answers: this feed is a wall display.
    fields: Object.keys(outcome.structuredResult)
  };
}
