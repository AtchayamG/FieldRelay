import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiResponse } from '@fieldrelay/contracts';
import {
  GetMissionControlUseCase,
  MissionControlState
} from '../application/get-mission-control.use-case';
import { requestIdOf } from './request-context';

// Session-protected by the global guard. Returns the real operational picture:
// counts derived from rows that exist, plus the guardrails currently in force.
@Controller('api/v1/mission-control')
export class MissionControlController {
  constructor(private readonly missionControl: GetMissionControlUseCase) {}

  @Get()
  public async read(@Req() request: Request): Promise<ApiResponse<MissionControlState>> {
    return {
      data: await this.missionControl.execute(),
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }
}
