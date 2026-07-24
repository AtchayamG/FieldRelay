import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  ApiResponse,
  CreateIncidentRequestDto,
  IncidentListDto,
  IncidentResponseDto
} from '@fieldrelay/contracts';
import { CreateIncidentUseCase } from '../application/create-incident.use-case';
import { GetIncidentUseCase } from '../application/get-incident.use-case';
import { ListIncidentsUseCase } from '../application/list-incidents.use-case';
import { CallValidationError } from '../application/errors';
import type { Incident } from '../domain/incident.entity';
import { requestIdOf } from './request-context';

@Controller('api/v1/incidents')
export class IncidentController {
  constructor(
    private readonly createIncident: CreateIncidentUseCase,
    private readonly listIncidents: ListIncidentsUseCase,
    private readonly getIncident: GetIncidentUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async create(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: CreateIncidentRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string
  ): Promise<ApiResponse<IncidentResponseDto>> {
    const requestId = requestIdOf(request);
    const result = await this.createIncident.execute({
      propertyId: dto?.propertyId,
      unit: dto?.unit,
      type: dto?.type,
      priority: dto?.priority,
      description: dto?.description,
      reportedBy: dto?.reportedBy,
      idempotencyKey: idempotencyKey ?? '',
      correlationId: requestId
    });

    // The aggregate is replayed from the original result; request metadata is
    // fresh. This header tells a client that no second incident was created.
    if (result.replayed) response.setHeader('Idempotency-Replayed', 'true');

    return this.envelope(toIncidentDto(result.incident), requestId);
  }

  @Get()
  public async list(
    @Req() request: Request,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string
  ): Promise<ApiResponse<IncidentListDto>> {
    const page = await this.listIncidents.execute({
      limit: parseLimit(limit),
      cursor: cursor || undefined,
      status: status || undefined
    });

    return this.envelope(
      { items: page.items.map(toIncidentDto), nextCursor: page.nextCursor },
      requestIdOf(request)
    );
  }

  @Get(':incidentId')
  public async getById(
    @Req() request: Request,
    @Param('incidentId') incidentId: string
  ): Promise<ApiResponse<IncidentResponseDto>> {
    const incident = await this.getIncident.execute(incidentId);
    return this.envelope(toIncidentDto(incident), requestIdOf(request));
  }

  private envelope<T>(data: T, requestId: string): ApiResponse<T> {
    return { data, meta: { requestId, timestamp: new Date().toISOString() } };
  }
}

// Query strings are always text; reject anything non-numeric here so the use
// case receives either a real number or nothing at all.
function parseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new CallValidationError('limit must be a positive integer');
  }
  return Number(raw);
}

// The aggregate never leaves the interface layer; this is the only place its
// shape is translated into a transport DTO.
function toIncidentDto(incident: Incident): IncidentResponseDto {
  return {
    id: incident.id,
    displayId: incident.displayId,
    propertyId: incident.propertyId,
    unit: incident.unit,
    type: incident.type,
    priority: incident.priority,
    status: incident.status,
    description: incident.description,
    reportedBy: incident.reportedBy,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    version: incident.version
  };
}
