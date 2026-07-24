import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CallPort } from '../../application/call.port';
import { CallHttpAdapter } from '../../data/call-http.adapter';
import { CallTask } from '../../domain/call.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { callApiErrorMessage, callApiStatus } from '../../application/call-api-error';

@Component({
  selector: 'app-call-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent],
  providers: [
    { provide: CallPort, useClass: CallHttpAdapter }
  ],
  template: `
    <div class="call-detail-page">
      <!-- Back Navigation Header -->
      <nav class="detail-nav" aria-label="Breadcrumb Navigation">
        <a routerLink="/calls" class="back-link">
          ← Back to Call Queue
        </a>
      </nav>

      <!-- Loading State -->
      <div *ngIf="loading" class="state-card loading-card">
        <div class="spinner"></div>
        <p>Loading call task details...</p>
      </div>

      <!-- 404 Not Found State -->
      <div *ngIf="isNotFound" class="state-card error-card" role="alert">
        <div class="error-icon">🔍</div>
        <h2>Call Task Not Found</h2>
        <p>The requested call task ID is not available.</p>
        <a routerLink="/calls" class="action-btn primary-btn">
          Return to Queue
        </a>
      </div>

      <!-- 403 Forbidden State -->
      <div *ngIf="isPermissionDenied" class="state-card error-card" role="alert">
        <div class="error-icon">🔒</div>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this call detail.</p>
        <a routerLink="/calls" class="action-btn secondary-btn">
          Back to Queue
        </a>
      </div>

      <!-- Generic Error State -->
      <div *ngIf="errorMessage && !isNotFound && !isPermissionDenied && !call" class="state-card error-card" role="alert">
        <div class="error-icon">⚠️</div>
        <h2>Unable to Load Call Task</h2>
        <p>{{ errorMessage }}</p>
        <button type="button" class="action-btn primary-btn" (click)="loadCallDetail()">
          Retry
        </button>
      </div>

      <!-- Detail Content -->
      <main *ngIf="call" class="detail-content">
        <!-- Prominent Simulation Banner -->
        <div *ngIf="call.simulated" class="simulated-banner">
          <span class="banner-icon">⚡</span>
          <div class="banner-text">
            <strong class="banner-title">SIMULATED CALL TASK</strong>
            <span class="banner-sub">
              Produced by demo adapter — no real-world phone network action occurred.
            </span>
          </div>
        </div>

        <!-- Reconciliation Required Alert Banner -->
        <div *ngIf="call.status === 'outcome_unknown'" class="reconciliation-alert" role="alert">
          <span class="alert-icon">⚠️</span>
          <div class="alert-text">
            <strong class="alert-title">Reconciliation required — do not redial</strong>
            <span class="alert-sub">
              The status of this call task is outcome_unknown. Automated retry or redial controls are strictly restricted. Manual verification is required before taking further operational steps.
            </span>
          </div>
        </div>

        <!-- Main Task Header Card -->
        <div class="detail-header-card">
          <div class="header-top-row">
            <div class="header-identity">
              <h1 class="call-display-id font-mono">{{ call.displayId }}</h1>
              <span class="call-uuid font-mono text-muted">{{ call.id }}</span>
            </div>
            <div class="header-status-badge">
              <app-status-badge [variant]="call.status">
                {{ call.status }}
              </app-status-badge>
            </div>
          </div>
        </div>

        <!-- API Field Inspection Grid -->
        <div class="detail-grid">
          <!-- Section 1: Workflow Identity & Target -->
          <section class="detail-section">
            <h2 class="section-title">Workflow Identity</h2>
            <dl class="field-list">
              <div class="field-row">
                <dt class="field-label">Incident Identifier</dt>
                <dd class="field-value">
                  <a [routerLink]="['/incidents', call.incidentId]" class="incident-link font-mono">
                    {{ call.incidentId }}
                  </a>
                </dd>
              </div>

              <div class="field-row">
                <dt class="field-label">Authorized Contact ID</dt>
                <dd class="field-value font-mono">{{ call.authorizedContactId }}</dd>
              </div>

              <div class="field-row">
                <dt class="field-label">Purpose</dt>
                <dd class="field-value">{{ formatPurpose(call.purpose) }}</dd>
              </div>
            </dl>
          </section>

          <!-- Section 2: Provider & Lifecycle State -->
          <section class="detail-section">
            <h2 class="section-title">Provider & Lifecycle</h2>
            <dl class="field-list">
              <div class="field-row">
                <dt class="field-label">Provider Task ID</dt>
                <dd class="field-value font-mono">
                  <span *ngIf="call.providerTaskId">{{ call.providerTaskId }}</span>
                  <span *ngIf="!call.providerTaskId" class="text-muted pending-tag">
                    Unavailable / Pending dispatch
                  </span>
                </dd>
              </div>

              <div class="field-row">
                <dt class="field-label">Execution Mode</dt>
                <dd class="field-value">
                  <span *ngIf="call.simulated" class="simulated-pill">⚡ SIMULATED</span>
                  <span *ngIf="!call.simulated" class="live-pill">NON-SIMULATED</span>
                </dd>
              </div>

              <div class="field-row">
                <dt class="field-label">Timeout</dt>
                <dd class="field-value font-mono">{{ call.timeoutSeconds }}s</dd>
              </div>

              <div class="field-row">
                <dt class="field-label">Retry Limit</dt>
                <dd class="field-value font-mono">{{ call.retries }}</dd>
              </div>
            </dl>
          </section>

          <!-- Section 3: Audit & Timestamps -->
          <section class="detail-section full-width-section">
            <h2 class="section-title">Audit Metadata</h2>
            <dl class="field-list grid-field-list">
              <div class="field-row">
                <dt class="field-label">Created At</dt>
                <dd class="field-value font-mono">{{ call.createdAt | date:'medium' }}</dd>
              </div>

              <div class="field-row">
                <dt class="field-label">Updated At</dt>
                <dd class="field-value font-mono">{{ call.updatedAt | date:'medium' }}</dd>
              </div>

              <div class="field-row">
                <dt class="field-label">Version</dt>
                <dd class="field-value font-mono">v{{ call.version }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .call-detail-page {
      padding: var(--fr-space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-lg);
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .detail-nav {
      display: flex;
      align-items: center;
    }
    .back-link {
      color: var(--fr-color-primary-bright);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .back-link:hover {
      text-decoration: underline;
    }

    /* Simulation Banner */
    .simulated-banner {
      background: var(--fr-color-warning-soft);
      border: 1px solid var(--fr-color-warning);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      align-items: flex-start;
      gap: var(--fr-space-md);
      color: var(--fr-color-warning);
    }
    .banner-icon {
      font-size: 24px;
      line-height: 1;
    }
    .banner-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .banner-title {
      font-size: 14px;
      letter-spacing: 0.5px;
    }
    .banner-sub {
      font-size: 13px;
      opacity: 0.9;
    }

    /* Reconciliation Alert Banner */
    .reconciliation-alert {
      background: var(--fr-color-danger-soft);
      border: 1px solid var(--fr-color-danger);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      align-items: flex-start;
      gap: var(--fr-space-md);
      color: var(--fr-color-danger);
    }
    .alert-icon {
      font-size: 24px;
      line-height: 1;
    }
    .alert-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .alert-title {
      font-size: 15px;
      letter-spacing: 0.5px;
    }
    .alert-sub {
      font-size: 13px;
      line-height: 1.4;
    }

    /* Detail Header Card */
    .detail-header-card {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-lg);
    }
    .header-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--fr-space-md);
      flex-wrap: wrap;
    }
    .call-display-id {
      font-size: 26px;
      font-weight: 700;
      color: var(--fr-color-text);
      margin: 0;
    }
    .call-uuid {
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }

    /* Detail Grid */
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--fr-space-lg);
    }
    .detail-section {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .full-width-section {
      grid-column: 1 / -1;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--fr-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0;
      padding-bottom: var(--fr-space-xs);
      border-bottom: 1px solid var(--fr-color-border);
    }

    /* Field List */
    .field-list {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .grid-field-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--fr-space-md);
    }
    .field-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--fr-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-value {
      font-size: 14px;
      color: var(--fr-color-text);
      font-weight: 500;
      margin: 0;
      word-break: break-all;
    }

    .incident-link {
      color: var(--fr-color-primary-bright);
      text-decoration: none;
    }
    .incident-link:hover {
      text-decoration: underline;
    }

    .pending-tag {
      font-style: italic;
      font-size: 13px;
    }

    .simulated-pill {
      background: var(--fr-color-warning-soft);
      color: var(--fr-color-warning);
      padding: 2px 8px;
      border-radius: var(--fr-radius-sm);
      font-size: 11px;
      font-weight: 700;
    }
    .live-pill {
      background: var(--fr-color-muted-soft);
      color: var(--fr-color-muted);
      padding: 2px 8px;
      border-radius: var(--fr-radius-sm);
      font-size: 11px;
      font-weight: 700;
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
    .state-card h2 {
      margin: 0;
      font-size: 18px;
      color: var(--fr-color-text);
    }
    .state-card p {
      color: var(--fr-color-muted);
      margin: 0;
      max-width: 480px;
      font-size: 14px;
    }
    .error-icon {
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
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

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
      justify-content: center;
    }
    .primary-btn {
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
    }
    .secondary-btn {
      background: var(--fr-color-surface2);
      border-color: var(--fr-color-border);
      color: var(--fr-color-text);
    }

    @media (max-width: 767px) {
      .call-detail-page {
        padding: var(--fr-space-md);
      }
    }
  `]
})
export class CallDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private callPort = inject(CallPort);

  call: CallTask | null = null;
  loading = false;
  errorMessage: string | null = null;
  isNotFound = false;
  isPermissionDenied = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const callTaskId = params.get('callTaskId');
      if (callTaskId) {
        this.loadCallDetail(callTaskId);
      }
    });
  }

  loadCallDetail(id?: string): void {
    const callTaskId = id || this.route.snapshot.paramMap.get('callTaskId');
    if (!callTaskId) return;

    this.loading = true;
    this.call = null;
    this.errorMessage = null;
    this.isNotFound = false;
    this.isPermissionDenied = false;

    this.callPort.getById(callTaskId).subscribe({
      next: (data) => {
        this.call = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const status = callApiStatus(err);
        if (status === 404) {
          this.isNotFound = true;
        } else if (status === 403) {
          this.isPermissionDenied = true;
        } else {
          this.errorMessage = callApiErrorMessage(err, 'Failed to fetch call task details.');
        }
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
