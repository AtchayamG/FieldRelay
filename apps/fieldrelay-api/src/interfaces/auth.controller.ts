import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiResponse } from '@fieldrelay/contracts';
import { IssueSessionUseCase } from '../application/issue-session.use-case';
import { AuthenticatedRequest, PublicRoute } from './session.guard';
import { requestIdOf } from './request-context';

export interface SessionResponseDto {
  token: string;
  expiresAt: string;
  subject: string;
  role: string;
  demo: boolean;
}

export interface PrincipalResponseDto {
  subject: string;
  role: string;
  demo: boolean;
  expiresAt: string;
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly issueSession: IssueSessionUseCase) {}

  // Public by necessity: issuing a session cannot itself require a session.
  @Post('session')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  public createSession(
    @Req() request: Request,
    @Body() body: { email?: string; password?: string }
  ): ApiResponse<SessionResponseDto> {
    const result = this.issueSession.execute({
      email: body?.email ?? '',
      password: body?.password ?? ''
    });

    return {
      data: result,
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }

  // Lets the frontend confirm a restored token is still valid before it trusts
  // its own cached session, rather than discovering the expiry on a later
  // mutating request.
  @Get('session')
  public readSession(@Req() request: AuthenticatedRequest): ApiResponse<PrincipalResponseDto> {
    const principal = request.principal;
    return {
      data: {
        subject: principal?.sub ?? '',
        role: principal?.role ?? '',
        demo: principal?.demo ?? true,
        expiresAt: new Date((principal?.exp ?? 0) * 1000).toISOString()
      },
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }
}
