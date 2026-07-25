import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { DialTargetSettings, SetDialTargetParams } from '../domain/dial-target.model';

interface ApiEnvelope<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class SettingsHttpAdapter {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/settings/dial-target';

  read(): Observable<DialTargetSettings> {
    return this.http
      .get<ApiEnvelope<DialTargetSettings>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  set(params: SetDialTargetParams): Observable<DialTargetSettings> {
    return this.http
      .put<ApiEnvelope<DialTargetSettings>>(this.baseUrl, params)
      .pipe(map((response) => response.data));
  }

  clear(): Observable<DialTargetSettings> {
    return this.http
      .delete<ApiEnvelope<DialTargetSettings>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }
}
