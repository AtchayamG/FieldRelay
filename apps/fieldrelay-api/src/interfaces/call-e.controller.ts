import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
  Req,
  Res
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StartCallUseCase } from '../application/start-call.use-case';
import { GetCallUseCase } from '../application/get-call.use-case';
import { ReconcileProviderCallUseCase } from '../application/reconcile-provider-call.use-case';
import { ListCallsUseCase } from '../application/list-calls.use-case';
import {
  StartCallRequestDto,
  CallStatusResponseDto,
  CallListDto,
  CallTaskResponseDto,
  CallTaskDetailDto,
  ReconcileCallResponseDto,
  ApiResponse
} from '@fieldrelay/contracts';
import { requestIdOf } from './request-context';
import { PublicRoute } from './session.guard';
import { CheckHealthUseCase } from '../application/check-health.use-case';
import { CallValidationError } from '../application/errors';
import type { CallTask } from '../domain/call-task.entity';

@Controller('api/v1/calls')
export class CallEController {
  constructor(
    private readonly startCallUseCase: StartCallUseCase,
    private readonly listCallsUseCase: ListCallsUseCase,
    private readonly getCallUseCase: GetCallUseCase,
    private readonly reconcileProviderCallUseCase: ReconcileProviderCallUseCase
  ) {}

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
        displayId: result.displayId,
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

  @Get()
  async list(
    @Req() request: Request,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
    @Query('incidentId') incidentId?: string
  ): Promise<ApiResponse<CallListDto>> {
    const page = await this.listCallsUseCase.execute({
      limit: parseLimit(limit),
      cursor: cursor || undefined,
      status: status || undefined,
      incidentId: incidentId || undefined
    });
    return envelope(
      { items: page.items.map(toCallTaskDto), nextCursor: page.nextCursor },
      requestIdOf(request)
    );
  }

  @Get(':callTaskId')
  async getById(
    @Req() request: Request,
    @Param('callTaskId') callTaskId: string
  ): Promise<ApiResponse<CallTaskDetailDto>> {
    const { task, outcome } = await this.getCallUseCase.execute(callTaskId);
    return envelope(
      {
        ...toCallTaskDto(task),
        outcome: outcome
          ? {
              structuredResult: outcome.structuredResult,
              taskCompleted: outcome.taskCompleted,
              confidenceScore: outcome.confidenceScore,
              confidenceLabel: outcome.confidenceLabel,
              validationFailed: outcome.validationFailed,
              receivedAt: outcome.receivedAt.toISOString()
            }
          : null
      },
      requestIdOf(request)
    );
  }

  @Post(':callTaskId/reconcile')
  async reconcile(
    @Req() request: Request,
    @Param('callTaskId') callTaskId: string
  ): Promise<ApiResponse<ReconcileCallResponseDto>> {
    return envelope(
      await this.reconcileProviderCallUseCase.execute(callTaskId),
      requestIdOf(request)
    );
  }
}

// Public to the session guard: liveness has to answer before anyone can sign
// in, and load balancers cannot hold a session.
@Controller('health')
@PublicRoute()
export class HealthController {
  constructor(private readonly checkHealth: CheckHealthUseCase) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    return this.checkHealth.execute();
  }
}

function parseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new CallValidationError('limit must be a positive integer');
  }
  return Number(raw);
}

function toCallTaskDto(task: CallTask): CallTaskResponseDto {
  return {
    id: task.id,
    displayId: task.displayId,
    incidentId: task.incidentId,
    providerTaskId: task.providerTaskId,
    purpose: task.purpose,
    authorizedContactId: task.authorizedContactId,
    status: task.status,
    simulated: task.simulated,
    timeoutSeconds: task.timeoutSeconds,
    retries: task.retries,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    version: task.version
  };
}

function envelope<T>(data: T, requestId: string): ApiResponse<T> {
  return { data, meta: { requestId, timestamp: new Date().toISOString() } };
}
