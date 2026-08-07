import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { VendorHttpAdapter } from '../data/vendor-http.adapter';
import { PURPOSE_LABEL, STATUS_LABEL, Vendor, refusalReason } from '../domain/vendor.model';

// The authorization boundary, made visible.
//
// "FieldRelay will not dial a number nobody provisioned" and "a contact
// authorized for one purpose cannot be called about another" are the two
// refusals hardest to demonstrate, because working software simply does not do
// the thing. This screen exists so an operator can read the boundary without
// having to trigger a failure to see it — which is why it shows the contacts
// that CANNOT be called at least as prominently as the ones that can.
@Component({
  selector: 'fr-vendors',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <section class="page">
      <header class="page__header">
        <div>
          <h1>Vendors</h1>
          <p class="page__sub">
            Every contact FieldRelay knows about, and exactly what it is permitted to
            call each one about. A contact missing from this list cannot be reached at all.
          </p>
        </div>
        <div class="header-stat" *ngIf="!loading()">
          <span class="header-stat__value font-mono">{{ callableCount() }} / {{ totalCount() }}</span>
          <span class="header-stat__label">Callable now</span>
        </div>
      </header>

      <p class="notice">
        <fr-icon name="shield" [size]="16" />
        <span>
          This screen is read-only, deliberately. Authorization is consent given by a
          vendor and recorded outside this application. A button here that granted
          permission to call somebody would defeat the boundary it displays.
        </span>
      </p>

      <p class="alert alert--danger" *ngIf="error()">{{ error() }}</p>
      <p class="muted" *ngIf="loading()">Loading contacts…</p>

      <ul class="list" *ngIf="!loading() && !error()">
        <li class="card" *ngFor="let vendor of vendors()" [class.card--blocked]="!vendor.callable">
          <header class="card__head">
            <div class="card__id-group">
              <span class="card__id font-mono">{{ vendor.contactId }}</span>
              <span
                class="badge"
                [class]="'badge--' + vendor.authorizationStatus"
              >
                {{ STATUS_LABEL[vendor.authorizationStatus] }}
              </span>
            </div>
            <span class="card__callable" [class.card__callable--yes]="vendor.callable">
              <fr-icon [name]="vendor.callable ? 'check-circle' : 'forbidden'" [size]="15" />
              <span>{{ vendor.callable ? 'Callable' : 'Not callable' }}</span>
            </span>
          </header>

          <!-- The refusal comes before the permissions, because it is the
               operative fact. A reader who stops after one line should stop on
               the reason this contact cannot be reached. -->
          <p class="card__refusal" *ngIf="reason(vendor) as text">
            <fr-icon name="alert" [size]="14" />
            <span>{{ text }}</span>
          </p>

          <div class="purposes">
            <div class="purposes__group" *ngIf="vendor.allowedPurposes.length > 0">
              <span class="purposes__label">May be called about</span>
              <div class="chips">
                <span class="chip chip--allowed" *ngFor="let purpose of vendor.allowedPurposes">
                  {{ PURPOSE_LABEL[purpose] }}
                </span>
              </div>
            </div>

            <div class="purposes__group" *ngIf="vendor.refusedPurposes.length > 0">
              <span class="purposes__label">Refused for</span>
              <div class="chips">
                <span class="chip chip--refused" *ngFor="let purpose of vendor.refusedPurposes">
                  {{ PURPOSE_LABEL[purpose] }}
                </span>
              </div>
            </div>
          </div>

          <footer class="card__foot">
            <span class="foot-item">
              <fr-icon [name]="vendor.numberProvisioned ? 'check' : 'close'" [size]="13" />
              <span>{{ vendor.numberProvisioned ? 'Number provisioned' : 'No number provisioned' }}</span>
            </span>
            <span class="foot-note">
              The number itself is never returned by the API. Change it in
              <a routerLink="/settings">Settings</a>.
            </span>
          </footer>
        </li>
      </ul>
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
        max-width: 64ch;
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
        font-size: 22px;
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

      .notice {
        display: flex;
        gap: var(--fr-space-sm);
        align-items: flex-start;
        margin: 0;
        padding: var(--fr-space-sm) var(--fr-space-md);
        background: var(--fr-color-surface2);
        border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius-inner);
        font-size: 12.5px;
        line-height: 1.55;
        color: var(--fr-color-muted);
        max-width: 92ch;
      }
      .notice fr-icon {
        flex: none;
        margin-top: 1px;
        opacity: 0.7;
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

      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--fr-space-md);
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      }

      .card {
        background: var(--fr-color-surface);
        border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius);
        box-shadow: var(--fr-shadow-tray), var(--fr-tray-inner-lip);
        padding: var(--fr-space-lg);
        display: flex;
        flex-direction: column;
        gap: var(--fr-space-sm);
        transition: border-color var(--fr-motion-normal) var(--fr-ease);
      }
      .card:hover {
        border-color: var(--fr-hairline-strong);
      }
      /* Blocked contacts are dimmed, not hidden. They are the evidence. */
      .card--blocked {
        background: var(--fr-color-surface2);
      }

      .card__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--fr-space-sm);
        flex-wrap: wrap;
      }
      .card__id-group {
        display: inline-flex;
        align-items: center;
        gap: var(--fr-space-xs);
        min-width: 0;
      }
      .card__id {
        font-size: 13px;
        font-weight: 500;
        color: var(--fr-color-text);
      }
      .badge {
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        padding: 3px 8px;
        border-radius: var(--fr-radius-pill);
        border: 1px solid var(--fr-hairline);
        color: var(--fr-color-muted);
      }
      .badge--authorized {
        color: var(--fr-color-success);
        border-color: color-mix(in srgb, var(--fr-color-success) 40%, transparent);
      }
      .badge--revoked {
        color: var(--fr-color-danger);
        border-color: color-mix(in srgb, var(--fr-color-danger) 40%, transparent);
      }
      .badge--pending {
        color: var(--fr-color-warning);
        border-color: color-mix(in srgb, var(--fr-color-warning) 40%, transparent);
      }

      .card__callable {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11.5px;
        font-weight: 500;
        color: var(--fr-color-muted);
        white-space: nowrap;
      }
      .card__callable--yes {
        color: var(--fr-color-success);
      }

      .card__refusal {
        display: flex;
        gap: 7px;
        align-items: flex-start;
        margin: 0;
        font-size: 12.5px;
        line-height: 1.5;
        color: var(--fr-color-text);
      }
      .card__refusal fr-icon {
        flex: none;
        margin-top: 2px;
        color: var(--fr-color-warning);
      }

      .purposes {
        display: flex;
        flex-direction: column;
        gap: var(--fr-space-xs);
      }
      .purposes__label {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: var(--fr-color-muted);
        margin-bottom: 5px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .chip {
        font-size: 11px;
        padding: 3px 9px;
        border-radius: var(--fr-radius-pill);
        border: 1px solid var(--fr-hairline);
        color: var(--fr-color-muted);
      }
      .chip--allowed {
        color: var(--fr-color-text);
        border-color: var(--fr-hairline-strong);
      }
      /* Struck through, not greyed: the point is that the system will say no. */
      .chip--refused {
        text-decoration: line-through;
        text-decoration-thickness: 1px;
        opacity: 0.75;
      }

      .card__foot {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin-top: auto;
        padding-top: var(--fr-space-xs);
        border-top: 1px solid var(--fr-hairline);
      }
      .foot-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--fr-color-text);
      }
      .foot-note {
        font-size: 11px;
        color: var(--fr-color-muted);
      }
      .foot-note a {
        color: var(--fr-color-primary-bright);
      }
    `
  ]
})
export class VendorsComponent implements OnInit {
  private readonly api = inject(VendorHttpAdapter);

  protected readonly PURPOSE_LABEL = PURPOSE_LABEL;
  protected readonly STATUS_LABEL = STATUS_LABEL;

  protected readonly vendors = signal<Vendor[]>([]);
  protected readonly callableCount = signal(0);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    this.api.list().subscribe({
      next: (result) => {
        this.vendors.set(result.items);
        this.callableCount.set(result.callableCount);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The contact list could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  protected reason(vendor: Vendor): string | null {
    return refusalReason(vendor);
  }
}
