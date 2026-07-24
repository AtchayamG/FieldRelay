import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallTask, CallListResult, ListCallsQuery } from '../domain/call.model';

@Injectable()
export abstract class CallPort {
  abstract list(query?: ListCallsQuery): Observable<CallListResult>;
  abstract getById(id: string): Observable<CallTask>;
}
