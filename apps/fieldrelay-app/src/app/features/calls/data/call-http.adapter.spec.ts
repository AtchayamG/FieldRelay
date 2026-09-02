import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import type { ApiResponse, CallListDto, CallTaskResponseDto } from '@fieldrelay/contracts';
import { CallHttpAdapter } from './call-http.adapter';
import { CallTask } from '../domain/call.model';

describe('CallHttpAdapter', () => {
  let adapter: CallHttpAdapter;
  let httpMock: HttpTestingController;

  const mockCallDto: CallTaskResponseDto = {
    id: '11111111-1111-4111-a111-111111111111',
    displayId: 'CALL-0001',
    incidentId: '22222222-2222-4222-a222-222222222222',
    providerTaskId: 'prov-task-123',
    purpose: 'vendor_availability',
    authorizedContactId: 'contact-789',
    status: 'connected',
    simulated: true,
    timeoutSeconds: 60,
    retries: 0,
    createdAt: '2026-07-24T10:00:00Z',
    updatedAt: '2026-07-24T10:01:00Z',
    version: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CallHttpAdapter
      ]
    });

    adapter = TestBed.inject(CallHttpAdapter);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch call list and map DTOs to domain entities', () => {
    const mockResponse: ApiResponse<CallListDto> = {
      data: {
        items: [mockCallDto],
        nextCursor: 'cursor_123'
      },
      meta: { requestId: 'req_1', timestamp: new Date().toISOString() }
    };

    adapter.list().subscribe((result) => {
      expect(result.items.length).toBe(1);
      expect(result.nextCursor).toBe('cursor_123');
      const item = result.items[0];
      expect(item.id).toBe(mockCallDto.id);
      expect(item.displayId).toBe('CALL-0001');
      expect(item.status).toBe('connected');
      expect(item.simulated).toBe(true);
      expect(item.providerTaskId).toBe('prov-task-123');
    });

    const req = httpMock.expectOne((r) => r.url === '/api/v1/calls');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should pass status, incidentId, cursor, and limit query parameters when specified', () => {
    const mockResponse: ApiResponse<CallListDto> = {
      data: { items: [], nextCursor: null },
      meta: { requestId: 'req_2', timestamp: new Date().toISOString() }
    };

    adapter
      .list({
        status: 'queued',
        incidentId: '22222222-2222-4222-a222-222222222222',
        cursor: 'c_abc',
        limit: 10
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/calls');
    expect(req.request.params.get('status')).toBe('queued');
    expect(req.request.params.get('incidentId')).toBe('22222222-2222-4222-a222-222222222222');
    expect(req.request.params.get('cursor')).toBe('c_abc');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(mockResponse);
  });

  it('should fetch single call by id and map providerTaskId null correctly', () => {
    const nullProviderDto: CallTaskResponseDto = {
      ...mockCallDto,
      providerTaskId: null
    };

    const mockResponse: ApiResponse<CallTaskResponseDto> = {
      data: nullProviderDto,
      meta: { requestId: 'req_3', timestamp: new Date().toISOString() }
    };

    adapter.getById(mockCallDto.id).subscribe((call: CallTask) => {
      expect(call.id).toBe(mockCallDto.id);
      expect(call.providerTaskId).toBeNull();
    });

    const req = httpMock.expectOne(`/api/v1/calls/${mockCallDto.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should propagate HTTP errors when GET calls fails', () => {
    adapter.getById('non-existent-id').subscribe({
      next: () => expect.fail('should have failed'),
      error: (err) => {
        expect(err.status).toBe(404);
      }
    });

    const req = httpMock.expectOne('/api/v1/calls/non-existent-id');
    req.flush({ error: { code: 'NOT_FOUND', message: 'Call task not found' } }, { status: 404, statusText: 'Not Found' });
  });

  it('should reconcile an existing provider task without a call-start request', () => {
    adapter.reconcile(mockCallDto.id).subscribe((result) => {
      expect(result).toEqual({ status: 'completed', applied: true });
    });

    const req = httpMock.expectOne(`/api/v1/calls/${mockCallDto.id}/reconcile`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({
      data: { status: 'completed', applied: true },
      meta: { requestId: 'req_reconcile', timestamp: new Date().toISOString() }
    });
  });
});
