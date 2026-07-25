import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { CallEPort } from '../application/call-e.port';
import { CheckHealthUseCase } from '../application/check-health.use-case';
import { ContactAuthorizationPort } from '../application/contact-authorization.port';
import { CreateIncidentUseCase } from '../application/create-incident.use-case';
import { GetIncidentUseCase } from '../application/get-incident.use-case';
import { ListIncidentsUseCase } from '../application/list-incidents.use-case';
import { ListCallsUseCase } from '../application/list-calls.use-case';
import { GetCallUseCase } from '../application/get-call.use-case';
import { StartCallUseCase } from '../application/start-call.use-case';
import { ProcessProviderCallbackUseCase } from '../application/process-provider-callback.use-case';
import { ReconcileStaleReservationsUseCase } from '../application/reconcile-stale-reservations.use-case';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';
import { ApiExceptionFilter } from '../interfaces/api-exception.filter';
import { CallEController, HealthController } from '../interfaces/call-e.controller';
import { IncidentController } from '../interfaces/incident.controller';
import { ProviderCallbackController } from '../interfaces/provider-callback.controller';
import { CalleWebhookController } from '../interfaces/calle-webhook.controller';
import {
  CALLE_WEBHOOK_TRANSLATOR,
  CalleWebhookTranslator
} from '../infrastructure/call-e/calle-webhook.translator';

interface JsonResponse<T> {
  response: Response;
  body: T;
}

