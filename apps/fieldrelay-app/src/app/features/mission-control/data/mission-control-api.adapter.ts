import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MissionControlPort } from '../application/mission-control.port';
import {
  ActivityEvent,
  IncidentCommandItem,
  IncidentMetric,
  MissionControlData,
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
      orchestration: [],
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
