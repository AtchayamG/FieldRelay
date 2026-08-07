export type DispatchStatus = 'scheduled' | 'en_route' | 'on_site' | 'completed' | 'cancelled';

export interface Dispatch {
  id: string;
  displayId: string;
  incidentId: string;
  callTaskId: string;
  approvalId: string;
  contactId: string;
  status: DispatchStatus;
  // Carried forward exactly as the vendor said it. Never parsed into a number
  // here or anywhere else — "$35, more if the valve is seized" has no correct
  // numeric reading.
  quotedAmountText: string | null;
  scheduledFor: string | null;
  dispatchedBy: string;
  dispatchedAt: string;
  cancelledReason: string | null;
}

export interface DispatchListResult {
  items: Dispatch[];
  nextCursor: string | null;
  activeCount: number;
}

// The board reads left to right in the order work actually happens. Terminal
// states sit at the end and cannot be dragged back.
export const DISPATCH_COLUMNS: ReadonlyArray<{
  status: DispatchStatus;
  label: string;
  hint: string;
}> = [
  { status: 'scheduled', label: 'Scheduled', hint: 'Released and expected' },
  { status: 'en_route', label: 'En route', hint: 'Vendor is travelling' },
  { status: 'on_site', label: 'On site', hint: 'Work in progress' },
  { status: 'completed', label: 'Completed', hint: 'Finished' }
];

// What an operator is allowed to do next, mirroring the domain entity. The
// server is the authority; this only decides which buttons to render, so a
// stale board offers an action the API then refuses rather than silently
// performing the wrong one.
export const NEXT_STATUS: Record<DispatchStatus, DispatchStatus[]> = {
  scheduled: ['en_route', 'cancelled'],
  en_route: ['on_site', 'cancelled'],
  on_site: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

export const STATUS_LABEL: Record<DispatchStatus, string> = {
  scheduled: 'Scheduled',
  en_route: 'En route',
  on_site: 'On site',
  completed: 'Completed',
  cancelled: 'Cancelled'
};
