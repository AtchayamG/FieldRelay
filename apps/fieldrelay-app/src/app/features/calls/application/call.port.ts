import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { ReconcileCallResponseDto } from '@fieldrelay/contracts';
import {
  CallLaunchContext,
  CallTaskDetail,
  CallListResult,
  ListCallsQuery,
  StartCallCommand,
  StartedCall
} from '../domain/call.model';

@Injectable()
export abstract class CallPort {
  abstract list(query?: ListCallsQuery): Observable<CallListResult>;
  // Detail carries the validated outcome; the list does not, because a queue
  // row has no room for it and most rows have no answer yet.
  abstract getById(id: string): Observable<CallTaskDetail>;
  // Reads an existing live provider task and repairs a missed terminal webhook.
  // It cannot create, retry, or redial a call.
  abstract reconcile(id: string): Observable<ReconcileCallResponseDto>;
  abstract launchContext(): Observable<CallLaunchContext>;
  abstract start(command: StartCallCommand, idempotencyKey: string): Observable<StartedCall>;
}
