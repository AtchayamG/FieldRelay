import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { IncidentHttpAdapter } from './incident-http.adapter';
import type { ApiResponse, IncidentListDto, IncidentResponseDto } from '@fieldrelay/contracts';

describe('IncidentHttpAdapter', () => {
  let adapter: IncidentHttpAdapter;
  let httpMock: HttpTestingController;

  const mockIncidentDto: IncidentResponseDto = {
    id: '11111111-1111-4111-8111-111111111111',
    displayId: 'INC-2026-0001',
    propertyId: 'PROP-101',
    unit: '3A',
    type: 'plumbing',
    priority: 'high',
    status: 'intake',
    description: 'Major pipe leak in kitchen',
    reportedBy: 'John Doe',
    createdAt: '2026-07-24T10:00:00.000Z',
    updatedAt: '2026-07-24T10:05:00.000Z',
    version: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IncidentHttpAdapter,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    adapter = TestBed.inject(IncidentHttpAdapter);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list() should fetch incidents with query parameters and map response', async () => {
    const mockListResponse: ApiResponse<IncidentListDto> = {
      data: {
        items: [mockIncidentDto],
        nextCursor: 'cursor_123'
      },
      meta: { requestId: 'req_1', timestamp: new Date().toISOString() }
    };

    const promise = firstValueFrom(
      adapter.list({ status: 'intake', limit: 10 })
    );

    const req = httpMock.expectOne(
      (request) =>
        request.url === '/api/v1/incidents' &&
        request.params.get('status') === 'intake' &&
        request.params.get('limit') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockListResponse);

    const result = await promise;
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe(mockIncidentDto.id);
    expect(result.items[0].displayId).toBe('INC-2026-0001');
    expect(result.items[0].unit).toBe('3A');
    expect(result.nextCursor).toBe('cursor_123');
  });

  it('getById() should fetch single incident by UUID', async () => {
    const mockSingleResponse: ApiResponse<IncidentResponseDto> = {
      data: mockIncidentDto,
      meta: { requestId: 'req_2', timestamp: new Date().toISOString() }
    };

    const promise = firstValueFrom(adapter.getById(mockIncidentDto.id));

    const req = httpMock.expectOne(`/api/v1/incidents/${mockIncidentDto.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSingleResponse);

    const incident = await promise;
    expect(incident.id).toBe(mockIncidentDto.id);
    expect(incident.propertyId).toBe('PROP-101');
    expect(incident.type).toBe('plumbing');
  });

  it('create() should send POST request with Idempotency-Key header', async () => {
    const mockCreatedResponse: ApiResponse<IncidentResponseDto> = {
      data: mockIncidentDto,
      meta: { requestId: 'req_3', timestamp: new Date().toISOString() }
    };
    const idempotencyKey = 'test-idempotency-key-uuid';

    const promise = firstValueFrom(
      adapter.create(
        {
          propertyId: 'PROP-101',
          unit: '3A',
          type: 'plumbing',
          priority: 'high',
          description: 'Major pipe leak in kitchen',
          reportedBy: 'John Doe'
        },
        idempotencyKey
      )
    );

    const req = httpMock.expectOne('/api/v1/incidents');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe(idempotencyKey);
    expect(req.request.body).toEqual({
      propertyId: 'PROP-101',
      unit: '3A',
      type: 'plumbing',
      priority: 'high',
      description: 'Major pipe leak in kitchen',
      reportedBy: 'John Doe'
    });
    req.flush(mockCreatedResponse);

    const created = await promise;
    expect(created.id).toBe(mockIncidentDto.id);
  });

  it('handles 404 error on getById()', async () => {
    const promise = firstValueFrom(adapter.getById('non-existent-id'));

    const req = httpMock.expectOne('/api/v1/incidents/non-existent-id');
    req.flush(
      { error: { code: 'NOT_FOUND', message: 'Incident not found' } },
      { status: 404, statusText: 'Not Found' }
    );

    await expect(promise).rejects.toMatchObject({ status: 404 });
  });
});
