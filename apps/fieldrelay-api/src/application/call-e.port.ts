import { CallTask, CallStatus } from '../domain/call-task.entity';

export const CALL_E_PORT = Symbol('CALL_E_PORT');

export interface CallEResult {
  providerTaskId: string;
  status: Exclude<CallStatus, 'draft'>;
  // true only for the demo adapter; a live adapter must return false.
  simulated: boolean;
}

export interface CallEPort {
  startCall(task: CallTask): Promise<CallEResult>;
}
