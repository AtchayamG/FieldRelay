import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  Res
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StartCallUseCase } from '../application/start-call.use-case';
import { StartCallRequestDto, CallStatusResponseDto, ApiResponse } from '@fieldrelay/contracts';
import { requestIdOf } from './request-context';
import { CheckHealthUseCase } from '../application/check-health.use-case';

@Controller('api/v1/calls')
export class CallEController {
  constructor(private readonly startCallUseCase: StartCallUseCase) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async startCall(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: StartCallRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string
  ): Promise<ApiResponse<CallStatusResponseDto>> {
    const requestId = requestIdOf(request);
    // Application errors are translated centrally by ApiExceptionFilter so
    // every endpoint returns the same error envelope.
    const result = await this.startCallUseCase.execute({
      incidentId: dto?.incidentId,
      authorizedContactId: dto?.authorizedContactId,
      purpose: dto?.purpose,
      timeoutSeconds: dto?.timeoutSeconds,
      retries: dto?.retries,
      idempotencyKey: idempotencyKey ?? '',
      correlationId: requestId
    });

    // The recorded call result is replayed while request metadata is fresh.
    // This header makes it explicit that no second call was placed.
    if (result.replayed) response.setHeader('Idempotency-Replayed', 'true');

    return {
      data: {
        callTaskId: result.callTaskId,
        providerTaskId: result.providerTaskId,
        status: result.status,
        simulated: result.simulated
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString()
      }
    };
  }
}

@Controller('health')
export class HealthController {
  constructor(private readonly checkHealth: CheckHealthUseCase) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    return this.checkHealth.execute();
  }
}
