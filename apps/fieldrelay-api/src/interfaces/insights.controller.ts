import { Controller, Get, Req } from '@nestjs/common';
import { ApiResponse } from '@fieldrelay/contracts';
import { AnalyticsResult, GetAnalyticsUseCase } from '../application/get-analytics.use-case';
import {
  ListTechniciansUseCase,
  TechnicianListResult
} from '../application/list-technicians.use-case';
import { AuthenticatedRequest } from './session.guard';
import { requestIdOf } from './request-context';

// Two read-only reporting endpoints. Neither computes a rate; both return
// counts of rows that exist. See GetAnalyticsUseCase for why.
@Controller('api/v1')
export class InsightsController {
  constructor(
    private readonly getAnalytics: GetAnalyticsUseCase,
    private readonly listTechnicians: ListTechniciansUseCase
  ) {}

  @Get('analytics')
  public async analytics(
    @Req() request: AuthenticatedRequest
  ): Promise<ApiResponse<AnalyticsResult>> {
    return {
      data: await this.getAnalytics.execute(),
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }

  @Get('technicians')
  public async technicians(
    @Req() request: AuthenticatedRequest
  ): Promise<ApiResponse<TechnicianListResult>> {
    return {
      data: await this.listTechnicians.execute(),
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }
}
