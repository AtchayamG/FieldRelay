import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { ApiResponse, CallListDto, CallTaskResponseDto } from '@fieldrelay/contracts';
import { CallPort } from '../application/call.port';
import { CallTask, CallListResult, ListCallsQuery } from '../domain/call.model';

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

  getById(id: string): Observable<CallTask> {
    return this.http
      .get<ApiResponse<CallTaskResponseDto>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => this.mapDtoToEntity(response.data)));
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
