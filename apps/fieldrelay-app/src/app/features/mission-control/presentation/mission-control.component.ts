import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MissionControlPort } from '../application/mission-control.port';
import { MissionControlDemoAdapter } from '../data/mission-control.adapter';
import { MissionControlData, PendingApproval, SystemStateMode } from '../domain/mission-control.types';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { StatusSwitchComponent } from '../../../shared/components/status-switch/status-switch.component';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-mission-control',
  standalone: true,
  imports: [
    CommonModule,
    MetricCardComponent,
    StatusBadgeComponent,
    StatusSwitchComponent
  ],
  providers: [
    { provide: MissionControlPort, useClass: MissionControlDemoAdapter }
  ],
  template: `
    <div class="mission-control-page" *ngIf="data$ | async as data">
      <!-- Header Bar & Operations Sub-bar -->
      <header class="page-header">
        <div class="header-main">
          <div class="header-titles">
            <h1 class="page-title">Mission Control</h1>
            <p class="page-subtitle">
              Simulated operational picture • Human-approved emergency voice workflows
            </p>
          </div>
          <div class="header-actions">
            <button
              type="button"
              class="action-btn primary-btn"
              (click)="onNewIncident()"
            >
              ⚡ New Incident Alert
            </button>
          </div>
        </div>

        <div class="header-sub-bar">
          <app-status-switch
            [currentMode]="data.stateMode"
            (modeChange)="onStateModeChange($event)"
          ></app-status-switch>
          <span class="last-updated font-mono">Synced: {{ data.lastUpdated }}</span>
        </div>
      </header>

      <!-- Realtime Disconnected Banner -->
      <div class="alert-banner warning-banner" *ngIf="data.stateMode === 'realtime-disconnected'">
        ⚠️ <strong>Realtime Gateway Disconnected:</strong> Displaying cached operational snapshot. Reconnecting in background...
      </div>

      <!-- Service Degraded Banner -->
      <div class="alert-banner danger-banner" *ngIf="data.stateMode === 'degraded'">
        🔴 <strong>Partial Service Degradation:</strong> Voice gateway high latency detected. Automated phone call tasks queued for manual review.
      </div>

      <!-- Loading State -->
      <div class="loading-state-container" *ngIf="data.stateMode === 'loading'">
        <div class="pulse-loader"></div>
        <p>Streaming operational metrics from FieldRelay Mesh...</p>
      </div>

      <!-- Empty State -->
      <div class="empty-state-container" *ngIf="data.stateMode === 'empty'">
        <div class="empty-icon">✅</div>
        <h2>All Operational Queues Clear</h2>
        <p>No active incidents or pending calls at this time.</p>
      </div>

      <!-- Main Operational Dashboard Grid (Shown for live, disconnected, degraded) -->
      <div class="dashboard-grid" *ngIf="data.stateMode !== 'loading' && data.stateMode !== 'empty'">
        <!-- SECTION 1: Critical Incident Metrics -->
        <section class="metrics-grid" aria-label="Critical Incident Metrics">
          <app-metric-card
            *ngFor="let metric of data.metrics"
            [label]="metric.label"
            [value]="metric.value"
            [change]="metric.change"
            [trend]="metric.trend"
            [semantic]="metric.semantic"
          ></app-metric-card>
        </section>

        <!-- SECTION 2: Incident Command Queue -->
        <section class="ops-card queue-section">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon">🚨</span>
              <h2 class="card-title">Incident Command Queue</h2>
            </div>
            <span class="badge-count font-mono">{{ data.incidents.length }} Active</span>
          </div>

          <!-- Desktop/Tablet View Table -->
          <div class="table-wrapper hide-mobile">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>INCIDENT ID</th>
                  <th>TITLE & LOCATION</th>
                  <th>PRIORITY</th>
                  <th>STATUS</th>
                  <th>SLA TIMER</th>
                  <th>UPDATED</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let inc of data.incidents">
                  <td class="font-mono inc-id">{{ inc.id }}</td>
                  <td>
                    <div class="inc-title">{{ inc.title }}</div>
                    <div class="inc-prop">{{ inc.property }}</div>
                  </td>
                  <td>
                    <app-status-badge [variant]="inc.priority">{{ inc.priority }}</app-status-badge>
                  </td>
                  <td>
                    <app-status-badge [variant]="inc.status">{{ inc.status }}</app-status-badge>
                  </td>
                  <td class="font-mono sla-cell">{{ inc.slaRemaining }}</td>
                  <td class="font-mono muted-cell">{{ inc.updatedAt }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards View -->
          <div class="mobile-incidents-list hide-desktop hide-tablet">
            <div class="mobile-inc-card" *ngFor="let inc of data.incidents">
              <div class="mobile-inc-header">
                <span class="font-mono inc-id">{{ inc.id }}</span>
                <app-status-badge [variant]="inc.priority">{{ inc.priority }}</app-status-badge>
              </div>
              <h3 class="mobile-inc-title">{{ inc.title }}</h3>
              <p class="mobile-inc-prop">{{ inc.property }}</p>
              <div class="mobile-inc-footer">
                <app-status-badge [variant]="inc.status">{{ inc.status }}</app-status-badge>
                <span class="font-mono sla-cell">{{ inc.slaRemaining }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 3: Live CALL-E Mission -->
        <section class="ops-card call-mission-section" *ngIf="data.liveCall as call">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon cyan-pulse">📞</span>
              <div>
                <h2 class="card-title">Live CALL-E Mission</h2>
                <div class="simulated-tag font-mono">
                  SIMULATED CALL-E AGENT MISSION • {{ call.callId }}
                </div>
              </div>
            </div>
            <div class="call-timer font-mono">⏱️ {{ call.duration }}</div>
          </div>

          <div class="call-mission-body">
            <!-- Waveform Animation -->
            <div class="waveform-box">
              <div class="vendor-name-row">
                <span class="vendor-title">{{ call.vendorName }}</span>
                <app-status-badge variant="live">{{ call.status }}</app-status-badge>
              </div>
              <div class="audio-waveform" aria-hidden="true">
                <span class="bar bar1"></span>
                <span class="bar bar2"></span>
                <span class="bar bar3"></span>
                <span class="bar bar4"></span>
                <span class="bar bar5"></span>
                <span class="bar bar6"></span>
                <span class="bar bar7"></span>
              </div>
            </div>

            <!-- Structured Outcome Summary -->
            <div class="structured-outcome-panel">
              <div class="panel-eyebrow font-mono">STRUCTURED OUTCOME ANALYSIS</div>
              <p class="outcome-summary">{{ call.structuredOutcome.summary }}</p>
              <div class="outcome-chips font-mono">
                <span class="chip">Est. Cost: {{ call.structuredOutcome.estimatedCost }}</span>
                <span class="chip">ETA: {{ call.structuredOutcome.estimatedArrival }}</span>
                <span class="chip confidence">Confidence: {{ (call.aiConfidence * 100).toFixed(0) }}%</span>
              </div>
            </div>

            <!-- Live AI Transcript Stream -->
            <div class="transcript-stream">
              <div class="stream-header font-mono">AI VOICE TRANSCRIPT STREAM</div>
              <div class="transcript-box">
                <div class="transcript-line" *ngFor="let t of call.transcript">
                  <span class="speaker-tag" [class.ai]="t.speaker.includes('AI')">{{ t.speaker }}:</span>
                  <span class="text">{{ t.text }}</span>
                  <span class="time font-mono">{{ t.timestamp }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 4: Orchestration Flow -->
        <section class="ops-card flow-section">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon">⚡</span>
              <h2 class="card-title">Orchestration Flow</h2>
            </div>
            <span class="badge-count font-mono">INC-2026-9041 Pipeline</span>
          </div>

          <div class="flow-stepper">
            <div
              class="step-node"
              *ngFor="let step of data.orchestration"
              [class.completed]="step.status === 'completed'"
              [class.active]="step.status === 'active'"
            >
              <div class="node-icon font-mono">{{ step.stepIndex }}</div>
              <div class="node-content">
                <div class="node-title">{{ step.name }}</div>
                <div class="node-desc">{{ step.description }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 5: Pending Approvals -->
        <section class="ops-card approvals-section">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon">⚖️</span>
              <h2 class="card-title">Pending Human Approvals</h2>
            </div>
            <span class="badge-count font-mono">{{ pendingApprovalCount(data.pendingApprovals) }} Pending</span>
          </div>

          <div class="approvals-list">
            <div class="approval-card" *ngFor="let app of data.pendingApprovals">
              <div class="approval-top">
                <div>
                  <span class="font-mono app-id">{{ app.id }}</span>
                  <span class="app-prop"> — {{ app.property }}</span>
                </div>
                <span class="app-amount font-mono">{{ app.amount }}</span>
              </div>
              <p class="app-reason">{{ app.reason }}</p>
              <div class="approval-actions" *ngIf="app.status === 'PENDING'">
                <button
                  type="button"
                  class="btn-approve"
                  (click)="onApprove(app.id)"
                >
                  ✓ Approve Expense
                </button>
                <button
                  type="button"
                  class="btn-reject"
                  (click)="onReject(app.id)"
                >
                  ✕ Reject
                </button>
              </div>
              <div class="approval-decided font-mono" *ngIf="app.status !== 'PENDING'" [class.approved]="app.status === 'APPROVED'">
                DECISION: {{ app.status }}
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 6: System Activity Feed -->
        <section class="ops-card activity-section">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon">📜</span>
              <h2 class="card-title">System Activity Log</h2>
            </div>
          </div>

          <div class="activity-feed">
            <div class="activity-row" *ngFor="let ev of data.activityFeed">
              <span class="ev-time font-mono">{{ ev.timestamp }}</span>
              <span class="ev-msg">{{ ev.message }}</span>
            </div>
          </div>
        </section>

        <!-- SECTION 7: Operational Performance -->
        <section class="ops-card performance-section">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon">📊</span>
              <h2 class="card-title">Operational Performance</h2>
            </div>
          </div>

          <div class="perf-metrics-container font-mono">
            <div class="perf-bar-group">
              <div class="perf-label">SLA Compliance ({{ data.performance.slaCompliancePercent }}%)</div>
              <div class="bar-bg">
                <div class="bar-fill success" [style.width.%]="data.performance.slaCompliancePercent"></div>
              </div>
            </div>

            <div class="perf-bar-group">
              <div class="perf-label">Automated Resolution ({{ data.performance.automatedResolutionRate }}%)</div>
              <div class="bar-bg">
                <div class="bar-fill primary" [style.width.%]="data.performance.automatedResolutionRate"></div>
              </div>
            </div>

            <div class="perf-bar-group">
              <div class="perf-label">Vendor Dispatch Success ({{ data.performance.dispatchSuccessRate }}%)</div>
              <div class="bar-bg">
                <div class="bar-fill cyan" [style.width.%]="data.performance.dispatchSuccessRate"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .mission-control-page {
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
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
      border: none;
      padding: 10px 18px;
      border-radius: var(--fr-radius-md);
      font-size: 13px;
      font-weight: 700;
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
    .header-sub-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--fr-space-md);
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      padding: var(--fr-space-xs) var(--fr-space-md);
      border-radius: var(--fr-radius-md);
      flex-wrap: wrap;
    }
    .last-updated {
      font-size: 11px;
      color: var(--fr-color-muted);
    }
    .alert-banner {
      padding: var(--fr-space-md);
      border-radius: var(--fr-radius-md);
      font-size: 13px;
    }
    .warning-banner {
      background: var(--fr-color-warning-soft);
      border: 1px solid var(--fr-color-warning);
      color: var(--fr-color-warning);
    }
    .danger-banner {
      background: var(--fr-color-danger-soft);
      border: 1px solid var(--fr-color-danger);
      color: var(--fr-color-danger);
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
      width: 48px;
      height: 48px;
      border: 4px solid var(--fr-color-border);
      border-top-color: var(--fr-color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: var(--fr-space-lg);
    }
    .metrics-grid {
      grid-column: span 12;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--fr-space-md);
    }
    @media (max-width: 1279px) {
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 430px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
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
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--fr-color-border);
      padding-bottom: var(--fr-space-sm);
    }
    .card-title-group {
      display: flex;
      align-items: center;
      gap: var(--fr-space-xs);
    }
    .card-icon {
      font-size: 18px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fr-color-text);
    }
    .simulated-tag {
      font-size: 10px;
      font-weight: 700;
      color: var(--fr-color-cyan);
      letter-spacing: 0.5px;
    }
    .badge-count {
      font-size: 11px;
      font-weight: 700;
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      padding: 2px 8px;
      border-radius: var(--fr-radius-sm);
    }
    .queue-section {
      grid-column: span 8;
    }
    .call-mission-section {
      grid-column: span 4;
    }
    @media (max-width: 1279px) {
      .queue-section, .call-mission-section {
        grid-column: span 12;
      }
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
    .inc-title {
      font-weight: 600;
      color: var(--fr-color-text);
    }
    .inc-prop {
      font-size: 11px;
      color: var(--fr-color-muted);
    }
    .sla-cell {
      font-size: 12px;
      color: var(--fr-color-warning);
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
      gap: 6px;
    }
    .mobile-inc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mobile-inc-title {
      font-size: 14px;
      font-weight: 700;
    }
    .mobile-inc-prop {
      font-size: 12px;
      color: var(--fr-color-muted);
    }
    .mobile-inc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
    }
    .waveform-box {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-xs);
    }
    .vendor-name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .vendor-title {
      font-size: 14px;
      font-weight: 700;
    }
    .audio-waveform {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 32px;
    }
    .audio-waveform .bar {
      flex: 1;
      background: var(--fr-color-cyan);
      border-radius: 2px;
      animation: wave 1.2s ease-in-out infinite alternate;
    }
    .bar1 { height: 40%; animation-delay: 0.1s; }
    .bar2 { height: 80%; animation-delay: 0.3s; }
    .bar3 { height: 100%; animation-delay: 0.2s; }
    .bar4 { height: 60%; animation-delay: 0.4s; }
    .bar5 { height: 90%; animation-delay: 0.15s; }
    .bar6 { height: 50%; animation-delay: 0.25s; }
    .bar7 { height: 75%; animation-delay: 0.35s; }
    @keyframes wave {
      0% { transform: scaleY(0.3); }
      100% { transform: scaleY(1); }
    }
    .structured-outcome-panel {
      background: var(--fr-color-surface3);
      border: 1px solid var(--fr-color-border);
      border-left: 3px solid var(--fr-color-cyan);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-xs);
    }
    .panel-eyebrow {
      font-size: 10px;
      font-weight: 700;
      color: var(--fr-color-cyan);
      letter-spacing: 0.5px;
    }
    .outcome-summary {
      font-size: 12px;
      color: var(--fr-color-text);
      line-height: 1.4;
    }
    .outcome-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 10px;
    }
    .chip {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      padding: 3px 8px;
      border-radius: var(--fr-radius-sm);
    }
    .chip.confidence {
      color: var(--fr-color-success);
    }
    .transcript-stream {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stream-header {
      font-size: 10px;
      color: var(--fr-color-muted);
      letter-spacing: 0.5px;
    }
    .transcript-box {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-xs);
      max-height: 160px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .transcript-line {
      font-size: 11px;
      line-height: 1.3;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .speaker-tag {
      font-weight: 700;
      color: var(--fr-color-muted);
    }
    .speaker-tag.ai {
      color: var(--fr-color-primary-bright);
    }
    .transcript-line .time {
      margin-left: auto;
      font-size: 9px;
      color: var(--fr-color-muted);
    }
    .flow-section {
      grid-column: span 6;
    }
    .approvals-section {
      grid-column: span 6;
    }
    @media (max-width: 1279px) {
      .flow-section, .approvals-section {
        grid-column: span 12;
      }
    }
    .flow-stepper {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-sm);
    }
    .step-node {
      display: flex;
      align-items: center;
      gap: var(--fr-space-md);
      padding: var(--fr-space-xs);
      border-radius: var(--fr-radius-md);
      opacity: 0.5;
    }
    .step-node.completed, .step-node.active {
      opacity: 1;
    }
    .node-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--fr-color-surface3);
      border: 1px solid var(--fr-color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
    }
    .step-node.completed .node-icon {
      background: var(--fr-color-success);
      color: var(--fr-color-on-accent);
      border-color: var(--fr-color-success);
    }
    .step-node.active .node-icon {
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
      border-color: var(--fr-color-primary-bright);
      box-shadow: 0 0 10px var(--fr-color-primary);
    }
    .node-title {
      font-size: 13px;
      font-weight: 700;
    }
    .node-desc {
      font-size: 11px;
      color: var(--fr-color-muted);
    }
    .approvals-list {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .approval-card {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      border-left: 4px solid var(--fr-color-warning);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .approval-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .app-id {
      font-weight: 700;
      color: var(--fr-color-primary-bright);
    }
    .app-amount {
      font-size: 15px;
      font-weight: 700;
      color: var(--fr-color-warning);
    }
    .app-reason {
      font-size: 12px;
      color: var(--fr-color-muted);
      line-height: 1.4;
    }
    .approval-actions {
      display: flex;
      gap: var(--fr-space-sm);
      margin-top: 6px;
    }
    .btn-approve {
      background: var(--fr-color-success);
      color: var(--fr-color-on-accent);
      border: none;
      padding: 6px 14px;
      border-radius: var(--fr-radius-sm);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-reject {
      background: transparent;
      border: 1px solid var(--fr-color-danger);
      color: var(--fr-color-danger);
      padding: 6px 14px;
      border-radius: var(--fr-radius-sm);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .approval-decided {
      font-size: 11px;
      font-weight: 700;
      color: var(--fr-color-danger);
    }
    .approval-decided.approved {
      color: var(--fr-color-success);
    }
    .activity-section {
      grid-column: span 6;
    }
    .performance-section {
      grid-column: span 6;
    }
    @media (max-width: 1279px) {
      .activity-section, .performance-section {
        grid-column: span 12;
      }
    }
    .activity-feed {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-xs);
    }
    .activity-row {
      display: flex;
      gap: var(--fr-space-sm);
      font-size: 12px;
      padding: 6px 0;
      border-bottom: 1px solid var(--fr-color-surface2);
    }
    .ev-time {
      color: var(--fr-color-muted);
      font-size: 11px;
    }
    .ev-msg {
      color: var(--fr-color-text);
    }
    .perf-metrics-container {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .perf-bar-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .perf-label {
      font-size: 12px;
      color: var(--fr-color-muted);
    }
    .bar-bg {
      height: 8px;
      background: var(--fr-color-surface2);
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 4px;
    }
    .bar-fill.success { background: var(--fr-color-success); }
    .bar-fill.primary { background: var(--fr-color-primary); }
    .bar-fill.cyan { background: var(--fr-color-cyan); }
  `]
})
export class MissionControlComponent implements OnInit {
  private port = inject(MissionControlPort);
  private router = inject(Router, { optional: true });
  data$!: Observable<MissionControlData>;

  ngOnInit(): void {
    this.data$ = this.port.getMissionControlState();
  }

  onNewIncident(): void {
    this.router?.navigate(['/incidents/new']);
  }

  onStateModeChange(mode: SystemStateMode): void {
    this.port.setSystemStateMode(mode);
  }

  onApprove(id: string): void {
    this.port.approveRequest(id);
  }

  onReject(id: string): void {
    this.port.rejectRequest(id);
  }

  pendingApprovalCount(approvals: PendingApproval[]): number {
    return approvals.filter((approval) => approval.status === 'PENDING').length;
  }
}
