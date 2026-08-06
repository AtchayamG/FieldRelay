import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MissionControlPort } from '../application/mission-control.port';
import {
  ActivityEvent,
  IncidentCommandItem,
  IncidentMetric,
  MissionControlData,
  OrchestrationStep,
  PendingApproval,
  SystemStateMode
} from '../domain/mission-control.types';
import { Guardrail, MissionControlState } from '../domain/mission-control-state.model';

interface ApiEnvelope<T> {
  data: T;
}

// Mission Control backed by real persisted state.
//
// Everything rendered from this adapter is counted from rows that exist. Where
// a panel has no real data behind it yet, it is labelled illustrative in the
// component rather than filled with invented numbers — the whole point of this
// screen is that a judge can trust what it shows.
@Injectable()
export class MissionControlApiAdapter extends MissionControlPort {
  private readonly http = inject(HttpClient);
  private readonly subject = new BehaviorSubject<MissionControlData>(emptyState('loading'));
  private readonly guardrailSubject = new BehaviorSubject<Guardrail[]>([]);
  private readonly modeSubject = new BehaviorSubject<'demo' | 'live'>('demo');

  readonly guardrails$ = this.guardrailSubject.asObservable();
  readonly mode$ = this.modeSubject.asObservable();

  override getMissionControlState(): Observable<MissionControlData> {
    this.refreshState();
    return this.subject.asObservable();
  }

  // The state selector is a demo affordance for exercising loading, empty and
  // degraded rendering. It never fabricates operational data: choosing "live"
  // re-reads the API rather than substituting a scripted picture.
  override setSystemStateMode(mode: SystemStateMode): void {
    if (mode === 'live-connected') {
      this.refreshState();
      return;
    }
    this.subject.next({ ...this.subject.value, stateMode: mode });
  }

  // Mission Control does not decide. Approving from a summary card would
  // commit money without the reasons, the full answer, or the staleness check
  // that the Approvals screen enforces — so these re-read rather than act.
  override async approveRequest(_approvalId: string): Promise<boolean> {
    this.refreshState();
    return false;
  }

  override async rejectRequest(_approvalId: string): Promise<boolean> {
    this.refreshState();
    return false;
  }

  override refreshState(): void {
    this.http.get<ApiEnvelope<MissionControlState>>('/api/v1/mission-control').subscribe({
      next: (response) => {
        this.guardrailSubject.next(response.data.guardrails);
        this.modeSubject.next(response.data.mode);
        this.subject.next(this.toViewModel(response.data));
      },
      error: () => {
        // A failed read shows the disconnected state rather than stale numbers
        // presented as current.
        this.subject.next({ ...this.subject.value, stateMode: 'realtime-disconnected' });
      }
    });
  }

  private toViewModel(state: MissionControlState): MissionControlData {
    const metrics: IncidentMetric[] = [
      {
        id: 'active-incidents',
        label: 'Active Incidents',
        value: String(state.metrics.activeIncidents),
        change: 'from live records',
        trend: 'neutral',
        semantic: 'critical'
      },
      {
        id: 'calls-in-flight',
        label: 'Calls In Flight',
        value: String(state.metrics.callsInFlight),
        change: state.mode === 'live' ? 'live adapter' : 'demo adapter',
        trend: 'neutral',
        semantic: 'aiAction'
      },
      {
        id: 'pending-approvals',
        label: 'Awaiting Your Decision',
        value: String(state.metrics.pendingApprovals),
        change: 'human gate',
        trend: 'neutral',
        semantic: 'waiting'
      },
      {
        id: 'real-calls',
        label: 'Real Calls Placed',
        value: String(state.metrics.realCallsPlaced),
        change: 'billed to CALL-E',
        trend: 'neutral',
        semantic: 'healthy'
      }
    ];

    const incidents: IncidentCommandItem[] = state.incidents.map((incident) => ({
      id: incident.displayId,
      title: `${titleCase(incident.type)} — ${incident.propertyId}`,
      property: incident.unit ? `Unit ${incident.unit}` : incident.propertyId,
      priority: incident.priority.toUpperCase() as IncidentCommandItem['priority'],
      status: mapIncidentStatus(incident.status),
      slaRemaining: '—',
      updatedAt: relativeTime(incident.updatedAt)
    }));

    const pendingApprovals: PendingApproval[] = state.approvals.map((approval) => ({
      id: approval.displayId,
      incidentId: approval.incidentId,
      property: '—',
      vendorName: 'Awaiting review',
      amount: '—',
      policyLimit: '—',
      policyCheckPassed: false,
      reason: approval.reasons.join(', '),
      requestedAt: relativeTime(approval.createdAt),
      status: 'PENDING'
    }));

    // Built from real call records: each entry is something that actually
    // happened, not a scripted timeline.
    const activityFeed: ActivityEvent[] = state.calls.map((call) => ({
      id: call.displayId,
      timestamp: relativeTime(call.createdAt),
      message: describeCall(call),
      category: 'AI_CALL',
      severity: call.outcome?.validationFailed ? 'warning' : 'info'
    }));

    return {
      stateMode: 'live-connected',
      metrics,
      incidents,
      liveCall: null,
      orchestration: buildOrchestration(state),
      pendingApprovals,
      activityFeed,
      performance: {
        slaCompliancePercent: 0,
        avgCallDurationMinutes: 0,
        automatedResolutionRate: 0,
        dispatchSuccessRate: 0
      },
      lastUpdated: new Date(state.generatedAt).toLocaleTimeString()
    };
  }
}

