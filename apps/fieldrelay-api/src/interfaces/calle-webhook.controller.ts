import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Res
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiResponse } from '@fieldrelay/contracts';
import { ProcessProviderCallbackUseCase } from '../application/process-provider-callback.use-case';
import {
  CALLE_WEBHOOK_TRANSLATOR,
  CalleWebhookTranslator
} from '../infrastructure/call-e/calle-webhook.translator';
import { requestIdOf } from './request-context';
import { PublicRoute } from './session.guard';

export interface CalleWebhookAcceptedDto {
  accepted: boolean;
  // false when the delivery was authentic and well-formed but carried no
  // actionable state transition.
  applied: boolean;
  eventId: string | null;
}

// CALL-E posts terminal call results to the webhook_url supplied on call
// creation. That URL carries a secret token, which is the only thing that
// authenticates this route, so the token is verified before the body is read.
// Public to the session guard because CALL-E has no session: this route
// authenticates every request by the secret token carried in its webhook URL.
@Controller('api/v1/call-e/webhook')
@PublicRoute()
export class CalleWebhookController {
  constructor(
    private readonly processCallbackUseCase: ProcessProviderCallbackUseCase,
    @Inject(CALLE_WEBHOOK_TRANSLATOR) private readonly translator: CalleWebhookTranslator
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhook(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: Record<string, unknown>,
    @Query('token') queryToken?: string,
    @Headers('x-calle-webhook-token') headerToken?: string
  ): Promise<ApiResponse<CalleWebhookAcceptedDto>> {
    const requestId = requestIdOf(request);

    this.translator.authenticate(headerToken ?? queryToken);

    const translated = this.translator.translate(body ?? {});
    const meta = { requestId, timestamp: new Date().toISOString() };

    if (!translated) {
      // Authentic but not actionable. Answering 202 stops the provider from
      // retrying a delivery that will never apply.
      return { data: { accepted: true, applied: false, eventId: null }, meta };
    }

    const rawBody: Buffer =
      (request as Request & { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(body ?? {}));

    const outcome = await this.processCallbackUseCase.acceptVerified(translated, rawBody);

    if (outcome.type === 'exact_replay') {
      response.setHeader('Idempotency-Replayed', 'true');
      return { data: { accepted: true, applied: false, eventId: outcome.eventId }, meta };
    }

    // Processing runs after acceptance so a slow state transition cannot hold
    // the provider's delivery connection open.
    setImmediate(() => {
      this.processCallbackUseCase.processAccepted(outcome.eventId).catch(() => undefined);
    });

    return { data: { accepted: true, applied: true, eventId: outcome.eventId }, meta };
  }
}
