import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CallDetailComponent } from './call-detail.component';
import { CallPort } from '../../application/call.port';
import { CallTaskDetail } from '../../domain/call.model';

describe('CallDetailComponent', () => {
  let component: CallDetailComponent;
  let fixture: ComponentFixture<CallDetailComponent>;
  let mockCallPort: {
    list: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    reconcile: ReturnType<typeof vi.fn>;
  };

  const mockCallSimulated: CallTaskDetail = {
    outcome: null,
    id: '11111111-1111-4111-a111-111111111111',
    displayId: 'CALL-0001',
    incidentId: '22222222-2222-4222-a222-222222222222',
    providerTaskId: 'prov-task-99',
    purpose: 'vendor_availability',
    authorizedContactId: 'contact-001',
    status: 'connected',
    simulated: true,
    timeoutSeconds: 60,
    retries: 1,
    createdAt: '2026-07-24T10:00:00Z',
    updatedAt: '2026-07-24T10:01:00Z',
    version: 1
  };

  const mockCallOutcomeUnknown: CallTaskDetail = {
    outcome: null,
    id: '33333333-3333-4333-a333-333333333333',
    displayId: 'CALL-0002',
    incidentId: '44444444-4444-4444-a444-444444444444',
    providerTaskId: null,
    purpose: 'status_update',
    authorizedContactId: 'contact-002',
    status: 'outcome_unknown',
    simulated: false,
    timeoutSeconds: 120,
    retries: 2,
    createdAt: '2026-07-24T11:00:00Z',
    updatedAt: '2026-07-24T11:05:00Z',
    version: 3
  };

  beforeEach(async () => {
    mockCallPort = {
      list: vi.fn(),
      getById: vi.fn().mockReturnValue(of(mockCallSimulated)),
      reconcile: vi.fn().mockReturnValue(of({ status: 'completed', applied: true }))
    };

    await TestBed.configureTestingModule({
      imports: [CallDetailComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ callTaskId: mockCallSimulated.id }),
            paramMap: of(new Map([['callTaskId', mockCallSimulated.id]])),
            snapshot: { paramMap: { get: () => mockCallSimulated.id } }
          }
        }
      ]
    })
    .overrideComponent(CallDetailComponent, {
      set: { providers: [{ provide: CallPort, useValue: mockCallPort }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(CallDetailComponent);
    component = fixture.componentInstance;
  });

  describe('structured outcome panel', () => {
    const withOutcome = (
      overrides: Partial<NonNullable<CallTaskDetail['outcome']>> = {}
    ): CallTaskDetail => ({
      ...mockCallSimulated,
      status: 'completed',
      outcome: {
        structuredResult: { available: 'yes', quoted_amount_text: '$360' },
        taskCompleted: true,
        confidenceScore: 0.82,
        confidenceLabel: 'high',
        validationFailed: false,
        receivedAt: '2026-07-26T10:03:00Z',
        ...overrides
      }
    });

    function renderWith(detail: CallTaskDetail): string {
      mockCallPort.getById.mockReturnValue(of(detail));
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).textContent ?? '';
    }

    it('shows nothing when the call has produced no answer yet', () => {
      const text = renderWith(mockCallSimulated);
      expect(text).not.toContain('Structured Outcome');
    });

    it('renders the validated fields with readable labels', () => {
      const text = renderWith(withOutcome());

      expect(text).toContain('Structured Outcome');
      expect(text).toContain('Available');
      expect(text).toContain('yes');
      expect(text).toContain('Quoted Amount Text');
      expect(text).toContain('$360');
    });

    it('surfaces task completion and confidence', () => {
      const text = renderWith(withOutcome());
      expect(text).toContain('TASK COMPLETED');
      expect(text).toContain('CONFIDENCE HIGH');
    });

    it('distinguishes a call that finished from a task that succeeded', () => {
      // A call can connect and complete while the goal it was placed for fails.
      const text = renderWith(withOutcome({ taskCompleted: false }));
      expect(text).toContain('TASK NOT COMPLETED');
    });

    it('warns when part of the answer failed validation rather than hiding it', () => {
      const text = renderWith(
        withOutcome({ validationFailed: true, structuredResult: { available: 'yes' } })
      );
      expect(text).toContain('did not match the declared schema');
      expect(text).toContain('verify before acting');
    });

    it('handles a terminal call that returned nothing usable', () => {
      const text = renderWith(
        withOutcome({ structuredResult: {}, validationFailed: true, taskCompleted: false })
      );
      expect(text).toContain('returned no usable field');
    });

    it('states that transcripts are not stored', () => {
      // The absence is deliberate and should be legible to an operator rather
      // than looking like missing data.
      expect(renderWith(withOutcome())).toContain('Transcripts and recordings are not');
    });
  });

  it('should load and render call detail for simulated call', () => {
    fixture.detectChanges();

    expect(mockCallPort.getById).toHaveBeenCalledWith(mockCallSimulated.id);
    expect(component.call).toEqual(mockCallSimulated);

    const el = fixture.nativeElement as HTMLElement;
    const displayIdEl = el.querySelector('.call-display-id');
    expect(displayIdEl?.textContent).toContain('CALL-0001');

    const simulatedBanner = el.querySelector('.simulated-banner');
    expect(simulatedBanner).toBeTruthy();
    expect(simulatedBanner?.textContent).toContain('SIMULATED CALL TASK');
  });

  it('should render outcome_unknown as a strong reconciliation-required warning state', () => {
    mockCallPort.getById.mockReturnValue(of(mockCallOutcomeUnknown));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const alertEl = el.querySelector('.reconciliation-alert');
    expect(alertEl).toBeTruthy();
    expect(alertEl?.textContent).toContain('Reconciliation required — do not redial');
  });

  it('should display honest pending/unavailable label when providerTaskId is null', () => {
    mockCallPort.getById.mockReturnValue(of(mockCallOutcomeUnknown));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Unavailable / Pending dispatch');
  });

  it('should display 404 state when call task is not found', () => {
    mockCallPort.getById.mockReturnValue(throwError(() => ({ status: 404 })));
    fixture.detectChanges();

    expect(component.isNotFound).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    const errorCard = el.querySelector('.error-card');
    expect(errorCard?.textContent).toContain('Call Task Not Found');
  });

  it('should display 403 state when access is denied', () => {
    mockCallPort.getById.mockReturnValue(throwError(() => ({ status: 403 })));
    fixture.detectChanges();

    expect(component.isPermissionDenied).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    const errorCard = el.querySelector('.error-card');
    expect(errorCard?.textContent).toContain('Access Denied');
  });

  it('should NEVER contain redial, retry, or call trigger controls', () => {
    mockCallPort.getById.mockReturnValue(of(mockCallOutcomeUnknown));
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      'button'
    ) as NodeListOf<HTMLButtonElement>;
    const buttonTexts = Array.from(buttons, (button) =>
      (button.textContent ?? '').toLowerCase()
    );

    expect(buttonTexts.some((t: string) => t.includes('redial'))).toBe(false);
    expect(buttonTexts.some((t: string) => t.includes('retry call'))).toBe(false);
    expect(buttonTexts.some((t: string) => t.includes('start call'))).toBe(false);
  });

  it('offers read-only reconciliation for an existing non-terminal live call', () => {
    const liveQueued: CallTaskDetail = {
      ...mockCallSimulated,
      simulated: false,
      status: 'queued',
      providerTaskId: 'call_existing_1'
    };
    const reconciled: CallTaskDetail = { ...liveQueued, status: 'completed' };
    mockCallPort.getById
      .mockReturnValueOnce(of(liveQueued))
      .mockReturnValueOnce(of(reconciled));
    fixture.detectChanges();

    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button')
    ).find((candidate) => candidate.textContent?.includes('Check provider status'));
    expect(button).toBeTruthy();
    button?.click();
    fixture.detectChanges();

    expect(mockCallPort.reconcile).toHaveBeenCalledWith(liveQueued.id);
    expect(mockCallPort.getById).toHaveBeenCalledTimes(2);
    expect(component.call?.status).toBe('completed');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Provider status reconciled as completed.'
    );
  });
});
