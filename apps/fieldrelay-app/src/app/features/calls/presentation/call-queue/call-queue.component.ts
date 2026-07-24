import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CallPort } from '../../application/call.port';
import { CallHttpAdapter } from '../../data/call-http.adapter';
import { CallTask, CallStatus } from '../../domain/call.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { callApiErrorMessage, callApiStatus } from '../../application/call-api-error';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Component({
  selector: 'app-call-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatusBadgeComponent],
  providers: [
    { provide: CallPort, useClass: CallHttpAdapter }
  ],
  template: `
    <div class="calls-page">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-main">
          <div class="header-titles">
            <h1 class="page-title">Call Queue & AI Operations</h1>
            <p class="page-subtitle">
              API-backed CALL-E task queue • Track status, purpose, and simulation state
            </p>
          </div>
        </div>
      </header>

      <!-- Filter Controls Strip -->
      <section class="filter-strip" aria-label="Filter Calls">
        <div class="filter-controls">
          <div class="filter-group">
            <label for="status-filter" class="filter-label">Status Filter</label>
            <select
              id="status-filter"
              class="filter-select font-mono"
              [ngModel]="selectedStatus"
              (ngModelChange)="onStatusChange($event)"
            >
              <option value="all">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="ringing">Ringing</option>
              <option value="connected">Connected</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="no_answer">No Answer</option>
              <option value="outcome_unknown">Outcome Unknown</option>
            </select>
          </div>

          <div class="filter-group flex-grow">
            <label for="incident-filter" class="filter-label">Incident ID (UUID)</label>
            <div class="input-with-clear">
              <input
                id="incident-filter"
                type="text"
                class="filter-input font-mono"
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                [ngModel]="incidentIdInput"
                (ngModelChange)="onIncidentIdInput($event)"
              />
              <button
                *ngIf="incidentIdInput"
                type="button"
                class="clear-input-btn"
                aria-label="Clear incident filter"
                (click)="clearIncidentFilter()"
              >
                ✕
              </button>
            </div>
          </div>

          <button
            *ngIf="selectedStatus !== 'all' || incidentIdInput"
            type="button"
            class="action-btn secondary-btn"
            (click)="resetFilters()"
          >
            Reset Filters
          </button>
        </div>

        <!-- Validation Error Message -->
        <div *ngIf="validationError" class="validation-banner" role="alert">
          <span class="alert-icon">⚠️</span>
          <span>{{ validationError }}</span>
        </div>

        <!-- Active Filter Summary -->
        <div *ngIf="!validationError && (selectedStatus !== 'all' || activeIncidentId)" class="active-filter-summary">
          <span class="summary-label">Active Filters:</span>
          <span *ngIf="selectedStatus !== 'all'" class="filter-chip font-mono">
            status: {{ selectedStatus }}
          </span>
          <span *ngIf="activeIncidentId" class="filter-chip font-mono">
            incident: {{ activeIncidentId }}
          </span>
        </div>
      </section>

      <!-- Main Content Area -->
      <main class="calls-content">
        <!-- Initial Loading State -->
        <div *ngIf="loading && calls.length === 0" class="state-card loading-card">
          <div class="spinner"></div>
          <p>Fetching call queue from server...</p>
        </div>

        <!-- Permission 403 Error State -->
        <div *ngIf="isPermissionDenied" class="state-card error-card" role="alert">
          <div class="error-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>You do not have permission to view call tasks.</p>
          <button type="button" class="action-btn primary-btn" (click)="loadCalls()">
            Retry Request
          </button>
        </div>

        <!-- Generic / Network Error State -->
        <div *ngIf="errorMessage && !isPermissionDenied && calls.length === 0" class="state-card error-card" role="alert">
          <div class="error-icon">⚠️</div>
          <h2>Unable to Load Call Queue</h2>
          <p>{{ errorMessage }}</p>
          <button type="button" class="action-btn primary-btn" (click)="loadCalls()">
            Retry
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && !errorMessage && !validationError && calls.length === 0" class="state-card empty-card">
          <div class="empty-icon">📞</div>
          <h2>No Call Tasks Found</h2>
          <p *ngIf="selectedStatus !== 'all' || activeIncidentId">
            No calls match the selected filters. Try broadening your criteria.
          </p>
          <p *ngIf="selectedStatus === 'all' && !activeIncidentId">
            The call queue is currently empty.
          </p>
          <button *ngIf="selectedStatus !== 'all' || activeIncidentId" type="button" class="action-btn secondary-btn" (click)="resetFilters()">
            Reset Filters
          </button>
        </div>

        <!-- Loaded Calls List -->
        <ng-container *ngIf="calls.length > 0">
          <div class="queue-meta-bar">
            <span class="meta-label">
              Loaded {{ calls.length }}{{ selectedStatus !== 'all' || activeIncidentId ? ' matching' : '' }}
              call task{{ calls.length === 1 ? '' : 's' }}
            </span>
            <span class="meta-sub">Newest first</span>
          </div>

          <!-- Desktop Table View -->
          <div class="table-container hide-mobile">
            <table class="calls-table">
              <thead>
                <tr>
                  <th>Call Task</th>
                  <th>Incident ID</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Retries / Timeout</th>
                  <th>Created</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let call of calls" class="table-row">
                  <td>
                    <a [routerLink]="['/calls', call.id]" class="call-id-link font-mono">
                      {{ call.displayId }}
                    </a>
                  </td>
                  <td>
                    <a [routerLink]="['/incidents', call.incidentId]" class="incident-id-link font-mono" title="View Incident">
                      {{ call.incidentId | slice:0:8 }}...
                    </a>
                  </td>
                  <td>{{ formatPurpose(call.purpose) }}</td>
                  <td>
                    <app-status-badge [variant]="call.status">
                      {{ call.status }}
                    </app-status-badge>
                  </td>
                  <td>
                    <span *ngIf="call.simulated" class="simulated-pill">⚡ SIMULATED</span>
                    <span *ngIf="!call.simulated" class="live-pill">NON-SIMULATED</span>
                  </td>
                  <td class="font-mono">{{ call.retries }} / {{ call.timeoutSeconds }}s</td>
                  <td class="font-mono text-sm" [title]="call.createdAt">
                    {{ call.createdAt | date:'short' }}
                  </td>
                  <td class="text-right">
                    <a [routerLink]="['/calls', call.id]" class="table-action-link">
                      View Details →
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards View -->
          <div class="mobile-cards-list hide-desktop hide-tablet">
            <div *ngFor="let call of calls" class="call-mobile-card">
              <div class="card-header">
                <a [routerLink]="['/calls', call.id]" class="call-id-link font-mono">
                  {{ call.displayId }}
                </a>
                <app-status-badge [variant]="call.status">
                  {{ call.status }}
                </app-status-badge>
              </div>

              <div class="card-body">
                <div class="card-field">
                  <span class="field-label">Purpose:</span>
                  <span class="field-value">{{ formatPurpose(call.purpose) }}</span>
                </div>
                <div class="card-field">
                  <span class="field-label">Incident:</span>
                  <a [routerLink]="['/incidents', call.incidentId]" class="incident-id-link font-mono">
                    {{ call.incidentId | slice:0:8 }}...
                  </a>
                </div>
                <div class="card-field">
                  <span class="field-label">Execution:</span>
                  <span *ngIf="call.simulated" class="simulated-pill">⚡ SIMULATED</span>
                  <span *ngIf="!call.simulated" class="live-pill">NON-SIMULATED</span>
                </div>
              </div>

              <div class="card-footer">
                <span class="font-mono text-sm text-muted" [title]="call.createdAt">
                  {{ call.createdAt | date:'short' }}
                </span>
                <a [routerLink]="['/calls', call.id]" class="card-action-link">
                  View Details →
                </a>
              </div>
            </div>
          </div>

          <!-- Cursor Pagination / Load More -->
          <div *ngIf="nextCursor || loadMoreError" class="pagination-container">
            <div *ngIf="loadMoreError" class="load-more-error-banner" role="alert">
              <span>Failed to load additional calls: {{ loadMoreError }}</span>
              <button type="button" class="action-btn secondary-btn compact-btn" (click)="loadMore()">
                Retry Load More
              </button>
            </div>

            <button
              *ngIf="nextCursor && !loadMoreError"
              type="button"
              class="action-btn secondary-btn load-more-btn"
              [disabled]="loadingMore"
              (click)="loadMore()"
            >
              <span *ngIf="!loadingMore">Load More Calls</span>
              <span *ngIf="loadingMore" class="btn-spinner-row">
                <span class="spinner-sm"></span> Loading...
              </span>
            </button>
          </div>
        </ng-container>
      </main>
    </div>
  `,
  styles: [`
    .calls-page {
      padding: var(--fr-space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-lg);
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .page-header {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-xs);
    }
    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--fr-color-text);
      margin: 0;
    }
    .page-subtitle {
      font-size: 13px;
      color: var(--fr-color-muted);
      margin: var(--fr-space-2xs) 0 0 0;
    }

    /* Filter Strip */
    .filter-strip {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-sm);
    }
    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--fr-space-md);
      align-items: flex-end;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 180px;
    }
    .flex-grow {
      flex: 1;
      min-width: 260px;
    }
    .filter-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--fr-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .filter-select,
    .filter-input {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      color: var(--fr-color-text);
      padding: 8px 12px;
      border-radius: var(--fr-radius-sm);
      font-size: 13px;
      outline: none;
      transition: border-color var(--fr-motion-fast);
      box-sizing: border-box;
      width: 100%;
    }
    .filter-select:focus,
    .filter-input:focus {
      border-color: var(--fr-color-primary);
    }
    .input-with-clear {
      position: relative;
      display: flex;
      align-items: center;
    }
    .clear-input-btn {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--fr-color-muted);
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }
    .clear-input-btn:hover {
      color: var(--fr-color-text);
    }

    .validation-banner {
      background: var(--fr-color-danger-soft);
      color: var(--fr-color-danger);
      border: 1px solid var(--fr-color-danger);
      padding: var(--fr-space-xs) var(--fr-space-sm);
      border-radius: var(--fr-radius-sm);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: var(--fr-space-xs);
    }

    .active-filter-summary {
      display: flex;
      align-items: center;
      gap: var(--fr-space-xs);
      font-size: 12px;
      color: var(--fr-color-muted);
      flex-wrap: wrap;
    }
    .summary-label {
      font-weight: 600;
    }
    .filter-chip {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      padding: 2px 8px;
      border-radius: var(--fr-radius-pill);
      color: var(--fr-color-primary-bright);
      font-size: 11px;
    }

    /* Action Buttons */
    .action-btn {
      padding: 8px 16px;
      border-radius: var(--fr-radius-sm);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
      transition: all var(--fr-motion-fast);
    }
    .primary-btn {
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
    }
    .primary-btn:hover {
      opacity: 0.9;
    }
    .secondary-btn {
      background: var(--fr-color-surface2);
      border-color: var(--fr-color-border);
      color: var(--fr-color-text);
    }
    .secondary-btn:hover {
      background: var(--fr-color-surface3);
    }
    .compact-btn {
      padding: 4px 10px;
      font-size: 12px;
    }

    /* State Cards */
    .state-card {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-xl);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--fr-space-md);
    }
    .loading-card p,
    .empty-card p,
    .error-card p {
      color: var(--fr-color-muted);
      margin: 0;
      max-width: 480px;
      font-size: 14px;
    }
    .state-card h2 {
      margin: 0;
      font-size: 18px;
      color: var(--fr-color-text);
    }
    .empty-icon, .error-icon {
      font-size: 32px;
    }

    /* Spinner */
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid var(--fr-color-border);
      border-top-color: var(--fr-color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid var(--fr-color-border);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .btn-spinner-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Meta Bar */
    .queue-meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--fr-color-muted);
      padding: 0 var(--fr-space-xs);
    }
    .meta-label {
      font-weight: 600;
    }

    /* Desktop Table */
    .table-container {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      overflow-x: auto;
    }
    .calls-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .calls-table th {
      background: var(--fr-color-surface2);
      color: var(--fr-color-muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--fr-color-border);
    }
    .calls-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--fr-color-border);
      color: var(--fr-color-text);
      vertical-align: middle;
    }
    .table-row:last-child td {
      border-bottom: none;
    }
    .table-row:hover {
      background: var(--fr-color-surface2);
    }
    .text-right {
      text-align: right;
    }

    .call-id-link {
      color: var(--fr-color-primary-bright);
      font-weight: 700;
      text-decoration: none;
    }
    .call-id-link:hover {
      text-decoration: underline;
    }
    .incident-id-link {
      color: var(--fr-color-muted);
      text-decoration: none;
    }
    .incident-id-link:hover {
      color: var(--fr-color-text);
      text-decoration: underline;
    }
    .table-action-link, .card-action-link {
      color: var(--fr-color-primary-bright);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
    }
    .table-action-link:hover, .card-action-link:hover {
      text-decoration: underline;
    }

    .simulated-pill {
      background: var(--fr-color-warning-soft);
      color: var(--fr-color-warning);
      padding: 2px 8px;
      border-radius: var(--fr-radius-sm);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .live-pill {
      background: var(--fr-color-muted-soft);
      color: var(--fr-color-muted);
      padding: 2px 8px;
      border-radius: var(--fr-radius-sm);
      font-size: 10px;
      font-weight: 700;
    }

    /* Mobile Cards */
    .mobile-cards-list {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .call-mobile-card {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-sm);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
    }
    .card-field {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .field-label {
      color: var(--fr-color-muted);
      font-size: 12px;
    }
    .field-value {
      font-weight: 600;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: var(--fr-space-xs);
      border-top: 1px solid var(--fr-color-border);
    }

    /* Pagination */
    .pagination-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--fr-space-sm);
      margin-top: var(--fr-space-sm);
    }
    .load-more-btn {
      min-width: 180px;
    }
    .load-more-error-banner {
      background: var(--fr-color-danger-soft);
      color: var(--fr-color-danger);
      border: 1px solid var(--fr-color-danger);
      padding: var(--fr-space-xs) var(--fr-space-md);
      border-radius: var(--fr-radius-sm);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: var(--fr-space-md);
    }

    /* Responsive Breakpoints */
    @media (max-width: 767px) {
      .calls-page {
        padding: var(--fr-space-md);
      }
      .filter-controls {
        flex-direction: column;
        align-items: stretch;
      }
      .filter-group {
        min-width: 100%;
      }
    }
  `]
})
export class CallQueueComponent implements OnInit {
  private callPort = inject(CallPort);

