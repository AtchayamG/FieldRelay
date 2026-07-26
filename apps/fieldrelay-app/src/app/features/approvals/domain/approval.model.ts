export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalOutcome {
  structuredResult: Record<string, unknown>;
  taskCompleted: boolean;
  confidenceScore: number | null;
  confidenceLabel: string | null;
  validationFailed: boolean;
}

export interface Approval {
  id: string;
  displayId: string;
  incidentId: string;
  callTaskId: string;
  status: ApprovalStatus;
  reasons: string[];
  // Written by the API alongside the codes, so the queue explains itself
  // instead of showing an operator something to look up.
  reasonText: string[];
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  // The answer being decided on, so nobody has to open a second screen to see
  // what they are approving.
  outcome: ApprovalOutcome | null;
}

export interface ApprovalListResult {
  items: Approval[];
  nextCursor: string | null;
  pendingCount: number;
}
