import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MissionControlPort } from '../application/mission-control.port';
import {
  MissionControlData,
  SystemStateMode,
  PendingApproval,
  IncidentMetric,
  IncidentCommandItem,
  LiveCallMission,
  OrchestrationStep,
  ActivityEvent,
  PerformanceMetrics
} from '../domain/mission-control.types';

@Injectable({
  providedIn: 'root'
})
export class MissionControlDemoAdapter implements MissionControlPort {
  private currentMode: SystemStateMode = 'live-connected';
  private stateSubject = new BehaviorSubject<MissionControlData>(this.buildMockData('live-connected'));

  getMissionControlState(): Observable<MissionControlData> {
    return this.stateSubject.asObservable();
  }

  setSystemStateMode(mode: SystemStateMode): void {
    this.currentMode = mode;
    this.stateSubject.next(this.buildMockData(mode));
  }

  refreshState(): void {
    this.stateSubject.next(this.buildMockData(this.currentMode));
  }

  async approveRequest(approvalId: string): Promise<boolean> {
    const current = this.stateSubject.value;
    const updatedApprovals = current.pendingApprovals.map((app) =>
      app.id === approvalId ? { ...app, status: 'APPROVED' as const } : app
    );
    const pendingCount = updatedApprovals.filter((app) => app.status === 'PENDING').length;

    const newActivity: ActivityEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: `Human Ops Manager approved vendor expense for ${approvalId}`,
      category: 'APPROVAL',
      severity: 'info'
    };

    this.stateSubject.next({
      ...current,
      metrics: current.metrics.map((metric) =>
        metric.id === 'm3'
          ? { ...metric, value: String(pendingCount), change: pendingCount === 0 ? 'Queue clear' : 'Human review required' }
          : metric
      ),
      pendingApprovals: updatedApprovals,
      activityFeed: [newActivity, ...current.activityFeed],
      lastUpdated: new Date().toLocaleTimeString()
    });

