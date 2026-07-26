import { briefForPurpose } from '../application/call-brief';
import { toProviderSchema } from '../application/call-outcome';
import { DialTarget, DialTargetResolverPort } from '../application/dial-target.port';
import {
  CallAuthorizationError,
  CallProviderConfigurationError,
  CallProviderError
} from '../application/errors';
import { CallTask } from '../domain/call-task.entity';
import {
  CalleApiAdapter,
  CalleApiConfig,
  readCalleConfigFromEnv
} from '../infrastructure/call-e/calle-api.adapter';
import { mapCalleStatus } from '../infrastructure/call-e/calle-status';

const CONFIG: CalleApiConfig = {
  baseUrl: 'https://api.example.test',
  apiKey: 'calle_test_key_0123456789',
  webhookUrl: 'https://fieldrelay.example.test/api/v1/call-e/webhook?token=abc',
  requestTimeoutMs: 5000
};

class StubDialTargets implements DialTargetResolverPort {
  constructor(private readonly target: DialTarget | null) {}
  async resolve(): Promise<DialTarget | null> {
    return this.target;
  }
}

const TARGET: DialTarget = { phoneE164: '+6512345678', region: 'SG', locale: 'en-SG' };

function task(): CallTask {
  return CallTask.create({
    id: '11111111-2222-3333-4444-555555555555',
    displayId: 'CALL-1042',
    incidentId: '99999999-8888-7777-6666-555555555555',
    provider: 'call-e',
    purpose: 'vendor_availability',
    authorizedContactId: 'CNS-4491',
    simulated: false,
    timeoutSeconds: 300,
    retries: 0,
    createdAt: new Date('2026-07-25T10:00:00.000Z')
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('CalleApiAdapter', () => {
  const brief = briefForPurpose('vendor_availability', 'CALL-1042');

  it('describes itself as live and non-simulated', () => {
    const adapter = new CalleApiAdapter(CONFIG, new StubDialTargets(TARGET), async () =>
      jsonResponse(200, { call_id: 'c_1' })
    );
    expect(adapter.describe()).toEqual({ mode: 'live', simulated: false });
  });

  it('posts the brief, recipient and webhook with bearer auth and a per-task idempotency key', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const adapter = new CalleApiAdapter(CONFIG, new StubDialTargets(TARGET), async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return jsonResponse(201, { call_id: 'call_abc123', status: 'queued' });
    });

    const result = await adapter.startCall(task(), brief);

    expect(capturedUrl).toBe('https://api.example.test/v1/calls');
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer calle_test_key_0123456789');
    expect(headers['Idempotency-Key']).toBe('11111111-2222-3333-4444-555555555555');

    const sent = JSON.parse(String(capturedInit?.body)) as Record<string, never>;
    // Shape verified against the CALL-E OpenAPI document: `recipients` is an
    // array and each entry carries a `phones` array.
    expect(sent).toMatchObject({
      recipients: [{ phones: ['+6512345678'], region: 'SG', locale: 'en-SG' }],
      webhook_url: CONFIG.webhookUrl,
      metadata: { call_task_id: '11111111-2222-3333-4444-555555555555', purpose: 'vendor_availability' }
    });
    expect(String(sent.task)).toContain('automated assistant');
    expect(String(sent.task)).toContain('CALL-1042');
    // The schema on the wire is stripped to the keywords CALL-E documents;
    // FieldRelay's stricter bounds stay on its own side of the boundary.
    expect(sent.result_schema).toEqual(toProviderSchema(brief.resultSchema));
    expect(JSON.stringify(sent.result_schema)).not.toContain('minimum');

    expect(result).toEqual({ providerTaskId: 'call_abc123', status: 'queued', simulated: false });
  });

  it('never sends the incident UUID to the provider', async () => {
    let sentBody = '';
    const adapter = new CalleApiAdapter(CONFIG, new StubDialTargets(TARGET), async (_url, init) => {
      sentBody = String(init.body);
      return jsonResponse(201, { call_id: 'call_abc123' });
    });

    await adapter.startCall(task(), brief);

    expect(sentBody).not.toContain('99999999-8888-7777-6666-555555555555');
  });

  it('refuses to dial a contact with no provisioned target', async () => {
    const adapter = new CalleApiAdapter(CONFIG, new StubDialTargets(null), async () => {
      throw new Error('the provider must not be contacted');
    });

    await expect(adapter.startCall(task(), brief)).rejects.toBeInstanceOf(CallAuthorizationError);
  });

  it('raises a provider error on a rejected request without echoing the provider body', async () => {
    const adapter = new CalleApiAdapter(CONFIG, new StubDialTargets(TARGET), async () =>
      jsonResponse(422, { error: 'recipient +6512345678 is blocked' })
    );

    await expect(adapter.startCall(task(), brief)).rejects.toThrow(
      'CALL-E rejected the call request with HTTP 422'
    );
    await expect(adapter.startCall(task(), brief)).rejects.not.toThrow(/6512345678/);
  });

  it('raises a provider error when the response carries no call identifier', async () => {
    const adapter = new CalleApiAdapter(CONFIG, new StubDialTargets(TARGET), async () =>
      jsonResponse(200, { acknowledged: true })
    );

    await expect(adapter.startCall(task(), brief)).rejects.toBeInstanceOf(CallProviderError);
  });

  it('raises a provider error when the transport fails', async () => {
    const adapter = new CalleApiAdapter(CONFIG, new StubDialTargets(TARGET), async () => {
      throw new Error('ECONNREFUSED');
    });

    await expect(adapter.startCall(task(), brief)).rejects.toThrow('CALL-E request failed');
  });

  it('reads the call identifier from an enveloped response', async () => {
    const adapter = new CalleApiAdapter(CONFIG, new StubDialTargets(TARGET), async () =>
      jsonResponse(200, { data: { id: 'nested_call_9', status: 'dialing' } })
    );

    await expect(adapter.startCall(task(), brief)).resolves.toEqual({
      providerTaskId: 'nested_call_9',
      status: 'ringing',
      simulated: false
    });
  });

  it('omits webhook_url when none is configured', async () => {
    let sent: Record<string, unknown> = {};
    const adapter = new CalleApiAdapter(
      { ...CONFIG, webhookUrl: undefined },
      new StubDialTargets(TARGET),
      async (_url, init) => {
        sent = JSON.parse(String(init.body)) as Record<string, unknown>;
        return jsonResponse(200, { call_id: 'c' });
      }
    );

    await adapter.startCall(task(), brief);

    expect(sent).not.toHaveProperty('webhook_url');
  });
});

describe('mapCalleStatus', () => {
  // The first five are the documented CallStatus / AttemptStatus enum values.
  it.each([
    ['queued', 'queued'],
    ['dialing', 'ringing'],
    ['in_progress', 'connected'],
    ['completed', 'completed'],
    ['failed', 'failed'],
    ['canceled', 'failed'],
    ['cancelled', 'failed'],
    ['voicemail', 'no_answer'],
    ['BUSY', 'no_answer']
  ])('maps %s to %s', (raw, expected) => {
    expect(mapCalleStatus(raw)).toBe(expected);
  });

  it('degrades an unknown or absent status to queued rather than inventing a terminal state', () => {
    expect(mapCalleStatus('something_new')).toBe('queued');
    expect(mapCalleStatus(undefined)).toBe('queued');
    expect(mapCalleStatus(42)).toBe('queued');
  });
});

describe('readCalleConfigFromEnv', () => {
  const valid = {
    CALLE_BASE_URL: 'https://api.example.test/',
    CALLE_API_KEY: 'calle_test_key_0123456789'
  };

  it('accepts a valid configuration and strips the trailing slash', () => {
    expect(readCalleConfigFromEnv({ ...valid })).toMatchObject({
      baseUrl: 'https://api.example.test',
      requestTimeoutMs: 45000
    });
  });

  it.each([
    ['a missing base URL', { CALLE_API_KEY: valid.CALLE_API_KEY }],
    ['a plaintext base URL', { ...valid, CALLE_BASE_URL: 'http://api.example.test' }],
    ['a missing API key', { CALLE_BASE_URL: valid.CALLE_BASE_URL }],
    ['a short API key', { ...valid, CALLE_API_KEY: 'short' }],
    ['a plaintext webhook URL', { ...valid, CALLE_WEBHOOK_URL: 'http://hooks.example.test' }]
  ])('refuses %s', (_label, env) => {
    expect(() => readCalleConfigFromEnv(env as NodeJS.ProcessEnv)).toThrow(
      CallProviderConfigurationError
    );
  });

  it('permits a loopback base URL so the adapter can run against a local stub', () => {
    expect(
      readCalleConfigFromEnv({ ...valid, CALLE_BASE_URL: 'http://localhost:8080' }).baseUrl
    ).toBe('http://localhost:8080');
  });

  it('clamps an out-of-range timeout back to the default', () => {
    expect(
      readCalleConfigFromEnv({ ...valid, CALLE_REQUEST_TIMEOUT_MS: '900000' }).requestTimeoutMs
    ).toBe(45000);
  });

  it('defaults high enough that the API is not abandoned mid-create', () => {
    // A live POST /v1/calls was observed taking longer than 15s while the call
    // was accepted and dialled anyway. Timing out below that window abandons a
    // call that is already happening.
    expect(readCalleConfigFromEnv({ ...valid }).requestTimeoutMs).toBeGreaterThanOrEqual(45000);
  });
});
