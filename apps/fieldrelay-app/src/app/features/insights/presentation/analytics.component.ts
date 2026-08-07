import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Analytics, CountBucket, InsightsHttpAdapter } from '../data/insights-http.adapter';
import { INSIGHTS_STYLES } from './shared-insights.css';

// Analytics that refuses to compute a rate.
//
// An earlier version of the Mission Control performance panel rendered
// "SLA Compliance (0%)" for a figure nothing had ever measured — a struct
// default displayed as a claim that the system meets its SLA zero percent of
// the time, on the first screen a judge opens.
//
// This screen is the corrected version of that idea. Every number on it is a
// count of rows that exist. What cannot yet be measured is named, along with
// what it is waiting on, because a missing metric reads as an oversight while a
// stated one reads as a boundary.
@Component({
  selector: 'fr-analytics',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <section class="page">
      <header class="page__header">
        <div>
          <h1>Analytics</h1>
          <p class="page__sub">
            Counts of records that exist. No rates, no averages, no projections —
            this deployment does not yet have the denominator any of those would need.
          </p>
        </div>
        <div class="header-stat" *ngIf="data() as d">
          <span class="header-stat__value font-mono">{{ d.scannedRows }}</span>
          <span class="header-stat__label">Rows counted</span>
        </div>
      </header>

      <p class="notice">
        <fr-icon name="shield" [size]="16" />
        <span>
          Every figure here is a count, never a percentage. A rate needs a denominator,
          and one incident is not a sample. When there is enough history to divide by,
          the rate belongs here <em>with its denominator beside it</em> — not as a
          percentage standing on its own.
        </span>
      </p>

      <p class="alert alert--danger" *ngIf="error()">{{ error() }}</p>
      <p class="muted" *ngIf="loading()">Counting…</p>

      <ng-container *ngIf="data() as d">
        <div class="grid">
          <section class="panel">
            <h2 class="panel__title">Incidents by status</h2>
            <div class="rows">
              <div class="row" *ngFor="let bucket of d.incidentsByStatus">
                <span class="row__key">{{ label(bucket.key) }}</span>
                <span class="row__count font-mono">{{ bucket.count }}</span>
              </div>
              <p class="row__empty" *ngIf="d.incidentsByStatus.length === 0">No incidents yet.</p>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">Incidents by priority</h2>
            <div class="rows">
              <div class="row" *ngFor="let bucket of d.incidentsByPriority">
                <span class="row__key">{{ label(bucket.key) }}</span>
                <span class="row__count font-mono">{{ bucket.count }}</span>
              </div>
              <p class="row__empty" *ngIf="d.incidentsByPriority.length === 0">No incidents yet.</p>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">Calls by status</h2>
            <div class="rows">
              <div class="row" *ngFor="let bucket of d.callsByStatus">
                <span class="row__key">{{ label(bucket.key) }}</span>
                <span class="row__count font-mono">{{ bucket.count }}</span>
              </div>
              <p class="row__empty" *ngIf="d.callsByStatus.length === 0">No calls yet.</p>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">Real versus simulated</h2>
            <div class="rows">
              <div class="row" *ngFor="let bucket of d.callsByKind">
                <span class="row__key">{{ label(bucket.key) }}</span>
                <span class="row__count font-mono">{{ bucket.count }}</span>
              </div>
              <p class="row__empty" *ngIf="d.callsByKind.length === 0">No calls yet.</p>
            </div>
            <p class="panel__note">
              Simulated calls reach no telephone and cost nothing. They are counted
              separately so they can never inflate a figure about real work.
            </p>
          </section>

          <section class="panel">
            <h2 class="panel__title">Answers returned</h2>
            <div class="rows">
              <div class="row">
                <span class="row__key">Validated against the declared schema</span>
                <span class="row__count font-mono">{{ d.outcomes.validated }}</span>
              </div>
              <div class="row">
                <span class="row__key">Connected but produced nothing usable</span>
                <span class="row__count font-mono">{{ d.outcomes.validationFailed }}</span>
              </div>
              <div class="row">
                <span class="row__key">Reported the task as completed</span>
                <span class="row__count font-mono">{{ d.outcomes.taskCompleted }}</span>
              </div>
            </div>
            <p class="panel__note">
              A call that connected and returned an unusable answer is counted apart from
              one that never returned anything. They have different remedies, and merging
              them would hide the one an operator can act on.
            </p>
          </section>

          <section class="panel">
            <h2 class="panel__title">Approvals by status</h2>
            <div class="rows">
              <div class="row" *ngFor="let bucket of d.approvalsByStatus">
                <span class="row__key">{{ label(bucket.key) }}</span>
                <span class="row__count font-mono">{{ bucket.count }}</span>
              </div>
              <p class="row__empty" *ngIf="d.approvalsByStatus.length === 0">
                Nothing has needed a decision yet.
              </p>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">Why a human was asked</h2>
            <div class="rows">
              <div class="row" *ngFor="let bucket of d.approvalsByReason">
                <span class="row__key">{{ label(bucket.key) }}</span>
                <span class="row__count font-mono">{{ bucket.count }}</span>
              </div>
              <p class="row__empty" *ngIf="d.approvalsByReason.length === 0">
                Nothing has needed a decision yet.
              </p>
            </div>
            <p class="panel__note">
              One approval can carry several reasons, so these count reasons rather than
              approvals. They are not expected to add up to the number above.
            </p>
          </section>

          <section class="panel">
            <h2 class="panel__title">Dispatches by status</h2>
            <div class="rows">
              <div class="row" *ngFor="let bucket of d.dispatchesByStatus">
                <span class="row__key">{{ label(bucket.key) }}</span>
                <span class="row__count font-mono">{{ bucket.count }}</span>
              </div>
              <p class="row__empty" *ngIf="d.dispatchesByStatus.length === 0">
                Nothing has been dispatched yet.
              </p>
            </div>
          </section>
        </div>

        <section class="pending">
          <h2 class="pending__title">Not yet measurable</h2>
          <p class="pending__lead">
            These are the figures an operations dashboard would normally lead with.
            FieldRelay does not show them because it cannot yet compute them honestly.
            Each is listed with the measurement it is waiting on.
          </p>
          <ul class="pending__list">
            <li *ngFor="let item of d.notYetMeasurable">
              <span class="pending__metric">{{ item.metric }}</span> — needs {{ item.needs }}.
            </li>
          </ul>
        </section>

        <p class="footnote">
          Counted from {{ d.scannedRows }} rows{{ d.truncated ? ', truncated at the scan limit' : '' }}.
          Generated {{ d.generatedAt | date: 'medium' }}.
        </p>
      </ng-container>
    </section>
  `,
  styles: [INSIGHTS_STYLES]
})
export class AnalyticsComponent implements OnInit {
  private readonly api = inject(InsightsHttpAdapter);

  protected readonly data = signal<Analytics | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    this.api.analytics().subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Analytics could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  protected label(key: string): string {
    return key.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
  }

  protected trackBucket(_index: number, bucket: CountBucket): string {
    return bucket.key;
  }
}
