import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Approval, ApprovalListResult, ApprovalStatus } from '../domain/approval.model';

interface ApiEnvelope<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ApprovalHttpAdapter {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/approvals';

  list(status?: ApprovalStatus): Observable<ApprovalListResult> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<ApiEnvelope<ApprovalListResult>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  decide(id: string, decision: 'approved' | 'rejected', note?: string): Observable<Approval> {
    return this.http
      .post<ApiEnvelope<Approval>>(`${this.baseUrl}/${id}/decision`, {
        decision,
        ...(note ? { note } : {})
      })
      .pipe(map((response) => response.data));
  }
}
