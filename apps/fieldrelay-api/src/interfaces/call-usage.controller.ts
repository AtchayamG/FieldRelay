import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiResponse } from '@fieldrelay/contracts';
import { CallUsage, GetCallUsageUseCase } from '../application/get-call-usage.use-case';
import { requestIdOf } from './request-context';

// Deliberately not mounted under /api/v1/calls: that controller already claims
// /:callTaskId, which would swallow a /usage segment and try to look it up as a
// call identifier.
@Controller('api/v1/call-usage')
export class CallUsageController {
  constructor(private readonly usage: GetCallUsageUseCase) {}

  @Get()
  public async read(@Req() request: Request): Promise<ApiResponse<CallUsage>> {
    return {
      data: await this.usage.execute(),
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }
}
