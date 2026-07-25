import { Controller, Post, Req, Res, Headers, Body, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProcessProviderCallbackUseCase } from '../application/process-provider-callback.use-case';
import { ApiResponse, ProviderCallbackAcceptedResponseDto } from '@fieldrelay/contracts';
import { requestIdOf } from './request-context';

@Controller('api/v1/call-e/callbacks')
export class ProviderCallbackController {
  constructor(private readonly processCallbackUseCase: ProcessProviderCallbackUseCase) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async handleCallback(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: Record<string, unknown>,
    @Headers('x-fieldrelay-timestamp') timestampHeader?: string,
    @Headers('x-fieldrelay-signature') signatureHeader?: string
  ): Promise<ApiResponse<ProviderCallbackAcceptedResponseDto>> {
    const requestId = requestIdOf(request);
    const rawBody: Buffer =
      (request as Request & { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(body ?? {}));

    const signingSecret = process.env.CALLBACK_SIGNING_SECRET;

    const outcome = await this.processCallbackUseCase.accept({
      rawBody,
      timestampHeader,
      signatureHeader,
      body: body ?? {},
      signingSecret,
      correlationId: requestId
    });

    if (outcome.type === 'exact_replay') {
      response.setHeader('Idempotency-Replayed', 'true');
      return {
        data: {
          accepted: true,
          eventId: outcome.eventId
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Process asynchronously after safe acceptance
    setImmediate(() => {
      this.processCallbackUseCase.processAccepted(outcome.eventId).catch(() => undefined);
    });

    return {
      data: {
        accepted: true,
        eventId: outcome.eventId
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString()
      }
    };
  }
}