  calls: CallTask[] = [];
  nextCursor: string | null = null;
  loading = false;
  loadingMore = false;
  errorMessage: string | null = null;
  loadMoreError: string | null = null;
  isPermissionDenied = false;

  selectedStatus: CallStatus | 'all' = 'all';
  incidentIdInput = '';
  activeIncidentId: string | null = null;
  validationError: string | null = null;

  ngOnInit(): void {
    this.loadCalls();
  }

  onStatusChange(status: CallStatus | 'all'): void {
    this.selectedStatus = status;
    this.loadCalls();
  }

  onIncidentIdInput(val: string): void {
    this.incidentIdInput = val.trim();
    if (!this.incidentIdInput) {
      this.validationError = null;
      this.activeIncidentId = null;
      this.loadCalls();
      return;
    }

    if (!UUID_REGEX.test(this.incidentIdInput)) {
      this.validationError = 'Incident ID must be a valid UUID format (e.g. 550e8400-e29b-41d4-a716-446655440000)';
      this.activeIncidentId = null;
      this.calls = [];
      this.nextCursor = null;
      return;
    }

    this.validationError = null;
    this.activeIncidentId = this.incidentIdInput;
    this.loadCalls();
  }

  clearIncidentFilter(): void {
    this.incidentIdInput = '';
    this.activeIncidentId = null;
    this.validationError = null;
    this.loadCalls();
  }

