import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IncidentPort } from '../../application/incident.port';
import { IncidentHttpAdapter } from '../../data/incident-http.adapter';
import { IncidentPriority, IncidentType } from '../../domain/incident.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import {
  incidentApiErrorMessage,
  incidentApiStatus
} from '../../application/incident-api-error';

@Component({
  selector: 'app-incident-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent],
  providers: [
    { provide: IncidentPort, useClass: IncidentHttpAdapter }
  ],
  template: `
    <div class="create-incident-page">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-main">
          <div class="header-titles">
            <a routerLink="/incidents" class="back-link font-mono">
              ← Back to Incidents
            </a>
            <h1 class="page-title">Create Operational Incident</h1>
            <p class="page-subtitle">
              Capture authoritative incident details for the operations queue
            </p>
          </div>
        </div>
      </header>

      <!-- 5-Step Workflow Header (Truthfully Represented) -->
      <div class="wizard-stepper" aria-label="Incident Creation Steps">
        <div class="step-node active">
          <span class="step-num font-mono">1</span>
          <span class="step-label">Incident Capture <strong class="badge-active">ACTIVE</strong></span>
        </div>
        <div class="step-node unavailable" title="Attachments intake planned for next release">
          <span class="step-num font-mono">2</span>
          <span class="step-label">Attachments <strong class="badge-planned">PLANNED</strong></span>
        </div>
        <div class="step-node unavailable" title="AI Voice Triage planned for next release">
          <span class="step-num font-mono">3</span>
          <span class="step-label">AI Triage <strong class="badge-planned">PLANNED</strong></span>
        </div>
        <div class="step-node unavailable" title="Phone workflow setup planned for next release">
          <span class="step-num font-mono">4</span>
          <span class="step-label">Phone Workflow <strong class="badge-planned">PLANNED</strong></span>
        </div>
        <div class="step-node unavailable" title="Dispatch confirmation planned for next release">
          <span class="step-num font-mono">5</span>
          <span class="step-label">Confirmation <strong class="badge-planned">PLANNED</strong></span>
        </div>
      </div>

      <!-- Main Form Container -->
      <div class="ops-card form-card">
        <h2 class="card-section-title">Step 1: Authorized Incident Data</h2>

        <!-- API Error Alert -->
        <div class="alert-banner danger-banner" *ngIf="apiError">
          <span class="error-text">
            <fr-icon name="alert" [size]="16" />
            <span><strong>Submission Failed:</strong> {{ apiError }}</span>
          </span>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="incident-form">
          <!-- Property ID -->
          <div class="form-group">
            <label for="propertyId" class="form-label">
              Property Identifier <span class="required-star">*</span>
            </label>
            <input
              id="propertyId"
              type="text"
              class="form-input"
              [class.input-error]="isFieldInvalid('propertyId')"
              placeholder="e.g. PROP-1042 or 742 Evergreen Terrace"
              formControlName="propertyId"
            />
            <div class="field-error" *ngIf="isFieldInvalid('propertyId')">
              <span *ngIf="form.get('propertyId')?.errors?.['required']">Property ID is required.</span>
              <span *ngIf="form.get('propertyId')?.errors?.['maxlength']">Max 64 characters allowed.</span>
              <span *ngIf="form.get('propertyId')?.errors?.['pattern']">Enter a non-blank property ID.</span>
            </div>
          </div>

          <!-- Unit (Optional) -->
          <div class="form-group">
            <label for="unit" class="form-label">
              Unit / Suite Number <span class="optional-tag">(Optional)</span>
            </label>
            <input
              id="unit"
              type="text"
              class="form-input"
              [class.input-error]="isFieldInvalid('unit')"
              placeholder="e.g. 4B or Suite 200"
              formControlName="unit"
            />
            <div class="field-error" *ngIf="isFieldInvalid('unit')">
              <span *ngIf="form.get('unit')?.errors?.['maxlength']">Max 32 characters allowed.</span>
            </div>
          </div>

          <!-- Incident Type & Priority Row -->
          <div class="form-row">
            <!-- Incident Type -->
            <div class="form-group">
              <label for="type" class="form-label">
                Incident Category / Type <span class="required-star">*</span>
              </label>
              <select
                id="type"
                class="form-select"
                [class.input-error]="isFieldInvalid('type')"
                formControlName="type"
              >
                <option value="" disabled>Select incident type...</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC / Climate</option>
                <option value="appliance">Appliance</option>
                <option value="structural">Structural</option>
                <option value="other">Other / General</option>
              </select>
              <div class="field-error" *ngIf="isFieldInvalid('type')">
                <span *ngIf="form.get('type')?.errors?.['required']">Incident type is required.</span>
              </div>
            </div>

            <!-- Priority -->
            <div class="form-group">
              <label for="priority" class="form-label">
                Operational Priority <span class="required-star">*</span>
              </label>
              <select
                id="priority"
                class="form-select"
                [class.input-error]="isFieldInvalid('priority')"
                formControlName="priority"
              >
                <option value="critical">Critical (Immediate Emergency)</option>
                <option value="high">High (Urgent Response)</option>
                <option value="medium">Medium (Standard Work Order)</option>
                <option value="low">Low (Scheduled Maintenance)</option>
              </select>
              <div class="field-error" *ngIf="isFieldInvalid('priority')">
                <span *ngIf="form.get('priority')?.errors?.['required']">Priority level is required.</span>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="description" class="form-label">
              Detailed Description <span class="required-star">*</span>
            </label>
            <textarea
              id="description"
              rows="4"
              class="form-textarea"
              [class.input-error]="isFieldInvalid('description')"
              placeholder="Describe the issue, location details, leak severity, access notes..."
              formControlName="description"
            ></textarea>
            <div class="field-error" *ngIf="isFieldInvalid('description')">
              <span *ngIf="form.get('description')?.errors?.['required']">Description is required.</span>
              <span *ngIf="form.get('description')?.errors?.['maxlength']">Max 2000 characters allowed.</span>
              <span *ngIf="form.get('description')?.errors?.['pattern']">Enter a non-blank description.</span>
            </div>
          </div>

          <!-- Reported By -->
          <div class="form-group">
            <label for="reportedBy" class="form-label">
              Reported By (Contact / Staff) <span class="required-star">*</span>
            </label>
            <input
              id="reportedBy"
              type="text"
              class="form-input"
              [class.input-error]="isFieldInvalid('reportedBy')"
              placeholder="e.g. Jane Doe (Tenant) or Supervisor Dave"
              formControlName="reportedBy"
            />
            <div class="field-error" *ngIf="isFieldInvalid('reportedBy')">
              <span *ngIf="form.get('reportedBy')?.errors?.['required']">Reporter name is required.</span>
              <span *ngIf="form.get('reportedBy')?.errors?.['maxlength']">Max 128 characters allowed.</span>
              <span *ngIf="form.get('reportedBy')?.errors?.['pattern']">Enter a non-blank reporter.</span>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <a routerLink="/incidents" class="secondary-btn">Cancel</a>
            <button
              type="submit"
              class="action-btn primary-btn"
              [disabled]="isSubmitting"
            >
              <span *ngIf="!isSubmitting" class="btn-content">
                <fr-icon name="plus" [size]="16" [strokeWidth]="2.2" />
                <span>Create Incident Record</span>
              </span>
              <span *ngIf="isSubmitting">Submitting to API...</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Honest Unavailable Workflow Panels -->
      <div class="unavailable-sections-grid">
        <div class="ops-card unavailable-panel">
          <h3><fr-icon name="link" [size]="16" /> Evidence &amp; Attachments Intake</h3>
          <p>Photo and document upload is planned for the next release.</p>
          <span class="planned-badge font-mono">Planned / Unavailable</span>
        </div>
        <div class="ops-card unavailable-panel">
          <h3><fr-icon name="activity" [size]="16" /> AI Voice Triage Preview</h3>
          <p>Authorized AI phone workflow setup will be added in a later delivery slice.</p>
          <span class="planned-badge font-mono">Planned / Unavailable</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .create-incident-page {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-lg);
    }
    .page-header {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-xs);
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
    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: var(--fr-color-text);
    }
    .page-subtitle {
      font-size: 13px;
      color: var(--fr-color-muted);
    }
    .wizard-stepper {
      display: flex;
      gap: var(--fr-space-xs);
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      padding: var(--fr-space-xs);
      border-radius: var(--fr-radius-lg);
      overflow-x: auto;
    }
    .step-node {
      display: flex;
      align-items: center;
      gap: var(--fr-space-xs);
      padding: var(--fr-space-xs) var(--fr-space-md);
      border-radius: var(--fr-radius-md);
      font-size: 12px;
      white-space: nowrap;
    }
    .step-node.active {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-primary);
      color: var(--fr-color-text);
      font-weight: 700;
    }
    .step-node.unavailable {
      opacity: 0.5;
      cursor: not-allowed;
      color: var(--fr-color-muted);
    }
    .step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--fr-color-surface3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .step-node.active .step-num {
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
    }
    .badge-active {
      font-size: 9px;
      background: var(--fr-color-primary-soft);
      color: var(--fr-color-primary-bright);
      padding: 2px 5px;
      border-radius: var(--fr-radius-sm);
      margin-left: 4px;
    }
    .badge-planned {
      font-size: 9px;
      background: var(--fr-color-surface3);
      color: var(--fr-color-muted);
      padding: 2px 5px;
      border-radius: var(--fr-radius-sm);
      margin-left: 4px;
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
    .card-section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fr-color-text);
      border-bottom: 1px solid var(--fr-color-border);
      padding-bottom: var(--fr-space-xs);
    }
    .incident-form {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--fr-space-md);
    }
    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--fr-color-text);
    }
    .required-star {
      color: var(--fr-color-danger);
    }
    .optional-tag {
      font-weight: 400;
      color: var(--fr-color-muted);
    }
    .form-input, .form-select, .form-textarea {
      background: var(--fr-color-surface2);
      color: var(--fr-color-text);
      border: 1px solid var(--fr-color-border);
      padding: 10px 12px;
      border-radius: var(--fr-radius-md);
      font-size: 13px;
      outline: none;
      transition: border-color var(--fr-motion-fast);
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: var(--fr-color-primary);
    }
    .input-error {
      border-color: var(--fr-color-danger) !important;
    }
    .field-error {
      font-size: 11px;
      color: var(--fr-color-danger);
      font-weight: 600;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--fr-space-md);
      margin-top: var(--fr-space-sm);
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
      border: none;
      padding: 10px 20px;
      border-radius: var(--fr-radius-md);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: var(--fr-shadow-primary);
      transition: background var(--fr-motion-fast);
    }
    .action-btn:hover:not(:disabled) {
      background: var(--fr-color-primary-bright);
    }
    .action-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      box-shadow: none;
    }
    .secondary-btn {
      background: var(--fr-color-surface2);
      color: var(--fr-color-text);
      border: 1px solid var(--fr-color-border);
      padding: 10px 16px;
      border-radius: var(--fr-radius-md);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .alert-banner {
      padding: var(--fr-space-md);
      border-radius: var(--fr-radius-md);
      font-size: 13px;
    }
    .error-text {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-content {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    /* Section headings pair an icon with the label on a shared baseline. */
    .unavailable-panel h3 {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .danger-banner {
      background: var(--fr-color-danger-soft);
      border: 1px solid var(--fr-color-danger);
      color: var(--fr-color-danger);
    }
    .unavailable-sections-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--fr-space-md);
    }
    @media (max-width: 600px) {
      .unavailable-sections-grid {
        grid-template-columns: 1fr;
      }
    }
    .unavailable-panel {
      opacity: 0.7;
    }
    .unavailable-panel h3 {
      font-size: 14px;
      font-weight: 700;
    }
    .unavailable-panel p {
      font-size: 12px;
      color: var(--fr-color-muted);
    }
    .planned-badge {
      font-size: 10px;
      font-weight: 700;
      color: var(--fr-color-muted);
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      padding: 2px 6px;
      border-radius: var(--fr-radius-sm);
      align-self: flex-start;
    }
  `]
})
export class IncidentCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private port = inject(IncidentPort);
  private router = inject(Router);

  form!: FormGroup;
  idempotencyKey: string = '';
  isSubmitting: boolean = false;
  apiError: string | null = null;

  ngOnInit(): void {
    this.generateIdempotencyKey();

    this.form = this.fb.group({
      propertyId: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(64)]],
      unit: ['', [Validators.maxLength(32)]],
      type: ['plumbing', [Validators.required]],
      priority: ['medium', [Validators.required]],
      description: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(2000)]
      ],
      reportedBy: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(128)]]
    });

    // Re-generate idempotency key if body inputs change
    this.form.valueChanges.subscribe(() => {
      if (this.form.dirty && !this.isSubmitting) {
        this.generateIdempotencyKey();
      }
    });
  }

  generateIdempotencyKey(): void {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.randomUUID) {
      throw new Error('Secure idempotency generation is unavailable in this browser.');
    }
    this.idempotencyKey = cryptoApi.randomUUID();
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.apiError = null;

    const values = this.form.value;
    this.form.disable({ emitEvent: false });

    this.port
      .create(
        {
          propertyId: values.propertyId.trim(),
          unit: values.unit?.trim() || undefined,
          type: values.type as IncidentType,
          priority: values.priority as IncidentPriority,
          description: values.description.trim(),
          reportedBy: values.reportedBy.trim()
        },
        this.idempotencyKey
      )
      .subscribe({
        next: (created) => {
          this.isSubmitting = false;
          this.router.navigate(['/incidents', created.id]);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.form.enable({ emitEvent: false });
          this.apiError = incidentApiErrorMessage(
            err,
            'Failed to create incident record.'
          );
          // Status 0 means the browser never received an HTTP response, so the
          // same key is retained in case the server committed before the
          // connection failed. A definitive response starts a new logical
          // attempt unless the user edits the form first.
          const responseStatus = incidentApiStatus(err);
          if (responseStatus !== undefined && responseStatus !== 0) {
            this.generateIdempotencyKey();
          }
        }
      });
  }
}
