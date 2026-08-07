import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InsightsHttpAdapter, Technician } from '../data/insights-http.adapter';
import { INSIGHTS_STYLES } from './shared-insights.css';

// FieldRelay does not maintain a staff directory, and this screen does not
// pretend otherwise.
//
// The roster is derived entirely from who appears in the operational record —
// the reportedBy field on incidents that actually exist. Everyone listed has
// really done something, and every number is a count of rows.
//
// The alternative was a seeded list of fictional technicians with fictional
// availability and fictional utilisation bars. It would have filled the screen
// and meant nothing, which is the same mistake as SLA Compliance (0%).
@Component({
  selector: 'fr-technicians',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <section class="page">
      <header class="page__header">
        <div>
          <h1>Technicians</h1>
          <p class="page__sub">
            The people who appear in FieldRelay's operational record, and what they are
            currently carrying. Derived from incidents that exist, not from a staff list.
          </p>
        </div>
        <div class="header-stat" *ngIf="!loading() && !error()">
          <span class="header-stat__value font-mono">{{ people().length }}</span>
          <span class="header-stat__label">On the record</span>
        </div>
      </header>

      <p class="notice">
        <fr-icon name="shield" [size]="16" />
        <span>
          FieldRelay has no HR integration and does not hold a staff directory. This list
          is assembled from the <code>reportedBy</code> field on real incidents, so somebody
          who has not yet raised one will not appear here. That is a limitation, stated
          rather than papered over with placeholder names.
        </span>
      </p>

      <p class="alert alert--danger" *ngIf="error()">{{ error() }}</p>
      <p class="muted" *ngIf="loading()">Reading the record…</p>

      <div class="empty" *ngIf="!loading() && !error() && people().length === 0">
        <fr-icon name="technicians" [size]="22" />
        <p class="pending__title">Nobody is on the record yet</p>
        <p class="pending__lead">
          A name appears here once that person raises an incident.
          <a routerLink="/incidents/new">Raise one</a> and this list fills itself.
        </p>
      </div>

      <div class="grid" *ngIf="!loading() && people().length > 0">
        <section class="panel" *ngFor="let person of people()">
          <header class="person__head">
            <span class="person__name">{{ person.name }}</span>
            <span class="person__load" [class.person__load--clear]="person.openIncidents === 0">
              {{ person.openIncidents }} open
            </span>
          </header>

          <div class="rows">
            <div class="row">
              <span class="row__key">Incidents raised</span>
              <span class="row__count font-mono">{{ person.incidentsRaised }}</span>
            </div>
            <div class="row" *ngFor="let bucket of person.statusBreakdown">
              <span class="row__key">{{ label(bucket.key) }}</span>
              <span class="row__count font-mono">{{ bucket.count }}</span>
            </div>
          </div>

          <p class="panel__note" *ngIf="person.lastActiveAt">
            Last activity {{ person.lastActiveAt | date: 'medium' }}
          </p>
        </section>
      </div>

      <p class="footnote" *ngIf="!loading() && !error()">
        Derived from {{ derivedFrom() }} incident rows{{ truncated() ? ', truncated at the scan limit' : '' }}.
      </p>
    </section>
  `,
  styles: [
    INSIGHTS_STYLES,
    `
      .person__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--fr-space-sm);
      }
      .person__name {
        font-size: 15px;
        font-weight: 500;
        color: var(--fr-color-text);
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .person__load {
        font-size: 11.5px;
        font-weight: 500;
        padding: 3px 9px;
        border-radius: var(--fr-radius-pill);
        border: 1px solid color-mix(in srgb, var(--fr-color-warning) 40%, transparent);
        color: var(--fr-color-warning);
        white-space: nowrap;
        flex: none;
      }
      .person__load--clear {
        border-color: color-mix(in srgb, var(--fr-color-success) 40%, transparent);
        color: var(--fr-color-success);
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        padding: var(--fr-space-xl) var(--fr-space-lg);
        background: var(--fr-color-surface);
        border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius);
        box-shadow: var(--fr-shadow-tray), var(--fr-tray-inner-lip);
      }
      .empty fr-icon {
        opacity: 0.4;
      }
      .empty a {
        color: var(--fr-color-primary-bright);
      }
      code {
        font-family: var(--fr-font-technical);
        font-size: 0.94em;
      }
    `
  ]
})
export class TechniciansComponent implements OnInit {
  private readonly api = inject(InsightsHttpAdapter);

  protected readonly people = signal<Technician[]>([]);
  protected readonly derivedFrom = signal(0);
  protected readonly truncated = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    this.api.technicians().subscribe({
      next: (result) => {
        this.people.set(result.items);
        this.derivedFrom.set(result.derivedFromIncidents);
        this.truncated.set(result.truncated);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The roster could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  protected label(key: string): string {
    return key.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
  }
}
