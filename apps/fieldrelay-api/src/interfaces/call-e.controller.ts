import { randomUUID } from 'node:crypto';
import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { StartCallUseCase } from '../application/start-call.use-case';
import { CallAuthorizationError, CallValidationError } from '../application/errors';
import { StartCallRequestDto, CallStatusResponseDto, ApiResponse } from '@fieldrelay/contracts';

@Controller('api/v1/calls')
export class CallEController {
  constructor(private readonly startCallUseCase: StartCallUseCase) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async startCall(
    @Body() dto: StartCallRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string
  ): Promise<ApiResponse<CallStatusResponseDto>> {
    try {
      const result = await this.startCallUseCase.execute({
        incidentId: dto.incidentId,
        authorizedContactId: dto.authorizedContactId,
        purpose: dto.purpose,
        timeoutSeconds: dto.timeoutSeconds,
        retries: dto.retries,
        idempotencyKey: idempotencyKey ?? ''
      });

      return {
        data: {
          callTaskId: result.callTaskId,
          providerTaskId: result.providerTaskId,
          status: result.status,
          simulated: result.simulated
        },
        meta: {
          requestId: `req_${randomUUID()}`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (err) {
      if (err instanceof CallAuthorizationError) throw new ForbiddenException(err.message);
      if (err instanceof CallValidationError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
