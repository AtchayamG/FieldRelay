import { Approval, ApprovalStatus } from '../domain/approval.entity';

export interface ApprovalPage {
  items: Approval[];
  nextCursor: string | null;
}

export interface ListApprovalsQuery {
  limit: number;
  cursor?: string;
  status?: ApprovalStatus;
  incidentId?: string;
}

export interface ApprovalRepositoryPort {
  nextDisplayId(): Promise<string>;
  insert(approval: Approval): Promise<void>;
  update(approval: Approval): Promise<void>;
  findById(id: string): Promise<Approval | null>;
  // Used to enforce one approval per call task without relying on the caller to
  // remember, and to make raising an approval idempotent under webhook replay.
  findByCallTaskId(callTaskId: string): Promise<Approval | null>;
  list(query: ListApprovalsQuery): Promise<ApprovalPage>;
  countPending(): Promise<number>;
}