    return true;
  }

  async rejectRequest(approvalId: string): Promise<boolean> {
    const current = this.stateSubject.value;
    const updatedApprovals = current.pendingApprovals.map((app) =>
      app.id === approvalId ? { ...app, status: 'REJECTED' as const } : app
    );
    const pendingCount = updatedApprovals.filter((app) => app.status === 'PENDING').length;

    const newActivity: ActivityEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: `Human Ops Manager rejected vendor expense for ${approvalId}`,
      category: 'APPROVAL',
      severity: 'warning'
    };

    this.stateSubject.next({
      ...current,
      metrics: current.metrics.map((metric) =>
        metric.id === 'm3'
          ? { ...metric, value: String(pendingCount), change: pendingCount === 0 ? 'Queue clear' : 'Human review required' }
          : metric
      ),
      pendingApprovals: updatedApprovals,
      activityFeed: [newActivity, ...current.activityFeed],
      lastUpdated: new Date().toLocaleTimeString()
    });

    return true;
  }

  private buildMockData(mode: SystemStateMode): MissionControlData {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (mode === 'loading') {
      return {
        stateMode: 'loading',
        metrics: [],
        incidents: [],
        liveCall: null,
        orchestration: [],
        pendingApprovals: [],
        activityFeed: [],
        performance: { slaCompliancePercent: 0, avgCallDurationMinutes: 0, automatedResolutionRate: 0, dispatchSuccessRate: 0 },
        lastUpdated: now
      };
    }

    if (mode === 'empty') {
      return {
        stateMode: 'empty',
        metrics: [
          { id: 'm1', label: 'Active Incidents', value: '0', change: '0%', trend: 'neutral', semantic: 'healthy' },
          { id: 'm2', label: 'Live Calls', value: '0', change: '0', trend: 'neutral', semantic: 'healthy' },
          { id: 'm3', label: 'Pending Approvals', value: '0', change: '0', trend: 'neutral', semantic: 'healthy' },
          { id: 'm4', label: 'SLA Risk Rate', value: '0.0%', change: '-100%', trend: 'down', semantic: 'healthy' }
        ],
        incidents: [],
        liveCall: null,
        orchestration: [],
        pendingApprovals: [],
        activityFeed: [
          { id: 'ev-empty', timestamp: now, message: 'All operational queues are clear. System ready.', category: 'INCIDENT', severity: 'info' }
        ],
        performance: { slaCompliancePercent: 100, avgCallDurationMinutes: 2.1, automatedResolutionRate: 94, dispatchSuccessRate: 100 },
        lastUpdated: now
      };
    }

    const metrics: IncidentMetric[] = [
      { id: 'm1', label: 'Active Incidents', value: '14', change: '+2 from last hr', trend: 'up', semantic: 'critical' },
      { id: 'm2', label: 'Live CALL-E Missions', value: '3', change: 'SIMULATED ACTIVE', trend: 'neutral', semantic: 'aiAction' },
      { id: 'm3', label: 'Pending Approvals', value: '2', change: '$730 total value', trend: 'up', semantic: 'waiting' },
      { id: 'm4', label: 'SLA Risk Rate', value: '96.8%', change: '+1.4% vs target', trend: 'up', semantic: 'healthy' }
    ];

    const incidents: IncidentCommandItem[] = [
      {
        id: 'INC-2026-9041',
        title: 'Emergency Main Pipe Burst & Flooding',
        property: 'Oakridge Luxury Towers — Unit 4B',
        priority: 'CRITICAL',
        status: 'LIVE CALL',
        slaRemaining: '14m remaining',
        updatedAt: '12s ago'
      },
      {
        id: 'INC-2026-9038',
        title: 'Commercial HVAC Failure — Server Bay',
        property: 'TechPark Building C — Floor 2',
        priority: 'HIGH',
        status: 'AWAITING APPROVAL',
        slaRemaining: '28m remaining',
        updatedAt: '2m ago'
      },
      {
        id: 'INC-2026-9035',
        title: 'Main Access Gate Controller Lockout',
        property: 'Highland Logistics Center',
        priority: 'MEDIUM',
        status: 'DISPATCHED',
        slaRemaining: '1h 15m remaining',
        updatedAt: '8m ago'
      },
      {
        id: 'INC-2026-9029',
        title: 'Elevator Shaft Sensor Anomaly',
        property: 'Metropolitan Heights',
        priority: 'LOW',
        status: 'INVESTIGATING',
        slaRemaining: '3h 40m remaining',
        updatedAt: '15m ago'
      }
    ];

    const liveCall: LiveCallMission = {
      callId: 'CALL-2026-SIM-8821',
      incidentId: 'INC-2026-9041',
      vendorName: 'Rapid Response Plumbing Co.',
      status: 'SIMULATED IN PROGRESS',
      isSimulated: true,
      duration: '01:42',
      aiConfidence: 0.96,
      structuredOutcome: {
        summary: 'CALL-E verified emergency plumber availability for immediate dispatch. Vendor agreed to 45 min ETA at standard emergency rate ($180/hr).',
        estimatedCost: '$360.00',
        estimatedArrival: '45 mins (14:15 EST)',
        requiresApproval: false
      },
      transcript: [
        { speaker: 'CALL-E (AI)', text: 'Hello, this is FieldRelay Ops calling on behalf of Apex Management regarding urgent water pipe leak at Oakridge Towers.', timestamp: '14:00:02' },
        { speaker: 'Vendor Dispatch', text: 'Yes, we have an emergency crew available in the West District. What is the scope?', timestamp: '14:00:15' },
        { speaker: 'CALL-E (AI)', text: 'Main riser leakage affecting Unit 4B. Water isolation requested. Can you commit to dispatch under 60 minutes?', timestamp: '14:00:28' },
        { speaker: 'Vendor Dispatch', text: 'Confirmed. We can have Technician Dave on site in 45 minutes. Rate is $180 per hour.', timestamp: '14:00:45' },
        { speaker: 'CALL-E (AI)', text: 'Rate verified against pre-negotiated master service agreement. Dispatch authorized under Emergency Token #FR-8821.', timestamp: '14:01:05' }
      ]
    };

    const orchestration: OrchestrationStep[] = [
      { stepIndex: 1, name: 'Incident Created', description: 'Sensor alert & tenant intake verified', status: 'completed', timestamp: '13:55' },
      { stepIndex: 2, name: 'CALL-E Active', description: 'Simulated AI voice negotiation with vendor', status: 'active', timestamp: '14:00' },
      { stepIndex: 3, name: 'Outcome Analyzed', description: 'Structured quote & ETA extracted', status: 'active', timestamp: '14:01' },
      { stepIndex: 4, name: 'Approval Check', description: 'Auto-approved within $500 threshold policy', status: 'completed', timestamp: '14:01' },
      { stepIndex: 5, name: 'Dispatch Issued', description: 'Technician route & access code transmitted', status: 'pending' },
      { stepIndex: 6, name: 'Resolution Verified', description: 'Tenant digital signoff & audit logged', status: 'pending' }
    ];

    const pendingApprovals: PendingApproval[] = [
      {
        id: 'APP-2026-4012',
        incidentId: 'INC-2026-9038',
        property: 'TechPark Building C',
        vendorName: 'CoolTech Industrial Systems',
        amount: '$730.00',
        policyLimit: '$500.00',
        policyCheckPassed: false,
        reason: 'Emergency HVAC compressor replacement exceeds automatic threshold ($500.00). Requires Ops Manager signoff.',
        requestedAt: '13:58:20',
        status: 'PENDING'
      },
      {
        id: 'APP-2026-4015',
        incidentId: 'INC-2026-9022',
        property: 'Sunset West Apartments',
        vendorName: 'ProShield Security Electronics',
        amount: '$420.00',
        policyLimit: '$500.00',
        policyCheckPassed: true,
        reason: 'Access control board swap within threshold. Flagged for review due to repeat ticket count.',
        requestedAt: '13:45:10',
        status: 'PENDING'
      }
    ];

    const activityFeed: ActivityEvent[] = [
      { id: 'ev-1', timestamp: '14:01:05', message: 'CALL-E (SIMULATED) completed quote extraction for INC-2026-9041', category: 'AI_CALL', severity: 'info' },
      { id: 'ev-2', timestamp: '13:58:20', message: 'Approval APP-2026-4012 escalated to queue (Exceeds $500 limit)', category: 'APPROVAL', severity: 'warning' },
      { id: 'ev-3', timestamp: '13:52:10', message: 'Technician Dave M. accepted dispatch for INC-2026-9035', category: 'DISPATCH', severity: 'info' },
      { id: 'ev-4', timestamp: '13:40:00', message: 'SLA Warning: INC-2026-9038 entering 30-minute resolution window', category: 'INCIDENT', severity: 'critical' }
    ];

    const performance: PerformanceMetrics = {
      slaCompliancePercent: 96.8,
      avgCallDurationMinutes: 1.8,
      automatedResolutionRate: 88.5,
      dispatchSuccessRate: 99.1
    };

    return {
      stateMode: mode,
      metrics,
      incidents,
      liveCall: mode === 'degraded' ? { ...liveCall, status: 'QUEUED', structuredOutcome: { ...liveCall.structuredOutcome, summary: 'DEGRADED: Voice gateway fallback enabled. Call queued for human dispatch.' } } : liveCall,
      orchestration,
      pendingApprovals,
      activityFeed: mode === 'realtime-disconnected' ? [{ id: 'ev-disc', timestamp: now, message: 'Realtime gateway disconnected. Displaying cached operational snapshot.', category: 'INCIDENT', severity: 'critical' }, ...activityFeed] : activityFeed,
      performance,
      lastUpdated: now
    };
  }
}
