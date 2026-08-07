import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiResponse } from '@fieldrelay/contracts';
import { Dispatch, DispatchStatus } from '../domain/dispatch.entity';
import {
  AdvanceDispatchUseCase,
  ListDispatchesUseCase,
  ReleaseDispatchUseCase
} from '../application/dispatch.use-cases';
import { CallValidationError } from '../application/errors';
import { AuthenticatedRequest } from './session.guard';
import { requestIdOf } from './request-context';

export interface DispatchDto {
  id: string;
  displayId: string;
  incidentId: string;
  callTaskId: string;
  approvalId: string;
  contactId: string;
  status: string;
  quotedAmountText: string | null;
  scheduledFor: string | null;
  dispatchedBy: string;
  dispatchedAt: string;
  cancelledReason: string | null;
}

export interface DispatchListDto {
  items: DispatchDto[];
  nextCursor: string | null;
  activeCount: number;
}

export interface ReleaseRequestDto {
  approvalId?: string;
  scheduledFor?: string;
}

export interface AdvanceRequestDto {
  status?: string;
  reason?: string;
}

@Controller('api/v1/dispatches')
export class DispatchController {
  constructor(
    private readonly listDispatches: ListDispatchesUseCase,
    private readonly releaseDispatch: ReleaseDispatchUseCase,
    private readonly advanceDispatch: AdvanceDispatchUseCase
  ) {}

  @Get()
  public async list(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('incidentId') incidentId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ): Promise<ApiResponse<DispatchListDto>> {
    const result = await this.listDispatches.execute({
      status,
      incidentId,
      cursor,
      limit: parseLimit(limit)
    });

    return {
      data: {
        items: result.items.map(toDto),
        nextCursor: result.nextCursor,
        activeCount: result.items.filter(
          (d) => d.status !== 'completed' && d.status !== 'cancelled'
        ).length
      },
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }

  // Releasing takes an approval id and nothing else that matters. The vendor,
  // the incident and the quoted amount are read from rows, so a request body
  // cannot redirect a dispatch to a different vendor than the one that was
  // actually called and approved.
  @Post()
  public async release(
    @Req() request: AuthenticatedRequest,
    @Body() body: ReleaseRequestDto
  ): Promise<ApiResponse<DispatchDto>> {
    const dispatch = await this.releaseDispatch.execute({
      approvalId: body?.approvalId as string,
      scheduledFor: body?.scheduledFor,
      // The signed session is the record of who released it.
      dispatchedBy: request.principal?.sub ?? 'unknown',
      correlationId: requestIdOf(request)
    });

    return {
      data: toDto(dispatch),
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }

  @Post(':dispatchId/status')
  public async advance(
    @Req() request: AuthenticatedRequest,
    @Param('dispatchId') dispatchId: string,
    @Body() body: AdvanceRequestDto
  ): Promise<ApiResponse<DispatchDto>> {
    const dispatch = await this.advanceDispatch.execute({
      dispatchId,
      to: body?.status as DispatchStatus,
      reason: body?.reason,
      actorId: request.principal?.sub ?? 'unknown',
      correlationId: requestIdOf(request)
    });

    return {
      data: toDto(dispatch),
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }
}

function toDto(dispatch: Dispatch): DispatchDto {
  return {
    id: dispatch.id,
    displayId: dispatch.displayId,
    incidentId: dispatch.incidentId,
    callTaskId: dispatch.callTaskId,
    approvalId: dispatch.approvalId,
    contactId: dispatch.contactId,
    status: dispatch.status,
    quotedAmountText: dispatch.quotedAmountText,
    scheduledFor: dispatch.scheduledFor?.toISOString() ?? null,
    dispatchedBy: dispatch.dispatchedBy,
    dispatchedAt: dispatch.dispatchedAt.toISOString(),
    cancelledReason: dispatch.cancelledReason
  };
}

function parseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new CallValidationError('limit must be a positive integer');
  }
  return Number(raw);
}
