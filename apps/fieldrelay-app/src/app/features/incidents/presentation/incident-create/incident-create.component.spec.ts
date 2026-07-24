import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IncidentCreateComponent } from './incident-create.component';
import { IncidentPort } from '../../application/incident.port';
import { Incident } from '../../domain/incident.model';

describe('IncidentCreateComponent', () => {
  let component: IncidentCreateComponent;
  let fixture: ComponentFixture<IncidentCreateComponent>;
  let mockPort: { list: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let router: Router;

  const mockCreatedIncident: Incident = {
    id: '22222222-2222-4222-8222-222222222222',
    displayId: 'INC-2026-0002',
    propertyId: 'PROP-202',
    unit: '12A',
    type: 'electrical',
    priority: 'critical',
    status: 'intake',
    description: 'Main breaker sparking in basement',
    reportedBy: 'Manager Bob',
    createdAt: '2026-07-24T11:00:00.000Z',
    updatedAt: '2026-07-24T11:00:00.000Z',
    version: 1
  };

  beforeEach(async () => {
    mockPort = {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn().mockReturnValue(of(mockCreatedIncident))
    };

    await TestBed.configureTestingModule({
      imports: [IncidentCreateComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    })
    .overrideComponent(IncidentCreateComponent, {
      set: { providers: [{ provide: IncidentPort, useValue: mockPort }] }
    })
    .compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(IncidentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize reactive form and generate idempotency key on init', () => {
    expect(component.form).toBeDefined();
    expect(component.idempotencyKey).toBeTruthy();
    expect(component.form.valid).toBe(false);
  });

  it('should validate required fields before submission', () => {
    component.onSubmit();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(mockPort.create).not.toHaveBeenCalled();
  });

  it('should submit valid form with Idempotency-Key and navigate on success', () => {
    component.form.patchValue({
      propertyId: 'PROP-202',
      unit: '12A',
      type: 'electrical',
      priority: 'critical',
      description: 'Main breaker sparking in basement',
      reportedBy: 'Manager Bob'
    });

    const keyUsed = component.idempotencyKey;
    component.onSubmit();
    fixture.detectChanges();

    expect(mockPort.create).toHaveBeenCalledWith(
      {
        propertyId: 'PROP-202',
        unit: '12A',
        type: 'electrical',
        priority: 'critical',
        description: 'Main breaker sparking in basement',
        reportedBy: 'Manager Bob'
      },
      keyUsed
    );
    expect(router.navigate).toHaveBeenCalledWith(['/incidents', mockCreatedIncident.id]);
  });

  it('should retain idempotency key across network submission error', () => {
    mockPort.create.mockReturnValue(
      throwError(() => ({ status: 0, message: 'Network timeout' }))
    );

    component.form.patchValue({
      propertyId: 'PROP-202',
      unit: '12A',
      type: 'electrical',
      priority: 'critical',
      description: 'Main breaker sparking in basement',
      reportedBy: 'Manager Bob'
    });

    const initialKey = component.idempotencyKey;
    component.onSubmit();
    fixture.detectChanges();

    expect(component.apiError).toBe('Network timeout');
    expect(component.idempotencyKey).toBe(initialKey);
  });

  it('should rotate the idempotency key after a definitive API rejection', () => {
    mockPort.create.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: {
          error: { code: 'VALIDATION_FAILED', message: 'Backend rejected the request.' }
        }
      }))
    );

    component.form.patchValue({
      propertyId: 'PROP-202',
      unit: '12A',
      type: 'electrical',
      priority: 'critical',
      description: 'Main breaker sparking in basement',
      reportedBy: 'Manager Bob'
    });

    const initialKey = component.idempotencyKey;
    component.onSubmit();
    fixture.detectChanges();

    expect(component.apiError).toBe('Backend rejected the request.');
    expect(component.idempotencyKey).not.toBe(initialKey);
    expect(component.form.enabled).toBe(true);
  });

  it('should enforce the same field bounds as the backend', () => {
    component.form.patchValue({
      propertyId: 'P'.repeat(65),
      unit: 'U'.repeat(33),
      description: '   ',
      reportedBy: 'R'.repeat(129)
    });

    expect(component.form.get('propertyId')?.hasError('maxlength')).toBe(true);
    expect(component.form.get('unit')?.hasError('maxlength')).toBe(true);
    expect(component.form.get('description')?.hasError('pattern')).toBe(true);
    expect(component.form.get('reportedBy')?.hasError('maxlength')).toBe(true);
  });
});
