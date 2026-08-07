import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

interface ApiEnvelope<T> {
  data: T;
}

export interface CountBucket {
  key: string;
  count: number;
}

export interface Analytics {
  incidentsByStatus: CountBucket[];
  incidentsByPriority: CountBucket[];
  callsByStatus: CountBucket[];
  callsByKind: CountBucket[];
  outcomes: {
    total: number;
    validated: number;
    validationFailed: number;
    taskCompleted: number;
  };
  approvalsByStatus: CountBucket[];
  approvalsByReason: CountBucket[];
  dispatchesByStatus: CountBucket[];
  notYetMeasurable: Array<{ metric: string; needs: string }>;
  scannedRows: number;
  truncated: boolean;
  generatedAt: string;
}

export interface Technician {
  name: string;
  incidentsRaised: number;
  openIncidents: number;
  lastActiveAt: string | null;
  statusBreakdown: CountBucket[];
}

export interface TechnicianList {
  items: Technician[];
  derivedFromIncidents: number;
  truncated: boolean;
}

@Injectable({ providedIn: 'root' })
export class InsightsHttpAdapter {
  private readonly http = inject(HttpClient);

  analytics(): Observable<Analytics> {
    return this.http
      .get<ApiEnvelope<Analytics>>('/api/v1/analytics')
      .pipe(map((response) => response.data));
  }

  technicians(): Observable<TechnicianList> {
    return this.http
      .get<ApiEnvelope<TechnicianList>>('/api/v1/technicians')
      .pipe(map((response) => response.data));
  }
}
