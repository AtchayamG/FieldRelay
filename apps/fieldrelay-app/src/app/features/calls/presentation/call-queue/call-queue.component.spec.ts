import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CallQueueComponent } from './call-queue.component';
import { CallPort } from '../../application/call.port';
import { CallTask } from '../../domain/call.model';

describe('CallQueueComponent', () => {
  let component: CallQueueComponent;
  let fixture: ComponentFixture<CallQueueComponent>;
  let mockCallPort: {
    list: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };

  const mockCallItem1: CallTask = {
    id: '11111111-1111-4111-a111-111111111111',
    displayId: 'CALL-0001',
    incidentId: '22222222-2222-4222-a222-222222222222',
    providerTaskId: 'prov-1',
    purpose: 'vendor_availability',
    authorizedContactId: 'auth-contact-1',
    status: 'connected',
    simulated: true,
    timeoutSeconds: 60,
    retries: 0,
    createdAt: '2026-07-24T10:00:00Z',
    updatedAt: '2026-07-24T10:01:00Z',
    version: 1
  };

  const mockCallItem2: CallTask = {
    id: '33333333-3333-4333-a333-333333333333',
    displayId: 'CALL-0002',
    incidentId: '44444444-4444-4444-a444-444444444444',
    providerTaskId: null,
    purpose: 'appointment_confirmation',
    authorizedContactId: 'auth-contact-2',
    status: 'outcome_unknown',
    simulated: false,
    timeoutSeconds: 120,
    retries: 2,
    createdAt: '2026-07-24T10:05:00Z',
    updatedAt: '2026-07-24T10:06:00Z',
    version: 2
  };

  beforeEach(async () => {
    mockCallPort = {
      list: vi.fn().mockReturnValue(of({ items: [mockCallItem1], nextCursor: 'c_next' })),
      getById: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CallQueueComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    })
    .overrideComponent(CallQueueComponent, {
      set: { providers: [{ provide: CallPort, useValue: mockCallPort }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(CallQueueComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and load call queue on init', () => {
    fixture.detectChanges();
    expect(mockCallPort.list).toHaveBeenCalledWith({ status: undefined, incidentId: undefined, limit: 10 });
    expect(component.calls.length).toBe(1);
    expect(component.calls[0].displayId).toBe('CALL-0001');
    expect(component.nextCursor).toBe('c_next');
  });

  it('should filter queue by status when user selects a status', () => {
    fixture.detectChanges();
    mockCallPort.list.mockReturnValue(of({ items: [mockCallItem2], nextCursor: null }));

    component.onStatusChange('outcome_unknown');
    fixture.detectChanges();

    expect(mockCallPort.list).toHaveBeenCalledWith({ status: 'outcome_unknown', incidentId: undefined, limit: 10 });
    expect(component.calls[0].status).toBe('outcome_unknown');
  });

  it('should validate incident UUID input and display validation error for invalid format', () => {
    fixture.detectChanges();
    mockCallPort.list.mockClear();

    component.onIncidentIdInput('not-a-valid-uuid');
    fixture.detectChanges();

    expect(component.validationError).toContain('Incident ID must be a valid UUID format');
    expect(mockCallPort.list).not.toHaveBeenCalled();

    const bannerEl = fixture.nativeElement.querySelector('.validation-banner');
    expect(bannerEl).toBeTruthy();
    expect(bannerEl.textContent).toContain('valid UUID format');
  });

  it('should accept valid UUID input and trigger list call', () => {
    fixture.detectChanges();
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    mockCallPort.list.mockReturnValue(of({ items: [mockCallItem1], nextCursor: null }));

    component.onIncidentIdInput(validUuid);
    fixture.detectChanges();

    expect(component.validationError).toBeNull();
    expect(mockCallPort.list).toHaveBeenCalledWith({ status: undefined, incidentId: validUuid, limit: 10 });
  });

  it('should append items when loadMore is triggered and handle load-more failure gracefully', () => {
    fixture.detectChanges();
    expect(component.calls.length).toBe(1);

    mockCallPort.list.mockReturnValue(of({ items: [mockCallItem2], nextCursor: 'c_next_2' }));
    component.loadMore();
    fixture.detectChanges();

    expect(component.calls.length).toBe(2);
    expect(component.calls[1].id).toBe(mockCallItem2.id);
    expect(component.nextCursor).toBe('c_next_2');

    // Simulate loadMore failure
    mockCallPort.list.mockReturnValue(throwError(() => ({ status: 500, message: 'Server error' })));
    component.loadMore();
    fixture.detectChanges();

    expect(component.calls.length).toBe(2); // Retains existing loaded items
    expect(component.loadMoreError).toBe('Server error');
  });

  it('should display permission denied state on 403 error', () => {
    mockCallPort.list.mockReturnValue(throwError(() => ({ status: 403, error: { error: { message: 'Forbidden' } } })));
    fixture.detectChanges();

    expect(component.isPermissionDenied).toBe(true);
    const errorEl = fixture.nativeElement.querySelector('.error-card');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Access Denied');
  });

  it('should clear stale rows when a replacement filter request fails', () => {
    fixture.detectChanges();
    expect(component.calls).toHaveLength(1);
    mockCallPort.list.mockReturnValue(
      throwError(() => ({ status: 503, message: 'Service unavailable' }))
    );

    component.onStatusChange('failed');
    fixture.detectChanges();

    expect(component.calls).toHaveLength(0);
    expect(component.errorMessage).toBe('Service unavailable');
    expect(fixture.nativeElement.textContent).toContain('Unable to Load Call Queue');
  });

  it('should display empty state when list returns empty array', () => {
    mockCallPort.list.mockReturnValue(of({ items: [], nextCursor: null }));
    fixture.detectChanges();

    expect(component.calls.length).toBe(0);
    const emptyEl = fixture.nativeElement.querySelector('.empty-card');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent).toContain('No Call Tasks Found');
  });
});
