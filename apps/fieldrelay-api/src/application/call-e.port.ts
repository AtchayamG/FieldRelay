import { CallTask, ProviderCallStatus } from '../domain/call-task.entity';

export const CALL_E_PORT = Symbol('CALL_E_PORT');
export const CALL_E_READ_PORT = Symbol('CALL_E_READ_PORT');

export interface CallEResult {
  providerTaskId: string;
  status: ProviderCallStatus;
  // true only for the demo adapter; a live adapter must return false.
  simulated: boolean;
}

export interface CallEReadResult {
  providerTaskId: string;
  status: ProviderCallStatus;
  outcome?: {
    structuredResult: unknown;
    taskCompleted: boolean;
    confidence: unknown;
  };
}

// What the provider is told to achieve on the call, and the shape its answer
// must come back in. Built by the application layer from the call purpose so
// infrastructure never invents operational intent (blueprint doc 06, section 2).
export interface CallBrief {
  goal: string;
  disclosure: string;
  resultSchema: Record<string, unknown>;
}

// Lets callers know, before any provider I/O, whether this adapter can produce
// a real-world side effect. StartCallUseCase records it on the call task so a
// simulated task is never presented as a live one, or the reverse.
export interface CallEDescriptor {
  mode: 'demo' | 'live';
  simulated: boolean;
}

export interface CallEPort {
  describe(): CallEDescriptor;
  startCall(task: CallTask, brief: CallBrief): Promise<CallEResult>;
}

// Read-only provider lookup for reconciling an existing task when a webhook
// was delayed or lost. This port cannot create or retry a call.
export interface CallEReadPort {
  getCall(providerTaskId: string): Promise<CallEReadResult>;
}
