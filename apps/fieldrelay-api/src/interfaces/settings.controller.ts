import { Body, Controller, Delete, Get, Put, Req } from '@nestjs/common';
import { ApiResponse } from '@fieldrelay/contracts';
import {
  DialTargetView,
  ManageDialTargetUseCase,
  SUPPORTED_REGIONS
} from '../application/manage-dial-target.use-case';
import { AuthenticatedRequest } from './session.guard';
import { requestIdOf } from './request-context';

export interface SetDialTargetRequestDto {
  contactId?: string;
  phoneE164?: string;
  region?: string;
  locale?: string;
}

export interface DialTargetSettingsDto extends DialTargetView {
  supportedRegions: readonly string[];
}

// Session-protected by the global guard. Reading tells an operator which number
// a live call would reach; writing changes it, and is refused outright unless
// the deployment opted in with CALLE_ALLOW_RUNTIME_DIAL_TARGET.
@Controller('api/v1/settings/dial-target')
export class SettingsController {
  constructor(private readonly dialTarget: ManageDialTargetUseCase) {}

  @Get()
  public async read(
    @Req() request: AuthenticatedRequest
  ): Promise<ApiResponse<DialTargetSettingsDto>> {
    return this.envelope(await this.dialTarget.view(), request);
  }

  @Put()
  public async set(
    @Req() request: AuthenticatedRequest,
    @Body() body: SetDialTargetRequestDto
  ): Promise<ApiResponse<DialTargetSettingsDto>> {
    const view = await this.dialTarget.set({
      contactId: body?.contactId ?? '',
      phoneE164: body?.phoneE164 ?? '',
      region: body?.region ?? '',
      locale: body?.locale ?? '',
      actor: request.principal?.sub ?? 'unknown',
      correlationId: requestIdOf(request)
    });
    return this.envelope(view, request);
  }

  @Delete()
  public async clear(
    @Req() request: AuthenticatedRequest
  ): Promise<ApiResponse<DialTargetSettingsDto>> {
    const view = await this.dialTarget.clear(
      request.principal?.sub ?? 'unknown',
      requestIdOf(request)
    );
    return this.envelope(view, request);
  }

  private envelope(
    view: DialTargetView,
    request: AuthenticatedRequest
  ): ApiResponse<DialTargetSettingsDto> {
    return {
      data: { ...view, supportedRegions: SUPPORTED_REGIONS },
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }
}
