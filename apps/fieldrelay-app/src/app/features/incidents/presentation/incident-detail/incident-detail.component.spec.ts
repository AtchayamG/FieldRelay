import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IncidentDetailComponent } from './incident-detail.component';
import { IncidentPort } from '../../application/incident.port';
import { Incident } from '../../domain/incident.model';
import { CallPort } from '../../../calls/application/call.port';

describe('IncidentDetailComponent', () => {
  let component: IncidentDetailComponent;
  let fixture: ComponentFixture<IncidentDetailComponent>;
  let mockPort: { list: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let mockCallPort: {
    list: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    reconcile: ReturnType<typeof vi.fn>;
    launchContext: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
  };

  const mockIncident: Incident = {
    id: '11111111-1111-4111-8111-111111111111',
    displayId: 'INC-2026-0001',
    propertyId: 'PROP-101',
    unit: '3A',
    type: 'plumbing',
    priority: 'high',
    status: 'intake',
    description: 'Major pipe leak in kitchen ceiling',
    reportedBy: 'John Doe',
    createdAt: '2026-07-24T10:00:00.000Z',
    updatedAt: '2026-07-24T10:05:00.000Z',
    version: 1
  };

  beforeEach(async () => {
    mockPort = {
      list: vi.fn(),
      getById: vi.fn().mockReturnValue(of(mockIncident)),
      create: vi.fn()
    };
    mockCallPort = {
      list: vi.fn().mockReturnValue(of({ items: [], nextCursor: null })),
      getById: vi.fn(),
      reconcile: vi.fn(),
      launchContext: vi.fn().mockReturnValue(of({
        mode: 'demo',
        configured: true,
        contactId: 'CNS-4491',
        maskedPhone: '•••• 3923'
      })),
      start: vi.fn().mockReturnValue(of({
        callTaskId: '33333333-3333-4333-a333-333333333333',
        displayId: 'CALL-2026-0004',
        providerTaskId: 'demo-provider-task',
        status: 'queued',
        simulated: true
      }))
    };

    await TestBed.configureTestingModule({
      imports: [IncidentDetailComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ incidentId: mockIncident.id }))
          }
        }
      ]
    })
    .overrideComponent(IncidentDetailComponent, {
      set: { providers: [
        { provide: IncidentPort, useValue: mockPort },
        { provide: CallPort, useValue: mockCallPort }
      ] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentDetailComponent);
    component = fixture.componentInstance;
  });

  it('should load and render incident detail fields', () => {
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.incident).toEqual(mockIncident);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.incident-title')?.textContent).toContain('Plumbing Issue @ PROP-101');
    expect(compiled.querySelector('.description-text')?.textContent).toContain('Major pipe leak in kitchen ceiling');
  });

  it('should render 404 state when incident is not found', () => {
    mockPort.getById.mockReturnValue(
      throwError(() => ({
        status: 404,
        error: { error: { code: 'NOT_FOUND', message: 'Not found' } }
      }))
    );
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.isNotFound).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state-container')?.textContent).toContain('404 — Incident Not Found');
  });

  it('should switch tabs and show honest unavailable states for commitments/AI/calls', () => {
    fixture.detectChanges();

    component.activeTab = 'commitments';
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-tab-panel')?.textContent).toContain('No Commitments Recorded');

    component.activeTab = 'ai';
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-tab-panel')?.textContent).toContain('AI Summary & Insights Unavailable');
  });

  it('should load call readiness and require explicit confirmation before starting', () => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    component.openCallTab();
    fixture.detectChanges();

    expect(mockCallPort.list).toHaveBeenCalledWith({ incidentId: mockIncident.id, limit: 1 });
    expect(component.callContext?.mode).toBe('demo');
    expect(component.callPrepared).toBe(false);

    component.prepareCall();
    expect(component.callPrepared).toBe(true);
    component.startAuthorizedCall();
    expect(mockCallPort.start).not.toHaveBeenCalled();

    component.callConfirmed = true;
    component.startAuthorizedCall();
    expect(mockCallPort.start).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: mockIncident.id,
        authorizedContactId: 'CNS-4491',
        purpose: 'vendor_availability',
        retries: 0
      }),
      expect.any(String)
    );
  });
});
