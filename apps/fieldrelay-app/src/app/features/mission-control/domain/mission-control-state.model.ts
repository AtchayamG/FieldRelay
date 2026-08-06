// A refusal the system enforces, reported as live state rather than as
// marketing copy. `engaged` false means the guardrail is currently relaxed and
// the UI must say so — a safety claim that cannot be false is not a claim.
export interface Guardrail {
  id: string;
  label: string;
  detail: string;
  engaged: boolean;
}

export interface MissionControlState {
  metrics: {
    activeIncidents: number;
    callsInFlight: number;
    pendingApprovals: number;
    realCallsPlaced: number;
  };
  incidents: Array<{
    id: string;
    displayId: string;
    propertyId: string;
    unit: string | null;
    type: string;
    priority: string;
    status: string;
    updatedAt: string;
  }>;
  calls: Array<{
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
  }>;
  approvals: Array<{
    id: string;
    displayId: string;
    incidentId: string;
    reasons: string[];
    createdAt: string;
  }>;
  guardrails: Guardrail[];
  mode: 'demo' | 'live';
  generatedAt: string;
}