describe('FieldRelay HTTP API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let provider: jest.Mocked<CallEPort>;
  const signingSecret = 'e2e_test_signing_secret_123456';
  const webhookToken = 'e2e_calle_webhook_token_abcdefghijkl';

  beforeEach(async () => {
    process.env.CALLBACK_SIGNING_SECRET = signingSecret;
    const transactions = new InMemoryTransactionManager(new InMemoryDatabase());
    provider = {
      describe: jest.fn().mockReturnValue({ mode: 'demo', simulated: true }),
      startCall: jest.fn()
    };
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
      controllers: [
        IncidentController,
        CallEController,
        HealthController,
        ProviderCallbackController,
        CalleWebhookController
      ],
      providers: [
        {
          provide: CALLE_WEBHOOK_TRANSLATOR,
          useValue: new CalleWebhookTranslator(webhookToken)
        },
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
          provide: ProcessProviderCallbackUseCase,
          useValue: new ProcessProviderCallbackUseCase(transactions)
        },
        {
          provide: ReconcileStaleReservationsUseCase,
          useValue: new ReconcileStaleReservationsUseCase(transactions)
        },
        {
          provide: ListCallsUseCase,
          useValue: new ListCallsUseCase(transactions)
        },
        {
          provide: GetCallUseCase,
          useValue: new GetCallUseCase(transactions)
        },
        {
          provide: CheckHealthUseCase,
          useValue: new CheckHealthUseCase(transactions)
        }
      ]
    }).compile();

    app = module.createNestApplication({ rawBody: true });
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

    const list = await getJson<{
      data: { items: Array<{ id: string; incidentId: string; simulated: boolean }> };
    }>(`/api/v1/calls?incidentId=${created.body.data.id}&status=queued`);
    expect(list.response.status).toBe(200);
    expect(list.body.data.items).toEqual([
      expect.objectContaining({
        id: first.body.data.callTaskId,
        incidentId: created.body.data.id,
        simulated: true
      })
    ]);

    const detail = await getJson<{ data: { id: string; providerTaskId: string } }>(
      `/api/v1/calls/${first.body.data.callTaskId}`
    );
    expect(detail.response.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      id: first.body.data.callTaskId,
      providerTaskId: 'demo_provider_task'
    });
  });

  it('accepts valid provider callbacks, replays exact delivery, and rejects conflicts & bad signatures', async () => {
    const bodyObj = {
      eventId: 'evt_e2e_cb_1',
      providerTaskId: 'demo_provider_task',
      status: 'connected'
    };

    const first = await postCallback(bodyObj);
    expect(first.response.status).toBe(202);
    expect(first.body.data).toEqual({ accepted: true, eventId: 'evt_e2e_cb_1' });

    // Exact replay
    const replay = await postCallback(bodyObj);
    expect(replay.response.status).toBe(202);
    expect(replay.response.headers.get('idempotency-replayed')).toBe('true');
    expect(replay.body.data).toEqual({ accepted: true, eventId: 'evt_e2e_cb_1' });

    // Conflicting reuse of same eventId
    const conflict = await postCallback({
      eventId: 'evt_e2e_cb_1',
      providerTaskId: 'demo_provider_task',
      status: 'completed'
    });
    expect(conflict.response.status).toBe(409);

    // Invalid signature
    const badSigResponse = await fetch(`${baseUrl}/api/v1/call-e/callbacks`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-fieldrelay-timestamp': String(Math.floor(Date.now() / 1000)),
        'x-fieldrelay-signature': '0'.repeat(64)
      },
      body: JSON.stringify(bodyObj)
    });
    expect(badSigResponse.status).toBe(401);
  });

  it('authenticates the CALL-E webhook by token and applies a terminal delivery once', async () => {
    const incident = await createIncident('idem-calle-hook-1');
    const started = await postJson<{ data: { callTaskId: string } }>(
      '/api/v1/calls',
      {
        incidentId: incident.body.data.id,
        authorizedContactId: 'CNS-4491',
        purpose: 'vendor_availability'
      },
      'idem-calle-hook-call-1'
    );
    expect(started.response.status).toBe(202);

    const delivery = { call_id: 'demo_provider_task', status: 'completed' };

    const unauthenticated = await postCalleWebhook(delivery, 'not-the-right-token-but-long-enough');
    expect(unauthenticated.response.status).toBe(401);

    const missingToken = await fetch(`${baseUrl}/api/v1/call-e/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(delivery)
    });
    expect(missingToken.status).toBe(401);

    const accepted = await postCalleWebhook<{
      data: { accepted: boolean; applied: boolean; eventId: string };
    }>(delivery, webhookToken);
    expect(accepted.response.status).toBe(202);
    expect(accepted.body.data.applied).toBe(true);

    // The same terminal delivery again must be recognised, not re-applied.
    const replay = await postCalleWebhook<{ data: { applied: boolean } }>(delivery, webhookToken);
    expect(replay.response.status).toBe(202);
    expect(replay.body.data.applied).toBe(false);
    expect(replay.response.headers.get('idempotency-replayed')).toBe('true');

    // Authentic but non-actionable lifecycle noise is absorbed, not applied.
    const notActionable = await postCalleWebhook<{ data: { applied: boolean; eventId: null } }>(
      { call_id: 'demo_provider_task', status: 'queued' },
      webhookToken
    );
    expect(notActionable.response.status).toBe(202);
    expect(notActionable.body.data.applied).toBe(false);
    expect(notActionable.body.data.eventId).toBeNull();
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

  async function postCalleWebhook<T = { data: { accepted: boolean; applied: boolean } }>(
    body: Record<string, unknown>,
    token: string
  ): Promise<JsonResponse<T>> {
    const response = await fetch(`${baseUrl}/api/v1/call-e/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-calle-webhook-token': token
      },
      body: JSON.stringify(body)
    });
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

  async function postCallback<T = { data: { accepted: boolean; eventId: string } }>(
    body: object,
    timestampOffsetSec = 0
  ): Promise<JsonResponse<T>> {
    const rawBody = Buffer.from(JSON.stringify(body));
    const timestampHeader = String(Math.floor(Date.now() / 1000) + timestampOffsetSec);
    const signatureHeader = createHmac('sha256', signingSecret)
      .update(`${timestampHeader}.`)
      .update(rawBody)
      .digest('hex');

    const response = await fetch(`${baseUrl}/api/v1/call-e/callbacks`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-fieldrelay-timestamp': timestampHeader,
        'x-fieldrelay-signature': signatureHeader
      },
      body: JSON.stringify(body)
    });
    return { response, body: (await response.json()) as T };
  }
});
