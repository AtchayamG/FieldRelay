import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  CallBrief,
  CallEDescriptor,
  CallEPort,
  CallEResult
} from '../../application/call-e.port';
import { CallTask } from '../../domain/call-task.entity';

// Explicit demo adapter. It never places a real call and always labels its
// result simulated: true so no caller can mistake it for a live outcome. It
// takes the same brief as the live adapter so the two stay contract-identical
// and the brief is built on every path, including the default one.
@Injectable()
export class DemoCallEAdapter implements CallEPort {
  public describe(): CallEDescriptor {
    return { mode: 'demo', simulated: true };
  }

  async startCall(task: CallTask, _brief: CallBrief): Promise<CallEResult> {
    return {
      providerTaskId: `demo_${task.id}_${randomUUID()}`,
      status: 'queued',
      simulated: true
    };
  }
}
