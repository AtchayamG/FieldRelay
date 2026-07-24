import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CallEPort } from '../application/call-e.port';
import { CheckHealthUseCase } from '../application/check-health.use-case';
import { ContactAuthorizationPort } from '../application/contact-authorization.port';
import { CreateIncidentUseCase } from '../application/create-incident.use-case';
import { GetIncidentUseCase } from '../application/get-incident.use-case';
import { ListIncidentsUseCase } from '../application/list-incidents.use-case';
import { StartCallUseCase } from '../application/start-call.use-case';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';
import { ApiExceptionFilter } from '../interfaces/api-exception.filter';
import { CallEController, HealthController } from '../interfaces/call-e.controller';
import { IncidentController } from '../interfaces/incident.controller';

interface JsonResponse<T> {
  response: Response;
  body: T;
}

describe('FieldRelay HTTP API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let provider: jest.Mocked<CallEPort>;

  beforeEach(async () => {
    const transactions = new InMemoryTransactionManager(new InMemoryDatabase());
    provider = { startCall: jest.fn() };
    provider.startCall.mockResolvedValue({
      providerTaskId: 'demo_provider_task',
      status: 'queued',
      simulated: true
    });
    const contacts: ContactAuthorizationPort = {
      resolve: jest.fn().mockResolvedValue({
        contactId: 'CNS-4491',
        authorizationStatus: 'authorized',
        allowedPurposes: ['vendor_availability']
      })
    };

    const module = await Test.createTestingModule({
      controllers: [IncidentController, CallEController, HealthController],
      providers: [
        {
          provide: CreateIncidentUseCase,
          useValue: new CreateIncidentUseCase(transactions)
        },
        {
          provide: ListIncidentsUseCase,
          useValue: new ListIncidentsUseCase(transactions)
        },
        {
          provide: GetIncidentUseCase,
          useValue: new GetIncidentUseCase(transactions)
        },
        {
          provide: StartCallUseCase,
          useValue: new StartCallUseCase(provider, contacts, transactions)
        },
        {
          provide: CheckHealthUseCase,
          useValue: new CheckHealthUseCase(transactions)
        }
      ]
    }).compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates, lists and retrieves an incident through the public contract', async () => {
    const created = await createIncident('http_e2e_create_1');

    expect(created.response.status).toBe(201);
    expect(created.body.data).toMatchObject({
      propertyId: 'PROP-E2E',
      unit: '7A',
      type: 'plumbing',
      priority: 'high',
      status: 'intake'
    });
    expect(created.body.meta.requestId).toMatch(/^req_/);

    const listed = await getJson<{ data: { items: Array<{ id: string }> } }>(
      '/api/v1/incidents?limit=10&status=intake'
    );
    expect(listed.response.status).toBe(200);
    expect(listed.body.data.items.map((item) => item.id)).toContain(created.body.data.id);

    const fetched = await getJson<{ data: { id: string; displayId: string } }>(
      `/api/v1/incidents/${created.body.data.id}`
    );
    expect(fetched.response.status).toBe(200);
    expect(fetched.body.data.id).toBe(created.body.data.id);
    expect(fetched.body.data.displayId).toBe(created.body.data.displayId);
  });

  it('replays an incident create and rejects mismatched key reuse', async () => {
    const first = await createIncident('http_e2e_replay_1');
    const replay = await createIncident('http_e2e_replay_1');

    expect(replay.response.status).toBe(201);
    expect(replay.response.headers.get('idempotency-replayed')).toBe('true');
    expect(replay.body.data.id).toBe(first.body.data.id);

    const mismatch = await postJson<{ error: { code: string } }>(
      '/api/v1/incidents',
      { ...incidentBody, priority: 'critical' },
      'http_e2e_replay_1'
    );
    expect(mismatch.response.status).toBe(409);
    expect(mismatch.body.error.code).toBe('IDEMPOTENCY_KEY_MISMATCH');
  });

  it('starts one simulated call for an existing incident and replays it safely', async () => {
    const created = await createIncident('http_e2e_call_incident');
    const callBody = {
      incidentId: created.body.data.id,
      authorizedContactId: 'CNS-4491',
      purpose: 'vendor_availability',
      timeoutSeconds: 300,
      retries: 0
    };

    const first = await postJson<{ data: { callTaskId: string; simulated: boolean } }>(
      '/api/v1/calls',
      callBody,
      'http_e2e_call_1'
    );
    const replay = await postJson<{ data: { callTaskId: string; simulated: boolean } }>(
      '/api/v1/calls',
      callBody,
      'http_e2e_call_1'
    );

    expect(first.response.status).toBe(202);
    expect(first.body.data.simulated).toBe(true);
    expect(replay.response.headers.get('idempotency-replayed')).toBe('true');
    expect(replay.body.data.callTaskId).toBe(first.body.data.callTaskId);
    expect(provider.startCall).toHaveBeenCalledTimes(1);
  });

  it('returns stable errors and a database-backed health response', async () => {
    const missing = await getJson<{ error: { code: string; requestId: string } }>(
      '/api/v1/incidents/11111111-1111-4111-8111-111111119999'
    );
    expect(missing.response.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect(missing.body.error.requestId).toMatch(/^req_/);

    const health = await getJson<{ status: string }>('/health');
    expect(health.response.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
  });

  const incidentBody = {
    propertyId: 'PROP-E2E',
    unit: '7A',
    type: 'plumbing',
    priority: 'high',
    description: 'Fictional end-to-end incident.',
    reportedBy: 'Demo Operator'
  };

  function createIncident(
    idempotencyKey: string
  ): Promise<
    JsonResponse<{
      data: {
        id: string;
        displayId: string;
        propertyId: string;
        unit: string | null;
        type: string;
        priority: string;
        status: string;
      };
      meta: { requestId: string };
    }>
  > {
    return postJson('/api/v1/incidents', incidentBody, idempotencyKey);
  }

  async function getJson<T>(path: string): Promise<JsonResponse<T>> {
    const response = await fetch(`${baseUrl}${path}`);
    return { response, body: (await response.json()) as T };
  }

  async function postJson<T>(
    path: string,
    body: object,
    idempotencyKey: string
  ): Promise<JsonResponse<T>> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify(body)
    });
    return { response, body: (await response.json()) as T };
  }
});
