import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { VendorListResult } from '../domain/vendor.model';

interface ApiEnvelope<T> {
  data: T;
}

// Read-only by design. Authorization is granted out of band, and an endpoint
// that let an operator grant themselves permission to call somebody would
// defeat the point of having an authorization boundary at all.
@Injectable({ providedIn: 'root' })
export class VendorHttpAdapter {
  private readonly http = inject(HttpClient);

  list(): Observable<VendorListResult> {
    return this.http
      .get<ApiEnvelope<VendorListResult>>('/api/v1/vendors')
      .pipe(map((response) => response.data));
  }
}