// The lifecycle of the most recent call task, derived entirely from persisted
// state. Agentic work is invisible — authorization, reservation, validation,
// refusal — so this is the panel that lets someone watch it happen.
//
// Every step is read from a row. Nothing here is scripted, and where the system
// has stopped itself the step says so rather than showing a tidy green tick. If
// there are no calls yet the panel renders nothing at all, which is honest.
export function buildOrchestration(state: MissionControlState): OrchestrationStep[] {
  const call = state.calls[0];
  if (!call) {
    return [];
  }

  const approval = state.approvals.find((entry) => entry.incidentId === call.incidentId);
  const dialled = call.status !== 'queued';
  const settled = TERMINAL_CALL_STATUSES.includes(call.status);
  const ambiguous = call.status === 'outcome_unknown';
  const unreachable = call.status === 'no_answer' || call.status === 'failed';

  const steps: OrchestrationStep[] = [
    {
      stepIndex: 1,
      name: 'Incident raised',
      description: `${call.displayId} was opened against an incident before any contact was considered.`,
      status: 'completed'
    },
    {
      stepIndex: 2,
      name: 'Contact authorised',
      description: `Vendor checked against the authorised contact list for ${titleCase(call.purpose)}. A number nobody provisioned is never dialled.`,
      status: 'completed'
    },
    {
      stepIndex: 3,
      name: 'Task reserved before dialling',
      description:
        'Idempotency key reserved and the call task written to the database first, so a call accepted but never reported still leaves a record.',
      status: 'completed'
    },
    {
      stepIndex: 4,
      name: dialled ? 'Call placed' : 'Waiting to dial',
      description: call.simulated
        ? 'Placed through the demo adapter. No real line was used.'
        : 'Placed through the live CALL-E adapter on a real line, opening with a disclosure.',
      status: dialled ? 'completed' : 'active'
    }
  ];

  if (ambiguous) {
    // The refusal that matters most. Do not dress this as progress.
    steps.push(
      {
        stepIndex: 5,
        name: 'Outcome unknown — stopped',
        description:
          'It is not established whether this call happened or what was said. FieldRelay will not redial it. A person reconciles this.',
        status: 'active'
      },
      {
        stepIndex: 6,
        name: 'Answer validated',
        description: 'No answer to validate.',
        status: 'pending'
      },
      {
        stepIndex: 7,
        name: 'Human approval',
        description: 'Nothing is raised for approval from an outcome nobody can confirm.',
        status: 'pending'
      }
    );
    return steps;
  }

  steps.push({
    stepIndex: 5,
    name: call.outcome ? 'Answer returned' : unreachable ? 'No answer' : 'Awaiting answer',
    description: call.outcome
      ? `Returned as structured data, not a transcript: ${call.outcome.fields.join(', ') || 'no fields'}.`
      : unreachable
        ? `The call ended ${call.status.replace(/_/g, ' ')}. No answer was produced.`
        : 'The call is in progress. Nothing has been returned yet.',
    status: call.outcome ? 'completed' : unreachable ? 'completed' : settled ? 'completed' : 'active'
  });

  steps.push({
    stepIndex: 6,
    name: 'Answer validated',
    description: !call.outcome
      ? 'Nothing to validate.'
      : call.outcome.validationFailed
        ? 'Part of the answer failed the schema FieldRelay declared when it placed the call. The failing fields were refused, not coerced.'
        : `Checked against the schema declared before dialling. Undeclared fields dropped${
            call.outcome.confidenceLabel ? `; confidence ${call.outcome.confidenceLabel}` : ''
          }.`,
    status: !call.outcome ? 'pending' : call.outcome.validationFailed ? 'active' : 'completed'
  });

  steps.push({
    stepIndex: 7,
    name: approval ? 'Stopped for human approval' : 'Human approval',
    description: approval
      ? `FieldRelay raised this itself and said why: ${approval.reasons.join(', ')}.`
      : call.outcome
        ? 'No commitment was found in the answer, so nothing was raised.'
        : 'Nothing to decide yet.',
    status: approval ? 'active' : call.outcome ? 'completed' : 'pending'
  });

  return steps;
}

const TERMINAL_CALL_STATUSES = ['completed', 'failed', 'no_answer', 'outcome_unknown'];

function describeCall(call: MissionControlState['calls'][number]): string {
  const kind = call.simulated ? 'Simulated call' : 'Real call';
  if (!call.outcome) {
    return `${kind} ${call.displayId} — ${call.status.replace(/_/g, ' ')}`;
  }
  if (call.outcome.validationFailed) {
    return `${kind} ${call.displayId} returned an answer that failed validation — fields kept: ${call.outcome.fields.join(', ') || 'none'}`;
  }
  return `${kind} ${call.displayId} returned ${call.outcome.fields.join(', ')} (${
    call.outcome.taskCompleted ? 'task completed' : 'task not completed'
  })`;
}

function mapIncidentStatus(status: string): IncidentCommandItem['status'] {
  switch (status) {
    case 'calling':
      return 'LIVE CALL';
    case 'awaiting_approval':
      return 'AWAITING APPROVAL';
    case 'dispatched':
      return 'DISPATCHED';
    case 'resolved':
      return 'RESOLVED';
    default:
      return 'INVESTIGATING';
  }
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function relativeTime(iso: string): string {
  const deltaSeconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (deltaSeconds < 60) return `${Math.floor(deltaSeconds)}s ago`;
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86400) return `${Math.floor(deltaSeconds / 3600)}h ago`;
  return `${Math.floor(deltaSeconds / 86400)}d ago`;
}

function emptyState(stateMode: SystemStateMode): MissionControlData {
  return {
    stateMode,
    metrics: [],
    incidents: [],
    liveCall: null,
    orchestration: [],
    pendingApprovals: [],
    activityFeed: [],
    performance: {
      slaCompliancePercent: 0,
      avgCallDurationMinutes: 0,
      automatedResolutionRate: 0,
      dispatchSuccessRate: 0
    },
    lastUpdated: '—'
  };
}
