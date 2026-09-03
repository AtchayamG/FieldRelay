import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IncidentPort } from '../../application/incident.port';
import { IncidentHttpAdapter } from '../../data/incident-http.adapter';
import { Incident } from '../../domain/incident.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import {
  incidentApiErrorCode,
  incidentApiErrorMessage,
  incidentApiStatus
} from '../../application/incident-api-error';
import { CallPort } from '../../../calls/application/call.port';
import { CallHttpAdapter } from '../../../calls/data/call-http.adapter';
import { CallLaunchContext, CallTask } from '../../../calls/domain/call.model';
import { callApiErrorMessage } from '../../../calls/application/call-api-error';

type DetailTab = 'details' | 'commitments' | 'ai' | 'calls' | 'attachments';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent, IconComponent],
  providers: [
    { provide: IncidentPort, useClass: IncidentHttpAdapter },
    { provide: CallPort, useClass: CallHttpAdapter }
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
        <fr-icon class="empty-icon" name="forbidden" [size]="44" [strokeWidth]="1.4" />
        <h2>404 — Incident Not Found</h2>
        <p>The requested incident identifier does not exist or was removed.</p>
        <a routerLink="/incidents" class="action-btn primary-btn mt-md">
          ← Return to Incidents Queue
        </a>
      </div>

      <!-- Generic Error State -->
      <div class="alert-banner danger-banner" *ngIf="!isLoading && !isNotFound && errorMsg">
        <div class="error-content">
          <span class="error-text">
            <fr-icon name="alert" [size]="16" />
            <span><strong>Error Loading Incident:</strong> {{ errorMsg }}</span>
          </span>
          <button type="button" class="retry-btn" (click)="retryLoad()">
            <fr-icon name="refresh" [size]="15" />
            <span>Retry</span>
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
                <fr-icon name="edit" [size]="15" />
                <span>Edit (Planned)</span>
              </button>
              <button
                type="button"
                class="secondary-btn"
                disabled
                aria-disabled="true"
                title="Share incident link is planned for next release"
              >
                <fr-icon name="link" [size]="15" />
                <span>Share (Planned)</span>
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
            (click)="openCallTab()"
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
            <fr-icon class="tab-icon" name="document" [size]="40" [strokeWidth]="1.4" />
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
            <fr-icon class="tab-icon" name="activity" [size]="40" [strokeWidth]="1.4" />
            <h3>AI Summary & Insights Unavailable</h3>
            <p>
              AI summaries and confidence scores require a future authorized phone workflow.
            </p>
            <span class="unavailable-badge font-mono">Active Call Mission Required</span>
          </div>
        </section>

        <!-- Tab 4: Latest Call and guarded call launch -->
        <section class="tab-content ops-card" *ngIf="activeTab === 'calls'">
          <div class="empty-tab-panel" *ngIf="callPanelLoading">
            <div class="pulse-loader compact-loader"></div>
            <h3>Checking Call Readiness</h3>
            <p>Loading the incident call record and authorized live target.</p>
          </div>

          <div class="call-record" *ngIf="!callPanelLoading && latestCall && !callPrepared">
            <div>
              <span class="detail-label">Latest call task</span>
              <h3 class="font-mono">{{ latestCall.displayId }}</h3>
              <p>
                {{ latestCall.simulated ? 'Simulated' : 'Live' }} CALL-E task,
                currently {{ formatStatus(latestCall.status) }}.
              </p>
            </div>
            <div class="record-actions">
              <a class="action-btn secondary-action" [routerLink]="['/calls', latestCall.id]">
                Review call evidence
              </a>
              <button
                type="button"
                class="action-btn"
                *ngIf="canPrepareFollowUp"
                (click)="prepareCall()"
              >
                <fr-icon name="shield" [size]="15" />
                Review new authorized call
              </button>
            </div>
          </div>

          <div class="empty-tab-panel" *ngIf="!callPanelLoading && !latestCall && !callPrepared">
            <fr-icon class="tab-icon" name="phone" [size]="40" [strokeWidth]="1.4" />
            <h3>No Call Record</h3>
            <p>
              No authorized phone call workflow has been dispatched for this incident yet.
            </p>
            <p class="call-context-error" *ngIf="callContextError">{{ callContextError }}</p>
            <div class="launch-facts" *ngIf="callContext">
              <span>
                <strong>Execution</strong>
                <span class="font-mono">{{ callContext.mode === 'live' ? 'LIVE' : 'SIMULATED' }}</span>
              </span>
              <span>
                <strong>Authorized contact</strong>
                <span class="font-mono">{{ callContext.contactId || 'Not configured' }}</span>
              </span>
              <span>
                <strong>Target</strong>
                <span class="font-mono">{{ callContext.maskedPhone || 'Not configured' }}</span>
              </span>
            </div>
            <button
              type="button"
              class="action-btn"
              [disabled]="!canPrepareCall"
              (click)="prepareCall()"
            >
              <fr-icon name="shield" [size]="15" />
              Review authorized call
            </button>
          </div>

          <div class="call-confirmation" *ngIf="!callPanelLoading && callPrepared">
            <div class="confirmation-heading">
              <fr-icon name="shield" [size]="22" />
              <div>
                <h3>{{ callContext?.mode === 'live' ? 'Confirm one live CALL-E call' : 'Confirm simulated CALL-E task' }}</h3>
                <p>
                  The task is bound to this incident, contact
                  <span class="font-mono">{{ callContext?.contactId }}</span>, and the permitted purpose
                  <span class="font-mono">vendor_availability</span>.
                </p>
              </div>
            </div>

            <p class="live-warning" *ngIf="callContext?.mode === 'live'">
              <fr-icon name="alert" [size]="16" />
              This action places one real, metered phone call to the provisioned target
              {{ callContext?.maskedPhone }}. Closing the page will not cancel a call already submitted.
            </p>
            <p class="demo-notice" *ngIf="callContext?.mode === 'demo'">
              Demo mode creates an auditable simulated task. It cannot reach a telephone network.
            </p>

            <label class="confirmation-check">
              <input
                type="checkbox"
                [checked]="callConfirmed"
                (change)="callConfirmed = $any($event.target).checked"
              />
              <span>
                I understand this will create exactly one
                {{ callContext?.mode === 'live' ? 'real metered call' : 'simulated call task' }}.
              </span>
            </label>

            <p class="call-context-error" *ngIf="callStartError">{{ callStartError }}</p>

            <div class="call-actions">
              <button type="button" class="secondary-btn" [disabled]="callStarting" (click)="cancelCallPreparation()">
                Cancel
              </button>
              <button
                type="button"
                class="action-btn"
                [disabled]="!callConfirmed || callStarting"
                (click)="startAuthorizedCall()"
              >
                <fr-icon name="phone-active" [size]="15" />
                {{ callStarting
                  ? 'Submitting call...'
                  : (callContext?.mode === 'live' ? 'Place one live call' : 'Run simulated call') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Tab 5: Attachments (Truthful Unavailable State) -->
        <section class="tab-content ops-card" *ngIf="activeTab === 'attachments'">
          <div class="empty-tab-panel">
            <fr-icon class="tab-icon" name="link" [size]="40" [strokeWidth]="1.4" />
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
    .compact-loader {
      width: 30px;
      height: 30px;
      border-width: 3px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .empty-icon {
      color: var(--fr-color-muted);
      opacity: 0.75;
    }
    .error-text {
      display: inline-flex;
      align-items: center;
      gap: 8px;
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
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
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
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .secondary-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .action-btn:disabled {
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
      color: var(--fr-color-muted);
      opacity: 0.7;
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
      border: none;
      cursor: pointer;
      gap: 7px;
    }
    .secondary-action {
      background: var(--fr-color-surface2);
      color: var(--fr-color-primary-bright);
      border: 1px solid var(--fr-color-border);
    }
    .call-record, .call-confirmation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--fr-space-lg);
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-tray-radius-inner);
      padding: var(--fr-space-lg);
    }
    .call-record h3, .call-confirmation h3 {
      margin: 4px 0;
      color: var(--fr-color-text);
    }
    .call-record p, .call-confirmation p {
      color: var(--fr-color-muted);
      line-height: 1.5;
    }
    .record-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--fr-space-sm);
    }
    .launch-facts {
      width: min(720px, 100%);
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-tray-radius-inner);
      overflow: hidden;
      text-align: left;
    }
    .launch-facts > span {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: var(--fr-space-sm) var(--fr-space-md);
    }
    .launch-facts > span + span {
      border-left: 1px solid var(--fr-color-border);
    }
    .launch-facts strong {
      color: var(--fr-color-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .call-confirmation {
      align-items: stretch;
      flex-direction: column;
    }
    .confirmation-heading {
      display: flex;
      align-items: flex-start;
      gap: var(--fr-space-sm);
    }
    .confirmation-heading > fr-icon {
      color: var(--fr-color-primary-bright);
      flex: 0 0 auto;
    }
    .live-warning, .demo-notice, .call-context-error {
      padding: var(--fr-space-sm) var(--fr-space-md);
      border-radius: var(--fr-radius-md);
    }
    .live-warning {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: var(--fr-color-warning-soft);
      color: var(--fr-color-warning) !important;
      border: 1px solid var(--fr-color-warning);
    }
    .demo-notice {
      background: var(--fr-color-primary-soft);
      color: var(--fr-color-primary-bright) !important;
      border: 1px solid var(--fr-color-primary);
    }
    .call-context-error {
      background: var(--fr-color-danger-soft);
      color: var(--fr-color-danger);
      border: 1px solid var(--fr-color-danger);
    }
    .confirmation-check {
      display: flex;
      align-items: flex-start;
      gap: var(--fr-space-sm);
      color: var(--fr-color-text);
      font-size: 13px;
      line-height: 1.45;
      cursor: pointer;
    }
    .confirmation-check input {
      margin-top: 2px;
      accent-color: var(--fr-color-primary);
    }
    .call-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--fr-space-sm);
    }
    @media (max-width: 720px) {
      .launch-facts {
        grid-template-columns: 1fr;
      }
      .launch-facts > span + span {
        border-left: none;
        border-top: 1px solid var(--fr-color-border);
      }
      .call-record {
        align-items: stretch;
        flex-direction: column;
      }
      .record-actions {
        justify-content: flex-start;
      }
    }
  `]
})
export class IncidentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private port = inject(IncidentPort);
  private callPort = inject(CallPort);
  private router = inject(Router);

  incidentId: string = '';
  incident: Incident | null = null;

  activeTab: DetailTab = 'details';
  isLoading: boolean = true;
  isNotFound: boolean = false;
  errorMsg: string | null = null;
  latestCall: CallTask | null = null;
  callContext: CallLaunchContext | null = null;
  callPanelLoading = false;
  callContextError: string | null = null;
  callStartError: string | null = null;
  callPrepared = false;
  callConfirmed = false;
  callStarting = false;
  private callIdempotencyKey: string | null = null;

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

  openCallTab(): void {
    this.activeTab = 'calls';
    this.loadCallPanel();
  }

  loadCallPanel(): void {
    if (!this.incidentId) return;
    this.callPanelLoading = true;
    this.callContextError = null;
    let pending = 2;
    const completeOne = () => {
      pending -= 1;
      if (pending === 0) this.callPanelLoading = false;
    };

    this.callPort.list({ incidentId: this.incidentId, limit: 1 }).subscribe({
      next: (result) => {
        this.latestCall = result.items[0] ?? null;
        completeOne();
      },
      error: (error) => {
        this.callContextError = callApiErrorMessage(error, 'Could not load this incident call history.');
        completeOne();
      }
    });

    this.callPort.launchContext().subscribe({
      next: (context) => {
        this.callContext = context;
        completeOne();
      },
      error: (error) => {
        this.callContextError = callApiErrorMessage(error, 'Could not verify the authorized call target.');
        completeOne();
      }
    });
  }

  get canPrepareCall(): boolean {
    return Boolean(this.callContext?.configured && this.callContext.contactId);
  }

  get canPrepareFollowUp(): boolean {
    return Boolean(this.latestCall?.status === 'completed' && this.canPrepareCall);
  }

  prepareCall(): void {
    if (!this.canPrepareCall) return;
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.randomUUID) {
      this.callStartError = 'This browser cannot create the required idempotency key.';
      return;
    }
    this.callIdempotencyKey = cryptoApi.randomUUID();
    this.callStartError = null;
    this.callConfirmed = false;
    this.callPrepared = true;
  }

  cancelCallPreparation(): void {
    this.callPrepared = false;
    this.callConfirmed = false;
    this.callStartError = null;
    this.callIdempotencyKey = null;
  }

  startAuthorizedCall(): void {
    const context = this.callContext;
    if (!this.callConfirmed || !context?.contactId || !this.callIdempotencyKey || this.callStarting) return;

    this.callStarting = true;
    this.callStartError = null;
    this.callPort.start({
      incidentId: this.incidentId,
      authorizedContactId: context.contactId,
      purpose: 'vendor_availability',
      timeoutSeconds: 300,
      retries: 0
    }, this.callIdempotencyKey).subscribe({
      next: (started) => {
        this.callStarting = false;
        void this.router.navigate(['/calls', started.callTaskId]);
      },
      error: (error) => {
        this.callStarting = false;
        this.callStartError = callApiErrorMessage(
          error,
          'The provider outcome is unknown. Do not submit another call; review the durable call task instead.'
        );
        this.loadCallPanel();
      }
    });
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
