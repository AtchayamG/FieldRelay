export type OperationalPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'LIVE CALL' | 'AWAITING APPROVAL' | 'DISPATCHED' | 'INVESTIGATING' | 'RESOLVED';
export type CallStatus = 'SIMULATED IN PROGRESS' | 'QUEUED' | 'COMPLETED' | 'FAILED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SystemStateMode = 'live-connected' | 'realtime-disconnected' | 'empty' | 'loading' | 'degraded';

export interface IncidentMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  semantic: 'critical' | 'aiAction' | 'waiting' | 'healthy';
}

export interface IncidentCommandItem {
  id: string;
  title: string;
  property: string;
  priority: OperationalPriority;
  status: IncidentStatus;
  slaRemaining: string;
  updatedAt: string;
}

export interface CallTranscriptLine {
  speaker: 'CALL-E (AI)' | 'Vendor Dispatch' | 'System';
  text: string;
  timestamp: string;
}

export interface LiveCallMission {
  callId: string;
  incidentId: string;
  vendorName: string;
  status: CallStatus;
  isSimulated: boolean;
  duration: string;
  aiConfidence: number;
  structuredOutcome: {
    summary: string;
    estimatedCost: string;
    estimatedArrival: string;
    requiresApproval: boolean;
  };
  transcript: CallTranscriptLine[];
}

export interface OrchestrationStep {
  stepIndex: number;
  name: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
  timestamp?: string;
}

export interface PendingApproval {
  id: string;
  incidentId: string;
  property: string;
  vendorName: string;
  amount: string;
  policyLimit: string;
  policyCheckPassed: boolean;
  reason: string;
  requestedAt: string;
  status: ApprovalStatus;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  message: string;
  category: 'AI_CALL' | 'APPROVAL' | 'DISPATCH' | 'INCIDENT';
  severity: 'info' | 'warning' | 'critical';
}

export interface PerformanceMetrics {
  slaCompliancePercent: number;
  avgCallDurationMinutes: number;
  automatedResolutionRate: number;
  dispatchSuccessRate: number;
}

export interface MissionControlData {
  stateMode: SystemStateMode;
  metrics: IncidentMetric[];
  incidents: IncidentCommandItem[];
  liveCall: LiveCallMission | null;
  orchestration: OrchestrationStep[];
  pendingApprovals: PendingApproval[];
  activityFeed: ActivityEvent[];
  performance: PerformanceMetrics;
  lastUpdated: string;
}
