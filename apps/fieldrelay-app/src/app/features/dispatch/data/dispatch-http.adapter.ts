import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Dispatch, DispatchListResult, DispatchStatus } from '../domain/dispatch.model';

interface ApiEnvelope<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class DispatchHttpAdapter {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/dispatches';

  list(status?: DispatchStatus): Observable<DispatchListResult> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<ApiEnvelope<DispatchListResult>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  // Only an approval id is sent. The vendor, incident and quoted amount are
  // read from rows on the server, so nothing here can redirect a dispatch to a
  // vendor who was never called.
  release(approvalId: string, scheduledFor?: string): Observable<Dispatch> {
    return this.http
      .post<ApiEnvelope<Dispatch>>(this.baseUrl, {
        approvalId,
        ...(scheduledFor ? { scheduledFor } : {})
      })
      .pipe(map((response) => response.data));
  }

  advance(id: string, status: DispatchStatus, reason?: string): Observable<Dispatch> {
    return this.http
      .post<ApiEnvelope<Dispatch>>(`${this.baseUrl}/${id}/status`, {
        status,
        ...(reason ? { reason } : {})
      })
      .pipe(map((response) => response.data));
  }
}
