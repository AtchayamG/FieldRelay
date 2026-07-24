import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IncidentPort } from '../../application/incident.port';
import { IncidentHttpAdapter } from '../../data/incident-http.adapter';
import { Incident, IncidentStatus } from '../../domain/incident.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  incidentApiErrorMessage,
  incidentApiStatus
} from '../../application/incident-api-error';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatusBadgeComponent],
  providers: [
    { provide: IncidentPort, useClass: IncidentHttpAdapter }
  ],
  template: `
    <div class="incidents-page">
      <!-- Header -->
      <header class="page-header">
        <div class="header-main">
          <div class="header-titles">
            <h1 class="page-title">Operational Incidents</h1>
            <p class="page-subtitle">
              Authoritative operational queue • Persisted incident triage and tracking
            </p>
          </div>
          <div class="header-actions">
            <a routerLink="/incidents/new" class="action-btn primary-btn">
              ⚡ New Incident
            </a>
          </div>
        </div>
      </header>

      <!-- Operational Summary Strip -->
      <div class="summary-strip font-mono" *ngIf="!isLoading && !errorMsg && !isPermissionRestricted">
        <div class="strip-item">
          <span class="strip-label">Loaded:</span>
          <span class="strip-value">{{ totalCount }}</span>
        </div>
        <div class="strip-item">
          <span class="strip-label">Filtered:</span>
          <span class="strip-value">{{ filteredIncidents.length }}</span>
        </div>
        <div class="strip-item" *ngIf="activeCount > 0">
          <span class="strip-label">Active:</span>
          <span class="strip-value warning">{{ activeCount }}</span>
        </div>
      </div>

      <!-- Filter and Export Bar -->
      <div class="filter-bar" *ngIf="!isPermissionRestricted">
        <div class="filter-group">
          <!-- Status Filter -->
          <div class="filter-field">
            <label for="status-filter" class="sr-only">Filter by Status</label>
            <select
              id="status-filter"
              class="form-select font-mono"
              [(ngModel)]="selectedStatus"
              (change)="onStatusFilterChange()"
            >
              <option value="">All Statuses</option>
              <option value="intake">Intake</option>
              <option value="triage">Triage</option>
              <option value="calling">Calling</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="dispatched">Dispatched</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Text Search -->
          <div class="search-field">
            <label for="search-input" class="sr-only">Search Incidents</label>
            <input
              id="search-input"
              type="text"
              class="form-input"
              placeholder="Search by ID, property, description..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
            />
          </div>
        </div>

        <!-- Export & Bulk Selection (Disabled / Planned) -->
        <div class="filter-actions">
          <button
            type="button"
            class="secondary-btn"
            disabled
            aria-disabled="true"
            title="Bulk selection — planned for next release"
          >
            Select Multiple (Planned)
          </button>
          <button
            type="button"
            class="secondary-btn"
            disabled
            aria-disabled="true"
            title="CSV Export — planned for next release"
          >
            📥 Export CSV (Unavailable)
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state-container" *ngIf="isLoading">
        <div class="pulse-loader"></div>
        <p>Fetching authoritative incident record from API...</p>
      </div>

      <!-- Error State with Retry -->
      <div class="alert-banner danger-banner" *ngIf="!isLoading && errorMsg">
        <div class="error-content">
          <span>⚠️ <strong>Error Loading Incidents:</strong> {{ errorMsg }}</span>
          <button type="button" class="retry-btn" (click)="retryLoad()">
            🔄 Retry
          </button>
        </div>
      </div>

      <div class="empty-state-container" *ngIf="!isLoading && isPermissionRestricted">
        <div class="empty-icon">🔒</div>
        <h2>Incident Access Restricted</h2>
        <p>Your current role cannot view the incident queue.</p>
      </div>

      <!-- Empty Organization State -->
      <div
        class="empty-state-container"
        *ngIf="!isLoading && !errorMsg && !isPermissionRestricted && incidents.length === 0 && !selectedStatus && !searchQuery"
      >
        <div class="empty-icon">📂</div>
        <h2>No Incidents Recorded</h2>
        <p>Your organization currently has no reported operational incidents.</p>
        <a routerLink="/incidents/new" class="action-btn primary-btn mt-md">
          ⚡ Report First Incident
        </a>
      </div>

      <!-- No Matching Results State -->
      <div
        class="empty-state-container"
        *ngIf="!isLoading && !errorMsg && !isPermissionRestricted && filteredIncidents.length === 0 && (incidents.length > 0 || !!selectedStatus || !!searchQuery)"
      >
        <div class="empty-icon">🔍</div>
        <h2>No Matching Incidents</h2>
        <p>No incidents matched your selected filter or search terms.</p>
        <button type="button" class="secondary-btn mt-md" (click)="clearFilters()">
          Clear Filters
        </button>
      </div>

      <!-- Main Incident Table & Cards -->
      <div
        class="ops-card list-card"
        *ngIf="!isLoading && !errorMsg && filteredIncidents.length > 0"
      >
        <!-- Desktop / Tablet Table -->
        <div class="table-wrapper hide-mobile">
          <table class="ops-table">
            <thead>
              <tr>
                <th>INCIDENT ID</th>
                <th>PROPERTY & UNIT</th>
                <th>TYPE</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>REPORTED BY</th>
                <th>UPDATED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inc of filteredIncidents">
                <td class="font-mono inc-id">{{ inc.displayId || inc.id }}</td>
                <td>
                  <div class="inc-prop">{{ inc.propertyId }}</div>
                  <div class="inc-unit font-mono" *ngIf="inc.unit">Unit {{ inc.unit }}</div>
                </td>
                <td class="type-cell">{{ inc.type | titlecase }}</td>
                <td>
                  <app-status-badge [variant]="inc.priority">{{ inc.priority }}</app-status-badge>
                </td>
                <td>
                  <app-status-badge [variant]="inc.status">{{ formatStatus(inc.status) }}</app-status-badge>
                </td>
                <td class="muted-cell">{{ inc.reportedBy }}</td>
                <td class="font-mono muted-cell" [attr.title]="inc.updatedAt">{{ formatDate(inc.updatedAt) }}</td>
                <td>
                  <a
                    [routerLink]="['/incidents', inc.id]"
                    class="view-link font-mono"
                    (click)="$event.stopPropagation()"
                  >
                    View →
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="mobile-incidents-list hide-desktop hide-tablet">
          <a
            class="mobile-inc-card"
            *ngFor="let inc of filteredIncidents"
            [routerLink]="['/incidents', inc.id]"
          >
            <div class="mobile-inc-header">
              <span class="font-mono inc-id">{{ inc.displayId || inc.id }}</span>
              <app-status-badge [variant]="inc.priority">{{ inc.priority }}</app-status-badge>
            </div>
            <div class="mobile-inc-body">
              <h3 class="mobile-inc-prop">{{ inc.propertyId }} <span *ngIf="inc.unit">({{ inc.unit }})</span></h3>
              <p class="mobile-inc-desc">{{ inc.description }}</p>
            </div>
            <div class="mobile-inc-footer">
              <app-status-badge [variant]="inc.status">{{ formatStatus(inc.status) }}</app-status-badge>
              <span class="font-mono time-tag" [attr.title]="inc.updatedAt">{{ formatDate(inc.updatedAt) }}</span>
            </div>
          </a>
        </div>

        <!-- Cursor Pagination -->
        <div class="pagination-footer" *ngIf="nextCursor">
          <button
            type="button"
            class="action-btn secondary-btn"
            [disabled]="isPaginating"
            (click)="loadNextPage()"
          >
            {{ isPaginating ? 'Loading More...' : 'Load More Incidents' }}
          </button>
        </div>
        <div class="pagination-error" role="alert" *ngIf="paginationError">
          <span>{{ paginationError }}</span>
          <button type="button" class="secondary-btn" (click)="loadNextPage()">Retry</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .incidents-page {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-lg);
    }
    .page-header {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-sm);
    }
    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--fr-space-md);
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: var(--fr-color-text);
    }
    .page-subtitle {
      font-size: 13px;
      color: var(--fr-color-muted);
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
      border: none;
      padding: 10px 18px;
      border-radius: var(--fr-radius-md);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      box-shadow: var(--fr-shadow-primary);
      transition: background var(--fr-motion-fast);
    }
    .action-btn:hover {
      background: var(--fr-color-primary-bright);
    }
    .action-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      box-shadow: none;
    }
    .secondary-btn {
      background: var(--fr-color-surface2);
      color: var(--fr-color-text);
      border: 1px solid var(--fr-color-border);
      padding: 8px 14px;
      border-radius: var(--fr-radius-md);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--fr-motion-fast);
    }
    .secondary-btn:hover:not(:disabled) {
      background: var(--fr-color-surface3);
    }
    .secondary-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .summary-strip {
      display: flex;
      align-items: center;
      gap: var(--fr-space-lg);
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      padding: var(--fr-space-xs) var(--fr-space-md);
      border-radius: var(--fr-radius-md);
      font-size: 12px;
      flex-wrap: wrap;
    }
    .strip-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .strip-label {
      color: var(--fr-color-muted);
    }
    .strip-value {
      font-weight: 700;
      color: var(--fr-color-text);
    }
    .strip-value.warning {
      color: var(--fr-color-warning);
    }
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--fr-space-md);
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: var(--fr-space-sm);
      flex: 1;
      min-width: 280px;
    }
    .form-select, .form-input {
      background: var(--fr-color-surface);
      color: var(--fr-color-text);
      border: 1px solid var(--fr-color-border);
      padding: 8px 12px;
      border-radius: var(--fr-radius-md);
      font-size: 13px;
      outline: none;
    }
    .form-select:focus, .form-input:focus {
      border-color: var(--fr-color-primary);
    }
    .search-field {
      flex: 1;
    }
    .search-field .form-input {
      width: 100%;
    }
    .filter-actions {
      display: flex;
      gap: var(--fr-space-xs);
    }
    .loading-state-container, .empty-state-container {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-xl);
      padding: var(--fr-space-2xl);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--fr-space-md);
    }
    .pulse-loader {
      width: 44px;
      height: 44px;
      border: 4px solid var(--fr-color-border);
      border-top-color: var(--fr-color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .empty-icon {
      font-size: 36px;
    }
    .mt-md {
      margin-top: var(--fr-space-md);
    }
    .alert-banner {
      padding: var(--fr-space-md);
      border-radius: var(--fr-radius-md);
      font-size: 13px;
    }
    .danger-banner {
      background: var(--fr-color-danger-soft);
      border: 1px solid var(--fr-color-danger);
      color: var(--fr-color-danger);
    }
    .error-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--fr-space-md);
    }
    .retry-btn {
      background: var(--fr-color-danger);
      color: var(--fr-color-on-accent);
      border: none;
      padding: 6px 12px;
      border-radius: var(--fr-radius-sm);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .ops-card {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-lg);
      padding: var(--fr-space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
      box-shadow: var(--fr-shadow-card);
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .ops-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .ops-table th {
      font-size: 10px;
      font-weight: 700;
      color: var(--fr-color-muted);
      letter-spacing: 0.8px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--fr-color-border);
    }
    .ops-table td {
      padding: 12px;
      border-bottom: 1px solid var(--fr-color-surface2);
    }
    .inc-id {
      font-weight: 600;
      color: var(--fr-color-primary-bright);
    }
    .inc-prop {
      font-weight: 600;
      color: var(--fr-color-text);
    }
    .inc-unit {
      font-size: 11px;
      color: var(--fr-color-muted);
    }
    .type-cell {
      text-transform: capitalize;
    }
    .muted-cell {
      color: var(--fr-color-muted);
      font-size: 12px;
    }
    .view-link {
      color: var(--fr-color-primary-bright);
      text-decoration: none;
      font-weight: 700;
      font-size: 12px;
    }
    .view-link:hover {
      text-decoration: underline;
    }
    .mobile-incidents-list {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-sm);
    }
    .mobile-inc-card {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      color: inherit;
      text-decoration: none;
    }
    .mobile-inc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mobile-inc-prop {
      font-size: 14px;
      font-weight: 700;
      color: var(--fr-color-text);
    }
    .mobile-inc-desc {
      font-size: 12px;
      color: var(--fr-color-muted);
      line-clamp: 2;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .mobile-inc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
    }
    .time-tag {
      font-size: 10px;
      color: var(--fr-color-muted);
    }
    .pagination-footer {
      display: flex;
      justify-content: center;
      padding-top: var(--fr-space-md);
      border-top: 1px solid var(--fr-color-border);
    }
    .pagination-error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--fr-space-sm);
      color: var(--fr-color-danger);
      font-size: 12px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
  `]
})
export class IncidentListComponent implements OnInit {
  private port = inject(IncidentPort);

  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  nextCursor: string | null = null;
  selectedStatus: string = '';
  searchQuery: string = '';

