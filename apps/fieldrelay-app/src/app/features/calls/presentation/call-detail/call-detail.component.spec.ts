import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CallDetailComponent } from './call-detail.component';
import { CallPort } from '../../application/call.port';
import { CallTask } from '../../domain/call.model';

describe('CallDetailComponent', () => {
  let component: CallDetailComponent;
  let fixture: ComponentFixture<CallDetailComponent>;
  let mockCallPort: {
    list: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };

  const mockCallSimulated: CallTask = {
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

  const mockCallOutcomeUnknown: CallTask = {
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
      getById: vi.fn().mockReturnValue(of(mockCallSimulated))
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
});
