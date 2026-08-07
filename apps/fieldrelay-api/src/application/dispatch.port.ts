import { Dispatch, DispatchStatus } from '../domain/dispatch.entity';

export interface DispatchPage {
  items: Dispatch[];
  nextCursor: string | null;
}

export interface ListDispatchesQuery {
  limit: number;
  cursor?: string;
  status?: DispatchStatus;
  incidentId?: string;
}

export interface DispatchRepositoryPort {
  nextDisplayId(): Promise<string>;
  insert(dispatch: Dispatch): Promise<void>;
  update(dispatch: Dispatch): Promise<void>;
  findById(id: string): Promise<Dispatch | null>;
  // One approval authorises exactly one dispatch. Looking it up by approval is
  // how a repeated release becomes a no-op instead of a second vendor being
  // sent to the same job — the database carries a unique constraint as well,
  // because a check in application code is a race, not a guarantee.
  findByApprovalId(approvalId: string): Promise<Dispatch | null>;
  list(query: ListDispatchesQuery): Promise<DispatchPage>;
  countActive(): Promise<number>;
}
