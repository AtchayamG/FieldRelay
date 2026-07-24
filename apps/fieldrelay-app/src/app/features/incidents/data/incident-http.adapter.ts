import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type {
  ApiResponse,
  CreateIncidentRequestDto,
  IncidentListDto,
  IncidentResponseDto
} from '@fieldrelay/contracts';
import { IncidentPort } from '../application/incident.port';
import {
  CreateIncidentParams,
  Incident,
  IncidentListResult,
  ListIncidentsQuery
} from '../domain/incident.model';

@Injectable()
export class IncidentHttpAdapter implements IncidentPort {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/incidents';

  list(query?: ListIncidentsQuery): Observable<IncidentListResult> {
    let params = new HttpParams();
    if (query?.status) {
      params = params.set('status', query.status);
    }
    if (query?.cursor) {
      params = params.set('cursor', query.cursor);
    }
    if (query?.limit) {
      params = params.set('limit', query.limit.toString());
    }

    return this.http
      .get<ApiResponse<IncidentListDto>>(this.baseUrl, { params })
      .pipe(
        map((response) => ({
          items: response.data.items.map(this.mapDtoToEntity),
          nextCursor: response.data.nextCursor
        }))
      );
  }

  getById(id: string): Observable<Incident> {
    return this.http
      .get<ApiResponse<IncidentResponseDto>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => this.mapDtoToEntity(response.data)));
  }

  create(params: CreateIncidentParams, idempotencyKey: string): Observable<Incident> {
    const dto: CreateIncidentRequestDto = {
      propertyId: params.propertyId,
      unit: params.unit || undefined,
      type: params.type,
      priority: params.priority,
      description: params.description,
      reportedBy: params.reportedBy
    };

    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey
    });

    return this.http
      .post<ApiResponse<IncidentResponseDto>>(this.baseUrl, dto, { headers })
      .pipe(map((response) => this.mapDtoToEntity(response.data)));
  }

  private mapDtoToEntity(dto: IncidentResponseDto): Incident {
    return {
      id: dto.id,
      displayId: dto.displayId,
      propertyId: dto.propertyId,
      unit: dto.unit ?? null,
      type: dto.type,
      priority: dto.priority,
      status: dto.status,
      description: dto.description,
      reportedBy: dto.reportedBy,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      version: dto.version
    };
  }
}
