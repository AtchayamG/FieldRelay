import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

export interface CallUsage {
  placedByThisDeployment: number;
  placedElsewhere: number;
  totalLiveCallsPlaced: number;
  mode: 'demo' | 'live';
}

interface ApiEnvelope<T> {
  data: T;
}

// Reports how many real calls have been placed. There is deliberately no
// "remaining" figure: CALL-E exposes no balance endpoint, its published free
// allowance differs between its own sources, and the allowance can be topped
// up — so any remaining count would be a guess presented to a judge as a fact.
@Injectable({ providedIn: 'root' })
export class CallUsageService {
  private readonly http = inject(HttpClient);
  readonly usage = signal<CallUsage | null>(null);

  refresh(): void {
    this.http.get<ApiEnvelope<CallUsage>>('/api/v1/call-usage').subscribe({
      next: (response) => this.usage.set(response.data),
      // A failed usage lookup must never take the shell down with it; the
      // indicator simply stays hidden.
      error: () => this.usage.set(null)
    });
  }
}
