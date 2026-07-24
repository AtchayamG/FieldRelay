import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateIncidentParams,
  Incident,
  IncidentListResult,
  ListIncidentsQuery
} from '../domain/incident.model';

@Injectable()
export abstract class IncidentPort {
  abstract list(query?: ListIncidentsQuery): Observable<IncidentListResult>;
  abstract getById(id: string): Observable<Incident>;
  abstract create(params: CreateIncidentParams, idempotencyKey: string): Observable<Incident>;
}
