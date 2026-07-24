import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IncidentPort } from '../../application/incident.port';
import { IncidentHttpAdapter } from '../../data/incident-http.adapter';
import { Incident } from '../../domain/incident.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  incidentApiErrorCode,
  incidentApiErrorMessage,
  incidentApiStatus
} from '../../application/incident-api-error';

type DetailTab = 'details' | 'commitments' | 'ai' | 'calls' | 'attachments';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent],
  providers: [
    { provide: IncidentPort, useClass: IncidentHttpAdapter }
  ],
  template: `
    <div class="incident-detail-page">
      <!-- Loading State -->
      <div class="loading-state-container" *ngIf="isLoading">
        <div class="pulse-loader"></div>
        <p>Loading operational record for incident...</p>
      </div>

      <!-- 404 Not Found State -->
      <div class="empty-state-container" *ngIf="!isLoading && isNotFound">
        <div class="empty-icon">🚫</div>
        <h2>404 — Incident Not Found</h2>
        <p>The requested incident identifier does not exist or was removed.</p>
        <a routerLink="/incidents" class="action-btn primary-btn mt-md">
          ← Return to Incidents Queue
        </a>
      </div>

      <!-- Generic Error State -->
      <div class="alert-banner danger-banner" *ngIf="!isLoading && !isNotFound && errorMsg">
        <div class="error-content">
          <span>⚠️ <strong>Error Loading Incident:</strong> {{ errorMsg }}</span>
          <button type="button" class="retry-btn" (click)="retryLoad()">
            🔄 Retry
          </button>
        </div>
      </div>

      <!-- Main Detail Layout (When loaded successfully) -->
      <div class="detail-container" *ngIf="!isLoading && incident">
        <!-- Header Bar -->
        <header class="detail-header">
          <div class="header-top-row">
            <a routerLink="/incidents" class="back-link font-mono">
              ← Back to Incidents
            </a>
            <div class="header-actions">
              <button
                type="button"
                class="secondary-btn"
                disabled
                aria-disabled="true"
                title="Editing incident is planned for next release"
              >
                ✏️ Edit (Planned)
              </button>
              <button
                type="button"
                class="secondary-btn"
                disabled
                aria-disabled="true"
                title="Share incident link is planned for next release"
              >
                🔗 Share (Planned)
              </button>
            </div>
          </div>

          <div class="header-main-row">
            <div class="header-title-group">
              <span class="font-mono display-id">{{ incident.displayId || incident.id }}</span>
              <h1 class="incident-title">
                {{ incident.type | titlecase }} Issue @ {{ incident.propertyId }}
                <span class="unit-tag font-mono" *ngIf="incident.unit">(Unit {{ incident.unit }})</span>
              </h1>
            </div>
            <div class="header-badges">
              <app-status-badge [variant]="incident.priority">
                Priority: {{ incident.priority }}
              </app-status-badge>
              <app-status-badge [variant]="incident.status">
                Status: {{ formatStatus(incident.status) }}
              </app-status-badge>
            </div>
          </div>
        </header>

        <!-- Navigation Tabs -->
        <nav class="detail-tabs" aria-label="Incident Sections">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'details'"
            (click)="activeTab = 'details'"
          >
            Verified Details
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'commitments'"
            (click)="activeTab = 'commitments'"
          >
            Commitment Timeline
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'ai'"
            (click)="activeTab = 'ai'"
          >
            AI Insights
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'calls'"
            (click)="activeTab = 'calls'"
          >
            Latest Call
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'attachments'"
            (click)="activeTab = 'attachments'"
          >
            Attachments
          </button>
        </nav>

        <!-- Tab 1: Verified Incident Details (Real API Data) -->
        <section class="tab-content ops-card" *ngIf="activeTab === 'details'">
          <h2 class="card-section-title">Verified Operational Record</h2>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Incident ID</span>
              <span class="detail-value font-mono highlight">{{ incident.id }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Display ID</span>
              <span class="detail-value font-mono">{{ incident.displayId }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Property ID</span>
              <span class="detail-value">{{ incident.propertyId }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Unit</span>
              <span class="detail-value font-mono">{{ incident.unit || 'N/A' }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Incident Type</span>
              <span class="detail-value type-tag">{{ incident.type | titlecase }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Priority Level</span>
              <span class="detail-value">
                <app-status-badge [variant]="incident.priority">{{ incident.priority }}</app-status-badge>
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Current Status</span>
              <span class="detail-value">
                <app-status-badge [variant]="incident.status">{{ formatStatus(incident.status) }}</app-status-badge>
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Reported By</span>
              <span class="detail-value">{{ incident.reportedBy }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Created At</span>
              <span class="detail-value font-mono">{{ formatTimestamp(incident.createdAt) }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Last Updated</span>
              <span class="detail-value font-mono">{{ formatTimestamp(incident.updatedAt) }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Record Version</span>
              <span class="detail-value font-mono">v{{ incident.version }}</span>
            </div>
          </div>

          <div class="description-block">
            <h3 class="block-title">Incident Description</h3>
            <p class="description-text">{{ incident.description }}</p>
          </div>
        </section>

        <!-- Tab 2: Commitment Timeline (Truthful Unavailable State) -->
        <section class="tab-content ops-card" *ngIf="activeTab === 'commitments'">
          <div class="empty-tab-panel">
            <div class="tab-icon">📜</div>
            <h3>No Commitments Recorded</h3>
            <p>
              Vendor arrival and cost commitments are captured automatically when CALL-E conducts an authorized phone workflow.
            </p>
            <span class="unavailable-badge font-mono">CALL-E Workflow Execution Required</span>
          </div>
        </section>

        <!-- Tab 3: AI Insights (Truthful Unavailable State) -->
        <section class="tab-content ops-card" *ngIf="activeTab === 'ai'">
          <div class="empty-tab-panel">
            <div class="tab-icon">🤖</div>
            <h3>AI Summary & Insights Unavailable</h3>
            <p>
              AI summaries and confidence scores require a future authorized phone workflow.
            </p>
            <span class="unavailable-badge font-mono">Active Call Mission Required</span>
          </div>
        </section>

        <!-- Tab 4: Latest Call (Truthful Unavailable State) -->
        <section class="tab-content ops-card" *ngIf="activeTab === 'calls'">
          <div class="empty-tab-panel">
            <div class="tab-icon">📞</div>
            <h3>No Call Record</h3>
            <p>
              No authorized phone call workflow has been dispatched for this incident yet.
            </p>
            <span class="unavailable-badge font-mono">No Call Dispatched</span>
          </div>
        </section>

        <!-- Tab 5: Attachments (Truthful Unavailable State) -->
        <section class="tab-content ops-card" *ngIf="activeTab === 'attachments'">
          <div class="empty-tab-panel">
            <div class="tab-icon">📎</div>
            <h3>No Attachments Uploaded</h3>
            <p>
              Photo and document evidence attachment is planned for a future delivery milestone.
            </p>
            <span class="unavailable-badge font-mono">Attachment Storage Planned</span>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .incident-detail-page {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-lg);
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
    .detail-container {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .detail-header {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-lg);
      padding: var(--fr-space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .header-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .back-link {
      color: var(--fr-color-primary-bright);
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .header-actions {
      display: flex;
      gap: var(--fr-space-xs);
    }
    .secondary-btn {
      background: var(--fr-color-surface2);
      color: var(--fr-color-text);
      border: 1px solid var(--fr-color-border);
      padding: 6px 12px;
      border-radius: var(--fr-radius-md);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .secondary-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--fr-space-md);
      flex-wrap: wrap;
    }
    .header-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .display-id {
      font-size: 13px;
      font-weight: 700;
      color: var(--fr-color-primary-bright);
    }
    .incident-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--fr-color-text);
    }
    .unit-tag {
      font-size: 14px;
      color: var(--fr-color-muted);
      font-weight: 400;
    }
    .header-badges {
      display: flex;
      gap: var(--fr-space-xs);
      align-items: center;
    }
    .detail-tabs {
      display: flex;
      gap: var(--fr-space-xs);
      border-bottom: 1px solid var(--fr-color-border);
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--fr-color-muted);
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all var(--fr-motion-fast);
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: var(--fr-color-text);
    }
    .tab-btn.active {
      color: var(--fr-color-primary-bright);
      border-bottom-color: var(--fr-color-primary);
    }
    .ops-card {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-lg);
      padding: var(--fr-space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-lg);
      box-shadow: var(--fr-shadow-card);
    }
    .card-section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fr-color-text);
      border-bottom: 1px solid var(--fr-color-border);
      padding-bottom: var(--fr-space-xs);
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--fr-space-md);
    }
    @media (max-width: 900px) {
      .details-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 500px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      padding: var(--fr-space-md);
      border-radius: var(--fr-radius-md);
    }
    .detail-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--fr-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--fr-color-text);
      word-break: break-word;
    }
    .detail-value.highlight {
      color: var(--fr-color-primary-bright);
    }
    .type-tag {
      text-transform: capitalize;
    }
    .description-block {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-xs);
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      padding: var(--fr-space-md);
      border-radius: var(--fr-radius-md);
    }
    .block-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--fr-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .description-text {
      font-size: 14px;
      line-height: 1.5;
      color: var(--fr-color-text);
      white-space: pre-wrap;
    }
    .empty-tab-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--fr-space-xl);
      gap: var(--fr-space-sm);
    }
    .tab-icon {
      font-size: 36px;
    }
    .unavailable-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--fr-color-muted);
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      padding: 4px 10px;
      border-radius: var(--fr-radius-sm);
      margin-top: var(--fr-space-xs);
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
      padding: 10px 18px;
      border-radius: var(--fr-radius-md);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
  `]
})
export class IncidentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private port = inject(IncidentPort);

  incidentId: string = '';
  incident: Incident | null = null;

  activeTab: DetailTab = 'details';
  isLoading: boolean = true;
  isNotFound: boolean = false;
  errorMsg: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('incidentId');
      if (id) {
        this.incidentId = id;
        this.loadIncident(id);
      }
    });
  }

  loadIncident(id: string): void {
    this.isLoading = true;
    this.isNotFound = false;
    this.errorMsg = null;

    this.port.getById(id).subscribe({
      next: (data) => {
        this.incident = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        if (incidentApiStatus(err) === 404 || incidentApiErrorCode(err) === 'NOT_FOUND') {
          this.isNotFound = true;
        } else {
          this.errorMsg = incidentApiErrorMessage(
            err,
            'Failed to fetch incident details.'
          );
        }
      }
    });
  }

  retryLoad(): void {
    if (this.incidentId) {
      this.loadIncident(this.incidentId);
    }
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  formatTimestamp(isoString: string): string {
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  }
}
