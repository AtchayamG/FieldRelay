import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DispatchHttpAdapter } from '../data/dispatch-http.adapter';
import {
  DISPATCH_COLUMNS,
  Dispatch,
  DispatchStatus,
  NEXT_STATUS,
  STATUS_LABEL
} from '../domain/dispatch.model';

// The Dispatch Board closes the loop the rest of the app opens: an incident
// became a call, the call returned an answer, a person approved it, and this is
// where that decision becomes a vendor who is actually coming.
//
// It is a board rather than a table because the question an operator asks here
// is "where is everything right now", not "list me the records".
@Component({
  selector: 'fr-dispatch-board',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <section class="page">
      <header class="page__header">
        <div>
          <h1>Dispatch Board</h1>
          <p class="page__sub">
            Approved work, and where each vendor is. A dispatch can only exist
            because a person approved the call behind it.
          </p>
        </div>
        <div class="header-stat" *ngIf="!loading()">
          <span class="header-stat__value font-mono">{{ activeCount() }}</span>
          <span class="header-stat__label">Active</span>
        </div>
      </header>

      <p class="alert alert--danger" *ngIf="error()">{{ error() }}</p>

      <p class="muted" *ngIf="loading()">Loading the board…</p>

      <!-- An empty board is the ordinary state early in the day, not a fault. -->
      <div class="empty" *ngIf="!loading() && !error() && dispatches().length === 0">
        <fr-icon name="dispatch" [size]="22" />
        <p class="empty__title">Nothing is dispatched</p>
        <p class="empty__body">
          A job appears here once an approval is released. Approve a call in
          <a routerLink="/approvals">Approvals</a> first — FieldRelay will not send a
          vendor on an answer nobody has agreed to.
        </p>
      </div>

      <div class="board" *ngIf="!loading() && dispatches().length > 0">
        <section class="column" *ngFor="let column of columns">
          <header class="column__head">
            <div class="column__title-group">
              <span class="column__dot" [attr.data-status]="column.status"></span>
              <h2 class="column__title">{{ column.label }}</h2>
            </div>
            <span class="column__count font-mono">{{ inColumn(column.status).length }}</span>
          </header>
          <p class="column__hint">{{ column.hint }}</p>

          <div class="column__body">
            <p class="column__empty" *ngIf="inColumn(column.status).length === 0">—</p>

            <article class="job" *ngFor="let job of inColumn(column.status)">
              <div class="job__head">
                <span class="job__id font-mono">{{ job.displayId }}</span>
                <span class="job__vendor font-mono">{{ job.contactId }}</span>
              </div>

              <!-- Shown as the vendor said it. This string is never parsed. -->
              <p class="job__amount font-mono" *ngIf="job.quotedAmountText">
                {{ job.quotedAmountText }}
              </p>
              <p class="job__amount job__amount--none" *ngIf="!job.quotedAmountText">
                No price captured
              </p>

              <p class="job__meta">
                Released by {{ job.dispatchedBy }} · {{ relative(job.dispatchedAt) }}
              </p>

              <div class="job__actions" *ngIf="next(job.status).length > 0">
                <button
                  *ngFor="let target of next(job.status)"
                  type="button"
                  class="btn"
                  [class.btn--primary]="target !== 'cancelled'"
                  [class.btn--quiet]="target === 'cancelled'"
                  [disabled]="busyId() === job.id"
                  (click)="advance(job, target)"
                >
                  {{ target === 'cancelled' ? 'Cancel' : STATUS_LABEL[target] }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>

      <!-- Cancelled work is kept visible rather than hidden. Somebody was told
           not to come, and that is a fact the board should still show. -->
      <section class="cancelled" *ngIf="cancelled().length > 0">
        <h2 class="cancelled__title">Cancelled</h2>
        <ul class="cancelled__list">
          <li *ngFor="let job of cancelled()">
            <span class="font-mono">{{ job.displayId }}</span>
            <span class="cancelled__reason">{{ job.cancelledReason }}</span>
          </li>
        </ul>
      </section>
    </section>
  `,
  styles: [
    `
      .page {
        display: flex;
        flex-direction: column;
        gap: var(--fr-space-lg);
      }
      .page__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--fr-space-lg);
        flex-wrap: wrap;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 26px;
        font-weight: 600;
        letter-spacing: -0.02em;
        color: var(--fr-color-text);
      }
      .page__sub {
        margin: 0;
        max-width: 62ch;
        font-size: 13px;
        line-height: 1.55;
        color: var(--fr-color-muted);
      }
      .header-stat {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .header-stat__value {
        font-size: 24px;
        font-weight: 500;
        color: var(--fr-color-text);
        font-variant-numeric: tabular-nums;
      }
      .header-stat__label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: var(--fr-color-muted);
      }

      .alert {
        margin: 0;
        padding: var(--fr-space-sm) var(--fr-space-md);
        border-radius: var(--fr-tray-radius-inner);
        font-size: 13px;
      }
      .alert--danger {
        background: var(--fr-color-danger-soft);
        color: var(--fr-color-danger);
      }
      .muted {
        color: var(--fr-color-muted);
        font-size: 13px;
      }

      .empty {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 7px;
        padding: var(--fr-space-xl) var(--fr-space-lg);
        background: var(--fr-color-surface);
        border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius);
        box-shadow: var(--fr-shadow-tray), var(--fr-tray-inner-lip);
        color: var(--fr-color-muted);
      }
      .empty fr-icon {
        opacity: 0.4;
      }
      .empty__title {
        margin: 0;
        font-size: 15px;
        font-weight: 500;
        color: var(--fr-color-text);
      }
      .empty__body {
        margin: 0;
        max-width: 52ch;
        font-size: 13px;
        line-height: 1.55;
      }
      .empty__body a {
        color: var(--fr-color-primary-bright);
      }

      .board {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: var(--fr-space-md);
      }
      @media (max-width: 1100px) {
        .board {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 640px) {
        .board {
          grid-template-columns: 1fr;
        }
      }

      .column {
        background: var(--fr-color-surface);
        border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius);
        box-shadow: var(--fr-shadow-tray), var(--fr-tray-inner-lip);
        padding: var(--fr-space-md);
        min-width: 0;
      }
      .column__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--fr-space-xs);
      }
      .column__title-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .column__dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex: none;
        background: var(--fr-color-muted);
      }
      .column__dot[data-status='scheduled'] {
        background: var(--fr-color-info);
      }
      .column__dot[data-status='en_route'] {
        background: var(--fr-color-signal);
      }
      .column__dot[data-status='on_site'] {
        background: var(--fr-color-warning);
      }
      .column__dot[data-status='completed'] {
        background: var(--fr-color-success);
      }
      .column__title {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--fr-color-text);
      }
      .column__count {
        font-size: 12px;
        color: var(--fr-color-muted);
        font-variant-numeric: tabular-nums;
      }
      .column__hint {
        margin: 3px 0 var(--fr-space-sm) 14px;
        font-size: 11px;
        color: var(--fr-color-muted);
      }
      .column__body {
        display: flex;
        flex-direction: column;
        gap: var(--fr-space-xs);
      }
      .column__empty {
        margin: 0;
        padding: var(--fr-space-sm) 0;
        color: var(--fr-color-muted);
        font-size: 13px;
      }

      .job {
        background: var(--fr-color-surface2);
        border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius-inner);
        padding: var(--fr-space-sm) var(--fr-space-md);
        display: flex;
        flex-direction: column;
        gap: 5px;
        transition: border-color var(--fr-motion-fast) var(--fr-ease);
      }
      .job:hover {
        border-color: var(--fr-hairline-strong);
      }
      .job__head {
        display: flex;
        justify-content: space-between;
        gap: var(--fr-space-xs);
        align-items: baseline;
      }
      .job__id {
        font-size: 12px;
        font-weight: 500;
        color: var(--fr-color-text);
      }
      .job__vendor {
        font-size: 11px;
        color: var(--fr-color-muted);
      }
      .job__amount {
        margin: 0;
        font-size: 14px;
        color: var(--fr-color-text);
      }
      .job__amount--none {
        font-size: 12px;
        color: var(--fr-color-muted);
        font-style: normal;
      }
      .job__meta {
        margin: 0;
        font-size: 11px;
        line-height: 1.45;
        color: var(--fr-color-muted);
      }
      .job__actions {
        display: flex;
        gap: 6px;
        margin-top: 3px;
        flex-wrap: wrap;
      }

      .btn {
        font-size: 11.5px;
        font-weight: 500;
        padding: 5px 11px;
        border-radius: var(--fr-radius-sm);
        border: 1px solid var(--fr-hairline);
        background: transparent;
        color: var(--fr-color-text);
        cursor: pointer;
        transition: background var(--fr-motion-fast) var(--fr-ease),
          border-color var(--fr-motion-fast) var(--fr-ease);
      }
      .btn:hover:not(:disabled) {
        border-color: var(--fr-hairline-strong);
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn--primary {
        background: var(--fr-color-primary);
        border-color: transparent;
        color: var(--fr-color-on-accent);
      }
      .btn--quiet {
        color: var(--fr-color-muted);
      }

      .cancelled {
        background: var(--fr-color-surface);
        border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius);
        padding: var(--fr-space-md) var(--fr-space-lg);
      }
      .cancelled__title {
        margin: 0 0 var(--fr-space-xs);
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--fr-color-muted);
      }
      .cancelled__list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .cancelled__list li {
        display: flex;
        gap: var(--fr-space-sm);
        font-size: 12.5px;
        color: var(--fr-color-muted);
        align-items: baseline;
      }
      .cancelled__reason {
        color: var(--fr-color-text);
      }
    `
  ]
})
export class DispatchBoardComponent implements OnInit {
  private readonly api = inject(DispatchHttpAdapter);

  protected readonly columns = DISPATCH_COLUMNS;
  protected readonly STATUS_LABEL = STATUS_LABEL;

  protected readonly dispatches = signal<Dispatch[]>([]);
  protected readonly activeCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  public ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (result) => {
        this.dispatches.set(result.items);
        this.activeCount.set(result.activeCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The dispatch board could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  protected inColumn(status: DispatchStatus): Dispatch[] {
    return this.dispatches().filter((d) => d.status === status);
  }

  protected cancelled(): Dispatch[] {
    return this.dispatches().filter((d) => d.status === 'cancelled');
  }

  protected next(status: DispatchStatus): DispatchStatus[] {
    return NEXT_STATUS[status] ?? [];
  }

  protected advance(job: Dispatch, to: DispatchStatus): void {
    // Cancelling costs somebody a journey, so it asks for a reason rather than
    // going through on a single click. The server refuses a blank one anyway.
    let reason: string | undefined;
    if (to === 'cancelled') {
      const entered = window.prompt(`Why is ${job.displayId} being cancelled?`);
      if (entered === null || entered.trim().length === 0) {
        return;
      }
      reason = entered.trim();
    }

    this.busyId.set(job.id);
    this.error.set(null);
    this.api.advance(job.id, to, reason).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        // Surface what the API refused rather than swallowing it. The board can
        // be stale, and "that job already finished" is the useful message.
        this.error.set(err?.error?.error?.message ?? 'That change was not accepted.');
        this.busyId.set(null);
        this.load();
      }
    });
  }

  protected relative(iso: string): string {
    const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return `${Math.floor(seconds)}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