  isLoading: boolean = true;
  isPaginating: boolean = false;
  errorMsg: string | null = null;
  paginationError: string | null = null;
  isPermissionRestricted: boolean = false;

  ngOnInit(): void {
    this.loadIncidents();
  }

  loadIncidents(): void {
    this.isLoading = true;
    this.errorMsg = null;
    this.isPermissionRestricted = false;
    this.port
      .list({
        status: (this.selectedStatus as IncidentStatus) || undefined
      })
      .subscribe({
        next: (res) => {
          this.incidents = res.items;
          this.nextCursor = res.nextCursor;
          this.applyClientSearch();
          this.isLoading = false;
        },
        error: (err) => {
          if (incidentApiStatus(err) === 403) {
            this.isPermissionRestricted = true;
          } else {
            this.errorMsg = incidentApiErrorMessage(
              err,
              'Failed to fetch incident list.'
            );
          }
          this.isLoading = false;
        }
      });
  }

  retryLoad(): void {
    this.loadIncidents();
  }

  onStatusFilterChange(): void {
    this.loadIncidents();
  }

  onSearchChange(): void {
    this.applyClientSearch();
  }

  applyClientSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredIncidents = [...this.incidents];
      return;
    }

    const q = this.searchQuery.toLowerCase().trim();
    this.filteredIncidents = this.incidents.filter(
      (inc) =>
        inc.id.toLowerCase().includes(q) ||
        inc.displayId.toLowerCase().includes(q) ||
        inc.propertyId.toLowerCase().includes(q) ||
        (inc.unit && inc.unit.toLowerCase().includes(q)) ||
        inc.description.toLowerCase().includes(q) ||
        inc.reportedBy.toLowerCase().includes(q) ||
        inc.type.toLowerCase().includes(q)
    );
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.searchQuery = '';
    this.loadIncidents();
  }

  loadNextPage(): void {
    if (!this.nextCursor || this.isPaginating) return;
    this.isPaginating = true;
    this.paginationError = null;

    this.port
      .list({
        status: (this.selectedStatus as IncidentStatus) || undefined,
        cursor: this.nextCursor
      })
      .subscribe({
        next: (res) => {
          this.incidents = [...this.incidents, ...res.items];
          this.nextCursor = res.nextCursor;
          this.applyClientSearch();
          this.isPaginating = false;
        },
        error: (err) => {
          this.paginationError = incidentApiErrorMessage(
            err,
            'Could not load the next page.'
          );
          this.isPaginating = false;
        }
      });
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleString([], {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    } catch {
      return isoString;
    }
  }

  get totalCount(): number {
    return this.incidents.length;
  }

  get activeCount(): number {
    return this.incidents.filter(
      (i) => i.status !== 'resolved' && i.status !== 'cancelled'
    ).length;
  }
}
