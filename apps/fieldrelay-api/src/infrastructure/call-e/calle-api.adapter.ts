import { CallBrief, CallEDescriptor, CallEPort, CallEResult } from '../../application/call-e.port';
import { DialTargetResolverPort } from '../../application/dial-target.port';
import {
  CallAuthorizationError,
  CallProviderConfigurationError,
  CallProviderError
} from '../../application/errors';
import { CallTask } from '../../domain/call-task.entity';
import { asRecord, mapCalleStatus, readBoundedString } from './calle-status';

// CALL-E Developer API, Phase 1 surface:
//   POST /v1/calls              create a call
//   GET  /v1/calls/{id}         read call state and results
//   GET  /v1/calls/{id}/events  developer-facing call events
//   POST <webhook_url>          terminal result webhook
// Documented at https://docs.heycall-e.com and in CALLE-AI/call-e-integrations.
//
// The API is in beta, so every field this adapter reads from a response is
// parsed defensively: an unrecognised shape degrades to a provider error and a
// non-redialable call task, never to a silent success.

const CREATE_CALL_PATH = '/v1/calls';
const MIN_API_KEY_LENGTH = 16;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

export interface CalleApiConfig {
  baseUrl: string;
  apiKey: string;
  // Absolute HTTPS URL CALL-E posts terminal results to. Optional: without it
  // the call still runs, but lifecycle updates only arrive via polling.
  webhookUrl?: string;
  requestTimeoutMs: number;
}

export function readCalleConfigFromEnv(env: NodeJS.ProcessEnv): CalleApiConfig {
  const baseUrl = (env.CALLE_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const apiKey = (env.CALLE_API_KEY ?? '').trim();
  const webhookUrl = (env.CALLE_WEBHOOK_URL ?? '').trim();

  if (!baseUrl) {
    throw new CallProviderConfigurationError(
      'CALLE_BASE_URL is required when CALL_E_MODE=live'
    );
  }
  let parsedBase: URL;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    throw new CallProviderConfigurationError('CALLE_BASE_URL must be an absolute URL');
  }
  // A plaintext base URL would put the bearer credential on the wire. Localhost
  // is exempt so the adapter can be exercised against a local stub.
  const isLoopback = parsedBase.hostname === 'localhost' || parsedBase.hostname === '127.0.0.1';
  if (parsedBase.protocol !== 'https:' && !isLoopback) {
    throw new CallProviderConfigurationError('CALLE_BASE_URL must use https');
  }
  if (apiKey.length < MIN_API_KEY_LENGTH) {
    throw new CallProviderConfigurationError(
      `CALLE_API_KEY is required when CALL_E_MODE=live and must be at least ${MIN_API_KEY_LENGTH} characters`
    );
  }
  if (webhookUrl) {
    let parsedHook: URL;
    try {
      parsedHook = new URL(webhookUrl);
    } catch {
      throw new CallProviderConfigurationError('CALLE_WEBHOOK_URL must be an absolute URL');
    }
    const hookIsLoopback =
      parsedHook.hostname === 'localhost' || parsedHook.hostname === '127.0.0.1';
    if (parsedHook.protocol !== 'https:' && !hookIsLoopback) {
      throw new CallProviderConfigurationError('CALLE_WEBHOOK_URL must use https');
    }
  }

  const rawTimeout = Number(env.CALLE_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const requestTimeoutMs =
    Number.isInteger(rawTimeout) && rawTimeout >= MIN_TIMEOUT_MS && rawTimeout <= MAX_TIMEOUT_MS
      ? rawTimeout
      : DEFAULT_TIMEOUT_MS;

  return {
    baseUrl,
    apiKey,
    webhookUrl: webhookUrl || undefined,
    requestTimeoutMs
  };
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export class CalleApiAdapter implements CallEPort {
  constructor(
    private readonly config: CalleApiConfig,
    private readonly dialTargets: DialTargetResolverPort,
    private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis)
  ) {}

  public describe(): CallEDescriptor {
    return { mode: 'live', simulated: false };
  }

  public async startCall(task: CallTask, brief: CallBrief): Promise<CallEResult> {
    // Resolving the number here, after the task and its idempotency reservation
    // are already durable, keeps the raw number's lifetime to a single call
    // frame. It is never persisted, logged, or returned.
    const target = await this.dialTargets.resolve(task.authorizedContactId);
    if (!target) {
      throw new CallAuthorizationError(
        `No dial target is provisioned for contact ${task.authorizedContactId}`
      );
    }

    const body = {
      task: `${brief.disclosure}\n\n${brief.goal}`,
      // `recipients` is an array of recipient objects, each holding a `phones`
      // array — verified against the CALL-E Developer API OpenAPI document
      // (v0.6.0), not inferred from the README prose. FieldRelay authorizes
      // exactly one contact per call task, so exactly one is ever sent.
      recipients: [
        {
          phones: [target.phoneE164],
          region: target.region,
          locale: target.locale
        }
      ],
      result_schema: brief.resultSchema,
      metadata: {
        // Correlation only. No tenant, address, contact or incident free text.
        call_task_id: task.id,
        call_display_id: task.displayId,
        purpose: task.purpose
      },
      ...(this.config.webhookUrl ? { webhook_url: this.config.webhookUrl } : {})
    };

    const response = await this.post(CREATE_CALL_PATH, body, task.id);
    const payload = await this.readJson(response);

    if (!response.ok) {
      // The provider's own error text can quote the request, so it is never
      // echoed. The status code is enough to triage.
      throw new CallProviderError(
        `CALL-E rejected the call request with HTTP ${response.status}`
      );
    }

    const providerTaskId = readCallId(payload);
    if (!providerTaskId) {
      throw new CallProviderError(
        'CALL-E accepted the request but returned no recognisable call identifier'
      );
    }

    return {
      providerTaskId,
      status: mapCalleStatus(readStatus(payload)),
      simulated: false
    };
  }

  private async post(path: string, body: unknown, idempotencyKey: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      return await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          // The call task ID is a server-generated UUID that exists exactly once
          // per authorized call, so replaying this request can never dial twice
          // even if FieldRelay retries the HTTP call itself.
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      const reason = error instanceof Error && error.name === 'AbortError' ? 'timed out' : 'failed';
      throw new CallProviderError(`CALL-E request ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    let text: string;
    try {
      text = await response.text();
    } catch {
      return null;
    }
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new CallProviderError('CALL-E response exceeded the accepted size bound');
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  }
}

function readCallId(payload: unknown): string | null {
  return readBoundedString(payload, ['call_id', 'callId', 'id', 'run_id', 'runId']);
}

function readStatus(payload: unknown): unknown {
  const record = asRecord(payload);
  if (!record) {
    return undefined;
  }
  const nested = asRecord(record.call) ?? asRecord(record.data);
  return record.status ?? record.state ?? nested?.status ?? nested?.state;
}
