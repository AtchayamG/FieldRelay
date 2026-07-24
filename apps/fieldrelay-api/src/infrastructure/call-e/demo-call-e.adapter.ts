import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CallEPort, CallEResult } from '../../application/call-e.port';
import { CallTask } from '../../domain/call-task.entity';

// Explicit demo adapter. It never places a real call and always labels its
// result simulated: true so no caller can mistake it for a live outcome.
@Injectable()
export class DemoCallEAdapter implements CallEPort {
  async startCall(task: CallTask): Promise<CallEResult> {
    return {
      providerTaskId: `demo_${task.id}_${randomUUID()}`,
      status: 'queued',
      simulated: true
    };
  }
}