  resetFilters(): void {
    this.selectedStatus = 'all';
    this.incidentIdInput = '';
    this.activeIncidentId = null;
    this.validationError = null;
    this.loadCalls();
  }

  loadCalls(): void {
    if (this.validationError) return;

    this.loading = true;
    this.calls = [];
    this.nextCursor = null;
    this.errorMessage = null;
    this.isPermissionDenied = false;
    this.loadMoreError = null;

    const queryStatus = this.selectedStatus === 'all' ? undefined : this.selectedStatus;
    const queryIncidentId = this.activeIncidentId ?? undefined;

    this.callPort.list({ status: queryStatus, incidentId: queryIncidentId, limit: 10 }).subscribe({
      next: (res) => {
        this.calls = res.items;
        this.nextCursor = res.nextCursor;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const status = callApiStatus(err);
        if (status === 403) {
          this.isPermissionDenied = true;
        } else {
          this.errorMessage = callApiErrorMessage(err, 'Failed to fetch call queue.');
        }
      }
    });
  }

  loadMore(): void {
    if (!this.nextCursor || this.loadingMore) return;

    this.loadingMore = true;
    this.loadMoreError = null;

    const queryStatus = this.selectedStatus === 'all' ? undefined : this.selectedStatus;
    const queryIncidentId = this.activeIncidentId ?? undefined;

    this.callPort.list({
      status: queryStatus,
      incidentId: queryIncidentId,
      cursor: this.nextCursor,
      limit: 10
    }).subscribe({
      next: (res) => {
        this.calls = [...this.calls, ...res.items];
        this.nextCursor = res.nextCursor;
        this.loadingMore = false;
      },
      error: (err) => {
        this.loadingMore = false;
        this.loadMoreError = callApiErrorMessage(err, 'Unable to load more calls.');
      }
    });
  }

  formatPurpose(purpose: string): string {
    switch (purpose) {
      case 'vendor_availability': return 'Vendor Availability';
      case 'appointment_confirmation': return 'Appointment Confirmation';
      case 'status_update': return 'Status Update';
      default: return purpose;
    }
  }
}
