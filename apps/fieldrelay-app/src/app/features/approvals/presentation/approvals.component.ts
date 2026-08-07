import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DispatchHttpAdapter } from '../../dispatch/data/dispatch-http.adapter';
import { ApprovalHttpAdapter } from '../data/approval-http.adapter';
import { Approval, ApprovalStatus } from '../domain/approval.model';

@Component({
  selector: 'fr-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1>Approvals</h1>
          <p class="page__sub">
            Decisions a person must make before FieldRelay acts on what a call discovered.
          </p>
        </div>
        <span class="pending-chip" *ngIf="pendingCount() > 0">
          {{ pendingCount() }} awaiting decision
        </span>
      </header>

      <nav class="filters" aria-label="Filter approvals by status">
        <button
          type="button"
          *ngFor="let option of filters"
          class="filter"
          [class.filter--active]="status() === option.value"
          (click)="setStatus(option.value)"
        >
          {{ option.label }}
        </button>
      </nav>

      @if (loading()) {
        <p class="muted">Loading approvals…</p>
      } @else if (error()) {
        <p class="alert alert--danger">
          <fr-icon name="alert" [size]="16" />
          <span>{{ error() }}</span>
        </p>
      } @else if (approvals().length === 0) {
        <div class="empty">
          <fr-icon name="check-circle" [size]="42" [strokeWidth]="1.4" />
          <h2>{{ status() === 'pending' ? 'Nothing awaiting a decision' : 'No approvals here' }}</h2>
          <p>
            An approval appears when a call returns an answer that commits money, arrives with low
            confidence, comes back incomplete, or fails to achieve what it was placed for.
          </p>
        </div>
      } @else {
        <ul class="list">
          <li class="card" *ngFor="let approval of approvals(); trackBy: trackById">
            <header class="card__head">
              <div>
                <span class="card__id font-mono">{{ approval.displayId }}</span>
                <span class="card__status" [class]="'card__status--' + approval.status">
                  {{ approval.status | uppercase }}
                </span>
              </div>
              <a class="card__link" [routerLink]="['/calls', approval.callTaskId]">
                View call
                <fr-icon name="chevron-right" [size]="14" />
              </a>
            </header>

            <!-- Why a person is being asked. Shown before the answer, because
                 it frames what they are looking at. -->
            <ul class="reasons">
              <li *ngFor="let text of approval.reasonText">
                <fr-icon name="info" [size]="14" />
                <span>{{ text }}</span>
              </li>
            </ul>

            <dl class="answer" *ngIf="approval.outcome as outcome">
              <div class="answer__field" *ngFor="let entry of fields(outcome.structuredResult)">
                <dt>{{ label(entry.key) }}</dt>
                <dd class="font-mono">{{ entry.value }}</dd>
              </div>
              <div class="answer__field" *ngIf="outcome.confidenceLabel">
                <dt>Confidence</dt>
                <dd class="font-mono">
                  {{ outcome.confidenceLabel | uppercase }}
                  <span *ngIf="outcome.confidenceScore !== null">· {{ outcome.confidenceScore }}</span>
                </dd>
              </div>
            </dl>

            @if (approval.status === 'pending') {
              <div class="decide">
                <label class="decide__note">
                  <span>Reason for the decision (optional)</span>
                  <input
                    type="text"
                    [ngModel]="notes()[approval.id] ?? ''"
                    (ngModelChange)="setNote(approval.id, $event)"
                    [ngModelOptions]="{ standalone: true }"
                    maxlength="500"
                    placeholder="Recorded against your name in the audit trail"
                  />
                </label>
                <div class="decide__actions">
                  <button
                    type="button"
                    class="btn btn--approve"
                    [disabled]="deciding() === approval.id"
                    (click)="decide(approval, 'approved')"
                  >
                    <fr-icon name="check" [size]="15" [strokeWidth]="2.2" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn--reject"
                    [disabled]="deciding() === approval.id"
                    (click)="decide(approval, 'rejected')"
                  >
                    <fr-icon name="close" [size]="15" [strokeWidth]="2.2" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            } @else {
              <p class="decided">
                <fr-icon [name]="approval.status === 'approved' ? 'check-circle' : 'forbidden'" [size]="15" />
                <span>
                  {{ approval.status === 'approved' ? 'Approved' : 'Rejected' }} by
                  {{ approval.decidedBy }} on {{ approval.decidedAt | date: 'medium' }}
                  <ng-container *ngIf="approval.decisionNote">— “{{ approval.decisionNote }}”</ng-container>
                </span>
              </p>

              <!-- Approving records a decision; it does not send anyone. Releasing
                   the vendor is a separate, deliberate second action, so nobody
                   travels because a button did two things at once. -->
              <div class="release" *ngIf="approval.status === 'approved'">
                <button
                  type="button"
                  class="btn btn--release"
                  [disabled]="releasing() === approval.id"
                  (click)="release(approval)"
                >
                  <fr-icon name="dispatch" [size]="15" [strokeWidth]="2" />
                  <span>{{ releasing() === approval.id ? 'Releasing…' : 'Release to vendor' }}</span>
                </button>
                <span class="release__hint">
                  Sends this job to the Dispatch Board. Releasing twice cannot send two vendors.
                </span>
              </div>
            }

            <p class="card__error" *ngIf="decisionError()[approval.id]" role="alert">
              <fr-icon name="alert" [size]="14" />
              <span>{{ decisionError()[approval.id] }}</span>
            </p>
          </li>
        </ul>
      }
    </section>
  `,
  styles: [
    `
      .page { padding: var(--fr-space-lg); max-width: 1080px; }
      .page__head {
        display: flex; justify-content: space-between; align-items: flex-start;
        gap: var(--fr-space-md); flex-wrap: wrap;
      }
      h1 { margin: 0; font-size: 1.6rem; color: var(--fr-color-text); }
      .page__sub { margin: var(--fr-space-2xs) 0 0; color: var(--fr-color-muted); }
      .pending-chip {
        border-radius: var(--fr-radius-pill); padding: 6px 14px; font-size: 12px;
        font-weight: 700; color: var(--fr-color-warning);
        border: 1px solid var(--fr-color-warning); background: var(--fr-color-warning-soft);
        white-space: nowrap;
      }
      .filters { display: flex; gap: var(--fr-space-xs); margin: var(--fr-space-lg) 0; flex-wrap: wrap; }
      .filter {
        border: 1px solid var(--fr-color-border); background: var(--fr-color-surface2);
        color: var(--fr-color-muted); border-radius: var(--fr-radius-pill);
        padding: 6px 16px; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .filter--active {
        color: var(--fr-color-on-accent); background: var(--fr-color-primary);
        border-color: var(--fr-color-primary);
      }
      .list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--fr-space-md); }
      /* No side-tab. Every card in this list is an approval, so a warning bar on
         all of them carried no information — it only announced the framework.
         The reason text above the answer is what actually signals urgency. */
      .card {
        background: var(--fr-color-surface); border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius);
        box-shadow: var(--fr-shadow-tray), var(--fr-tray-inner-lip);
        padding: var(--fr-space-lg); display: grid; gap: var(--fr-space-md);
        transition: border-color var(--fr-motion-normal) var(--fr-ease);
      }
      .card:hover { border-color: var(--fr-hairline-strong); }
      .card__head { display: flex; justify-content: space-between; align-items: center; gap: var(--fr-space-md); flex-wrap: wrap; }
      .card__id { font-weight: 700; color: var(--fr-color-text); margin-right: var(--fr-space-sm); }
      .card__status {
        font-size: 10px; font-weight: 700; letter-spacing: 0.4px; padding: 3px 10px;
        border-radius: var(--fr-radius-pill); border: 1px solid var(--fr-color-border);
        color: var(--fr-color-muted);
      }
      .card__status--pending { color: var(--fr-color-warning); border-color: var(--fr-color-warning); }
      .card__status--approved { color: var(--fr-color-success); border-color: var(--fr-color-success); }
      .card__status--rejected { color: var(--fr-color-danger); border-color: var(--fr-color-danger); }
      .release {
        display: flex; align-items: center; gap: var(--fr-space-sm);
        flex-wrap: wrap; margin-top: var(--fr-space-xs);
      }
      .btn--release {
        display: inline-flex; align-items: center; gap: 7px;
        background: var(--fr-color-primary); color: var(--fr-color-on-accent);
        border: none; padding: 8px 15px; border-radius: var(--fr-radius-sm);
        font-size: 12.5px; font-weight: 600; cursor: pointer;
        box-shadow: var(--fr-shadow-primary);
        transition: background var(--fr-motion-fast) var(--fr-ease);
      }
      .btn--release:disabled { opacity: 0.6; cursor: not-allowed; }
      .release__hint { font-size: 11.5px; color: var(--fr-color-muted); }
      .card__link {
        display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
        color: var(--fr-color-primary-bright); text-decoration: none; font-weight: 600;
      }
      .reasons { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
      .reasons li {
        display: flex; gap: 8px; align-items: flex-start;
        font-size: 13px; color: var(--fr-color-text);
      }
      .reasons fr-icon { color: var(--fr-color-warning); margin-top: 2px; flex-shrink: 0; }
      .answer {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: var(--fr-space-md); margin: 0; padding: var(--fr-space-md);
        background: var(--fr-color-surface2); border-radius: var(--fr-radius-md);
      }
      .answer__field dt {
        font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
        text-transform: uppercase; color: var(--fr-color-muted);
      }
      .answer__field dd { margin: 4px 0 0; font-size: 15px; color: var(--fr-color-text); word-break: break-word; }
      .decide { display: grid; gap: var(--fr-space-sm); }
      .decide__note { display: grid; gap: 4px; font-size: 12px; color: var(--fr-color-muted); }
      .decide__note input {
        padding: var(--fr-space-sm); border-radius: var(--fr-radius-sm);
        border: 1px solid var(--fr-color-border); background: var(--fr-color-surface2);
        color: var(--fr-color-text); font-family: inherit; font-size: 13px;
      }
      .decide__actions { display: flex; gap: var(--fr-space-sm); flex-wrap: wrap; }
      .btn {
        display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
        border-radius: var(--fr-radius-sm); padding: 8px 18px;
        font-size: 13px; font-weight: 700; border: 1px solid transparent;
      }
      .btn--approve { background: var(--fr-color-success); color: var(--fr-color-on-accent); }
      .btn--reject {
        background: transparent; color: var(--fr-color-danger);
        border-color: var(--fr-color-danger);
      }
      .btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .decided, .card__error {
        display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12.5px;
      }
      .decided { color: var(--fr-color-muted); }
      .card__error { color: var(--fr-color-danger); }
      .empty {
        display: grid; justify-items: center; gap: var(--fr-space-sm);
        text-align: center; padding: var(--fr-space-2xl) var(--fr-space-lg);
        border: 1px dashed var(--fr-color-border); border-radius: var(--fr-radius-lg);
        color: var(--fr-color-muted);
      }
      .empty fr-icon { color: var(--fr-color-success); }
      .empty h2 { margin: 0; font-size: 1.1rem; color: var(--fr-color-text); }
      .empty p { margin: 0; max-width: 52ch; font-size: 13px; }
      .muted { color: var(--fr-color-muted); }
      .alert {
        display: flex; align-items: center; gap: 8px; padding: var(--fr-space-sm) var(--fr-space-md);
        border-radius: var(--fr-radius-sm); border: 1px solid var(--fr-color-danger);
        background: var(--fr-color-danger-soft); color: var(--fr-color-danger); font-size: 13px;
      }
    `
  ]
})
export class ApprovalsComponent implements OnInit {
  private readonly api = inject(ApprovalHttpAdapter);
  private readonly dispatchApi = inject(DispatchHttpAdapter);
  private readonly router = inject(Router);

  readonly filters: Array<{ label: string; value: ApprovalStatus }> = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' }
  ];

  readonly approvals = signal<Approval[]>([]);
  readonly pendingCount = signal(0);
  readonly status = signal<ApprovalStatus>('pending');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deciding = signal<string | null>(null);
  readonly releasing = signal<string | null>(null);
  readonly notes = signal<Record<string, string>>({});
  readonly decisionError = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.load();
  }

  setStatus(status: ApprovalStatus): void {
    this.status.set(status);
    this.load();
  }

  setNote(id: string, value: string): void {
    this.notes.update((current) => ({ ...current, [id]: value }));
  }

  trackById(_index: number, approval: Approval): string {
    return approval.id;
  }

  fields(result: Record<string, unknown>): Array<{ key: string; value: string }> {
    return Object.entries(result).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value)
    }));
  }

  label(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  // Releasing is separate from approving on purpose. Approving records that a
  // person agreed to the cost; releasing is what actually sends someone. Doing
  // both on one click would mean a vendor travels the instant a box is ticked.
  release(approval: Approval): void {
    this.releasing.set(approval.id);
    this.decisionError.update((current) => ({ ...current, [approval.id]: '' }));

    this.dispatchApi.release(approval.id).subscribe({
      next: () => {
        this.releasing.set(null);
        void this.router.navigate(['/dispatch']);
      },
      error: (error: unknown) => {
        this.releasing.set(null);
        this.decisionError.update((current) => ({
          ...current,
          [approval.id]:
            error instanceof HttpErrorResponse
              ? (error.error?.error?.message ?? 'The job could not be released.')
              : 'The job could not be released.'
        }));
      }
    });
  }

  decide(approval: Approval, decision: 'approved' | 'rejected'): void {
    this.deciding.set(approval.id);
    this.decisionError.update((current) => ({ ...current, [approval.id]: '' }));

    this.api.decide(approval.id, decision, this.notes()[approval.id]?.trim() || undefined).subscribe({
      next: () => {
        this.deciding.set(null);
        // Reload rather than patching locally: the decision may have been
        // refused as stale, and the list is the authority on what is left.
        this.load();
      },
      error: (error: unknown) => {
        this.deciding.set(null);
        this.decisionError.update((current) => ({
          ...current,
          [approval.id]:
            error instanceof HttpErrorResponse
              ? (error.error?.error?.message ?? 'The decision could not be recorded.')
              : 'The decision could not be recorded.'
        }));
      }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.status()).subscribe({
      next: (result) => {
        this.approvals.set(result.items);
        this.pendingCount.set(result.pendingCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load approvals from the FieldRelay API.');
        this.loading.set(false);
      }
    });
  }
}
