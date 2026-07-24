import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IncidentListComponent } from './incident-list.component';
import { IncidentPort } from '../../application/incident.port';
import { Incident } from '../../domain/incident.model';

describe('IncidentListComponent', () => {
  let component: IncidentListComponent;
  let fixture: ComponentFixture<IncidentListComponent>;
  let mockPort: { list: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };

  const mockIncidents: Incident[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      displayId: 'INC-2026-0001',
      propertyId: 'PROP-101',
      unit: '3A',
      type: 'plumbing',
      priority: 'high',
      status: 'intake',
      description: 'Major pipe leak',
      reportedBy: 'John Doe',
      createdAt: '2026-07-24T10:00:00.000Z',
      updatedAt: '2026-07-24T10:05:00.000Z',
      version: 1
    }
  ];

  beforeEach(async () => {
    mockPort = {
      list: vi.fn().mockReturnValue(of({ items: mockIncidents, nextCursor: null })),
      getById: vi.fn(),
      create: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [IncidentListComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    })
    .overrideComponent(IncidentListComponent, {
      set: { providers: [{ provide: IncidentPort, useValue: mockPort }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load incident list on init', () => {
    fixture.detectChanges();
    expect(component.isLoading).toBe(false);
    expect(component.incidents.length).toBe(1);
    expect(component.incidents[0].displayId).toBe('INC-2026-0001');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.page-title')?.textContent).toContain('Operational Incidents');
    expect(compiled.querySelector('.inc-id')?.textContent).toContain('INC-2026-0001');
  });

  it('should render empty organization state when list is empty', () => {
    mockPort.list.mockReturnValue(of({ items: [], nextCursor: null }));
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.incidents.length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state-container')?.textContent).toContain('No Incidents Recorded');
  });

  it('should render error state and handle retry button', () => {
    mockPort.list.mockReturnValue(
      throwError(() => ({
        status: 500,
        error: { error: { code: 'INTERNAL_ERROR', message: 'API failure' } }
      }))
    );
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMsg).toContain('API failure');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.danger-banner')?.textContent).toContain('Error Loading Incidents');

    // Test retry
    mockPort.list.mockReturnValue(of({ items: mockIncidents, nextCursor: null }));
    component.retryLoad();
    fixture.detectChanges();

    expect(component.errorMsg).toBeNull();
    expect(component.incidents.length).toBe(1);
  });

  it('should render a distinct permission-restricted state for 403', () => {
    mockPort.list.mockReturnValue(throwError(() => ({ status: 403 })));
    fixture.detectChanges();

    expect(component.isPermissionRestricted).toBe(true);
    expect(component.errorMsg).toBeNull();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Incident Access Restricted');
    expect(compiled.querySelector('.filter-bar')).toBeNull();
  });

  it('should render no-results when a server-side status filter is empty', () => {
    mockPort.list.mockReturnValue(of({ items: [], nextCursor: null }));
    component.selectedStatus = 'resolved';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No Matching Incidents');
  });

  it('should filter incidents by client-side search query', () => {
    fixture.detectChanges();
    component.searchQuery = 'nonexistent';
    component.onSearchChange();
    fixture.detectChanges();

    expect(component.filteredIncidents.length).toBe(0);

    component.searchQuery = 'PROP-101';
    component.onSearchChange();
    fixture.detectChanges();

    expect(component.filteredIncidents.length).toBe(1);
  });
});
