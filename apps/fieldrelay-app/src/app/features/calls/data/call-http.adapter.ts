import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import type {
  ApiResponse,
  CallListDto,
  CallStatusResponseDto,
  ReconcileCallResponseDto,
  CallTaskDetailDto,
  CallTaskResponseDto
} from '@fieldrelay/contracts';
import { CallPort } from '../application/call.port';
import {
  CallLaunchContext,
  CallTask,
  CallTaskDetail,
  CallListResult,
  ListCallsQuery,
  StartCallCommand,
  StartedCall
} from '../domain/call.model';

interface CallUsageDto {
  mode: 'demo' | 'live';
}

interface DialTargetDto {
  configured: boolean;
  contactId: string | null;
  maskedPhone: string | null;
}

@Injectable()
export class CallHttpAdapter implements CallPort {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/calls';

  list(query?: ListCallsQuery): Observable<CallListResult> {
    let params = new HttpParams();
    if (query?.status) {
      params = params.set('status', query.status);
    }
    if (query?.incidentId) {
      params = params.set('incidentId', query.incidentId);
    }
    if (query?.cursor) {
      params = params.set('cursor', query.cursor);
    }
    if (query?.limit) {
      params = params.set('limit', query.limit.toString());
    }

    return this.http
      .get<ApiResponse<CallListDto>>(this.baseUrl, { params })
      .pipe(
        map((response) => ({
          items: response.data.items.map(this.mapDtoToEntity),
          nextCursor: response.data.nextCursor
        }))
      );
  }

  getById(id: string): Observable<CallTaskDetail> {
    return this.http
      .get<ApiResponse<CallTaskDetailDto>>(`${this.baseUrl}/${id}`)
      .pipe(
        map((response) => ({
          ...this.mapDtoToEntity(response.data),
          outcome: response.data.outcome
            ? {
                structuredResult: response.data.outcome.structuredResult ?? {},
                taskCompleted: response.data.outcome.taskCompleted,
                confidenceScore: response.data.outcome.confidenceScore,
                confidenceLabel: response.data.outcome.confidenceLabel,
                validationFailed: response.data.outcome.validationFailed,
                receivedAt: response.data.outcome.receivedAt
              }
            : null
        }))
      );
  }

  reconcile(id: string): Observable<ReconcileCallResponseDto> {
    return this.http
      .post<ApiResponse<ReconcileCallResponseDto>>(`${this.baseUrl}/${id}/reconcile`, {})
      .pipe(map((response) => response.data));
  }

  launchContext(): Observable<CallLaunchContext> {
    return forkJoin({
      usage: this.http.get<ApiResponse<CallUsageDto>>('/api/v1/call-usage'),
      target: this.http.get<ApiResponse<DialTargetDto>>('/api/v1/settings/dial-target')
    }).pipe(
      map(({ usage, target }) => ({
        mode: usage.data.mode,
        configured: target.data.configured,
        contactId: target.data.contactId,
        maskedPhone: target.data.maskedPhone
      }))
    );
  }

  start(command: StartCallCommand, idempotencyKey: string): Observable<StartedCall> {
    return this.http
      .post<ApiResponse<CallStatusResponseDto>>(this.baseUrl, command, {
        headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
      })
      .pipe(map((response) => response.data));
  }

  private mapDtoToEntity(dto: CallTaskResponseDto): CallTask {
    return {
      id: dto.id,
      displayId: dto.displayId,
      incidentId: dto.incidentId,
      providerTaskId: dto.providerTaskId ?? null,
      purpose: dto.purpose,
      authorizedContactId: dto.authorizedContactId,
      status: dto.status,
      simulated: dto.simulated,
      timeoutSeconds: dto.timeoutSeconds,
      retries: dto.retries,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      version: dto.version
    };
  }
}
