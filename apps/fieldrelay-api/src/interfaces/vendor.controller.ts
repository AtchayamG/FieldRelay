import { Controller, Get, Req } from '@nestjs/common';
import { ApiResponse } from '@fieldrelay/contracts';
import { ListVendorsUseCase, VendorView } from '../application/list-vendors.use-case';
import { AuthenticatedRequest } from './session.guard';
import { requestIdOf } from './request-context';

export interface VendorListDto {
  items: VendorView[];
  callableCount: number;
  totalCount: number;
}

// Read-only, and it stays that way.
//
// Authorization is granted out of band — a vendor consents to being called, and
// that consent is recorded outside this application. An endpoint that let an
// operator grant themselves permission to call somebody would defeat the entire
// point of having an authorization boundary.
@Controller('api/v1/vendors')
export class VendorController {
  constructor(private readonly listVendors: ListVendorsUseCase) {}

  @Get()
  public async list(
    @Req() request: AuthenticatedRequest
  ): Promise<ApiResponse<VendorListDto>> {
    const items = await this.listVendors.execute();

    return {
      data: {
        items,
        callableCount: items.filter((item) => item.callable).length,
        totalCount: items.length
      },
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }
}
