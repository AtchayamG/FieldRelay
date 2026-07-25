import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SettingsHttpAdapter } from '../data/settings-http.adapter';
import { DialTargetSettings } from '../domain/dial-target.model';

@Component({
  selector: 'fr-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="page__header">
        <h1>Settings</h1>
        <p class="page__sub">Operational configuration for this FieldRelay deployment.</p>
      </header>

      <article class="card">
        <div class="card__head">
          <div>
            <h2>Live call target</h2>
            <p class="card__sub">
              The single telephone number a real CALL-E call may reach. Calls are placed only
              to a number nominated here or provisioned in the deployment environment.
            </p>
          </div>
          <span class="pill" [class.pill--on]="state()?.configured">
            {{ state()?.configured ? 'Configured' : 'Not set' }}
          </span>
        </div>

        @if (loading()) {
          <p class="muted">Loading current configuration…</p>
        } @else if (loadError()) {
          <p class="alert alert--danger">{{ loadError() }}</p>
        } @else {
          @if (state()?.configured) {
            <dl class="facts">
              <div><dt>Number</dt><dd class="mono">{{ state()?.maskedPhone }}</dd></div>
              <div><dt>Authorized contact</dt><dd class="mono">{{ state()?.contactId }}</dd></div>
              <div><dt>Region</dt><dd>{{ state()?.region }} · {{ state()?.locale }}</dd></div>
              <div><dt>Last changed</dt><dd>{{ state()?.updatedBy }}</dd></div>
            </dl>
            <p class="muted small">
              Only the last four digits are ever shown. The full number is never returned by the
              API, written to the audit trail, or sent to the browser.
            </p>
          }

          @if (!state()?.runtimeChangesAllowed) {
            <p class="alert alert--warning">
              This deployment does not permit changing the call target from inside the
              application. Set <code>CALLE_ALLOW_RUNTIME_DIAL_TARGET=true</code> and provide
              <code>CALLE_DIAL_TARGETS</code> in the environment instead. Judge environments are
              intentionally locked this way.
            </p>
          } @else {
            <form class="form" [formGroup]="form" (ngSubmit)="save()">
              <label>
                <span>Mobile number (E.164)</span>
                <input
                  formControlName="phoneE164"
                  placeholder="+919094713923"
                  autocomplete="off"
                  inputmode="tel"
                />
                <small>Include the country code. Spaces and dashes are accepted.</small>
              </label>

              <div class="row">
                <label>
                  <span>Region</span>
                  <select formControlName="region">
                    @for (region of state()?.supportedRegions ?? []; track region) {
                      <option [value]="region">{{ region }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Language locale</span>
                  <input formControlName="locale" placeholder="en-IN" autocomplete="off" />
                </label>

                <label>
                  <span>Authorized contact</span>
                  <input formControlName="contactId" placeholder="CNS-4491" autocomplete="off" />
                  <small>The number is bound to this contact's calling permissions.</small>
                </label>
              </div>

              @if (saveError()) {
                <p class="alert alert--danger">{{ saveError() }}</p>
              }
              @if (saved()) {
                <p class="alert alert--ok">Call target updated.</p>
              }

              <div class="actions">
                <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">
                  {{ saving() ? 'Saving…' : 'Save call target' }}
                </button>
                <button
                  type="button"
                  class="btn"
                  [disabled]="saving() || !state()?.configured"
                  (click)="clear()"
                >
                  Remove
                </button>
              </div>
            </form>
          }
        }
      </article>
    </section>
  `,
  styles: [
    `
      .page {
        padding: var(--fr-space-lg);
        max-width: 900px;
      }
      .page__header h1 {
        margin: 0;
        font-size: 1.6rem;
        color: var(--fr-color-text);
      }
      .page__sub,
      .card__sub {
        color: var(--fr-color-muted);
        margin: var(--fr-space-2xs) 0 0;
      }
      .card {
        margin-top: var(--fr-space-lg);
        background: var(--fr-color-surface);
        border: 1px solid var(--fr-color-border);
        border-radius: var(--fr-radius-lg);
        padding: var(--fr-space-lg);
      }
      .card__head {
        display: flex;
        gap: var(--fr-space-md);
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .card__head h2 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--fr-color-text);
      }
      .pill {
        border-radius: var(--fr-radius-pill);
        padding: var(--fr-space-2xs) var(--fr-space-sm);
        font-size: 0.78rem;
        border: 1px solid var(--fr-color-border);
        color: var(--fr-color-muted);
        white-space: nowrap;
      }
      .pill--on {
        color: var(--fr-color-success);
        border-color: var(--fr-color-success);
      }
      .facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: var(--fr-space-md);
        margin: var(--fr-space-lg) 0 var(--fr-space-sm);
      }
      .facts dt {
        color: var(--fr-color-muted);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .facts dd {
        margin: var(--fr-space-2xs) 0 0;
        color: var(--fr-color-text);
      }
      .mono {
        font-family: var(--fr-font-technical);
      }
      .muted {
        color: var(--fr-color-muted);
      }
      .small {
        font-size: 0.82rem;
      }
      .form {
        margin-top: var(--fr-space-lg);
        display: grid;
        gap: var(--fr-space-md);
      }
      .row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--fr-space-md);
      }
      label {
        display: grid;
        gap: var(--fr-space-2xs);
        color: var(--fr-color-text);
        font-size: 0.9rem;
      }
      input,
      select {
        padding: var(--fr-space-sm);
        border-radius: var(--fr-radius-sm);
        border: 1px solid var(--fr-color-border);
        background: var(--fr-color-surface2);
        color: var(--fr-color-text);
        font-family: inherit;
        font-size: 0.95rem;
      }
      small {
        color: var(--fr-color-muted);
        font-size: 0.78rem;
      }
      .actions {
        display: flex;
        gap: var(--fr-space-sm);
        flex-wrap: wrap;
      }
      .btn {
        border-radius: var(--fr-radius-sm);
        border: 1px solid var(--fr-color-border);
        background: var(--fr-color-surface2);
        color: var(--fr-color-text);
        padding: var(--fr-space-sm) var(--fr-space-lg);
        font-size: 0.92rem;
        cursor: pointer;
      }
      .btn--primary {
        background: var(--fr-color-primary);
        border-color: var(--fr-color-primary);
        color: var(--fr-color-on-accent);
      }
      .btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .alert {
        border-radius: var(--fr-radius-sm);
        padding: var(--fr-space-sm) var(--fr-space-md);
        margin: 0;
        font-size: 0.88rem;
        border: 1px solid var(--fr-color-border);
      }
      .alert--danger {
        color: var(--fr-color-danger);
        border-color: var(--fr-color-danger);
        background: var(--fr-color-danger-soft);
      }
      .alert--warning {
        color: var(--fr-color-warning);
        border-color: var(--fr-color-warning);
        background: var(--fr-color-warning-soft);
      }
      .alert--ok {
        color: var(--fr-color-success);
        border-color: var(--fr-color-success);
      }
      code {
        font-family: var(--fr-font-technical);
        font-size: 0.85em;
      }
    `
  ]
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(SettingsHttpAdapter);
  private readonly fb = inject(FormBuilder);

  readonly state = signal<DialTargetSettings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    phoneE164: ['', [Validators.required, Validators.pattern(/^\+?[\d\s()-]{7,20}$/)]],
    region: ['IN', Validators.required],
    locale: ['en-IN', Validators.required],
    contactId: ['CNS-4491', Validators.required]
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.read().subscribe({
      next: (settings) => {
        this.state.set(settings);
        if (settings.region) this.form.patchValue({ region: settings.region });
        if (settings.locale) this.form.patchValue({ locale: settings.locale });
        if (settings.contactId) this.form.patchValue({ contactId: settings.contactId });
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load settings from the FieldRelay API.');
        this.loading.set(false);
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(null);

    this.api.set(this.form.getRawValue()).subscribe({
      next: (settings) => {
        this.state.set(settings);
        this.saved.set(true);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        // The API's own refusal message is the useful one: it names the field
        // or the policy that rejected the change.
        this.saveError.set(
          error instanceof HttpErrorResponse
            ? (error.error?.error?.message ?? 'The call target could not be saved.')
            : 'The call target could not be saved.'
        );
        this.saving.set(false);
      }
    });
  }

  clear(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(null);
    this.api.clear().subscribe({
      next: (settings) => {
        this.state.set(settings);
        this.saving.set(false);
      },
      error: () => {
        this.saveError.set('The call target could not be removed.');
        this.saving.set(false);
      }
    });
  }
}
