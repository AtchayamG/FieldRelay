import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiResponse } from '@fieldrelay/contracts';
import { Approval } from '../domain/approval.entity';
import { CallOutcome } from '../application/call-outcome';
import { APPROVAL_REASON_TEXT } from '../application/approval-policy';
import { DecideApprovalUseCase } from '../application/decide-approval.use-case';
import { ListApprovalsUseCase } from '../application/list-approvals.use-case';
import { CallValidationError } from '../application/errors';
import { AuthenticatedRequest } from './session.guard';
import { requestIdOf } from './request-context';

export interface ApprovalDto {
  id: string;
  displayId: string;
  incidentId: string;
  callTaskId: string;
  status: string;
  reasons: string[];
  // Rendered beside each reason so the queue explains itself rather than
  // showing an operator a code they have to look up.
  reasonText: string[];
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  outcome: {
    structuredResult: Record<string, unknown>;
    taskCompleted: boolean;
    confidenceScore: number | null;
    confidenceLabel: string | null;
    validationFailed: boolean;
  } | null;
}

export interface ApprovalListDto {
  items: ApprovalDto[];
  nextCursor: string | null;
  pendingCount: number;
}

export interface DecisionRequestDto {
  decision?: string;
  note?: string;
}

@Controller('api/v1/approvals')
export class ApprovalController {
  constructor(
    private readonly listApprovals: ListApprovalsUseCase,
    private readonly decideApproval: DecideApprovalUseCase
  ) {}

  @Get()
  public async list(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('incidentId') incidentId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ): Promise<ApiResponse<ApprovalListDto>> {
    const result = await this.listApprovals.execute({
      status,
      incidentId,
      cursor,
      limit: parseLimit(limit)
    });

    return {
      data: {
        items: result.items.map((entry) => toDto(entry.approval, entry.outcome)),
        nextCursor: result.nextCursor,
        pendingCount: result.pendingCount
      },
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }

  @Post(':approvalId/decision')
  public async decide(
    @Req() request: AuthenticatedRequest,
    @Param('approvalId') approvalId: string,
    @Body() body: DecisionRequestDto
  ): Promise<ApiResponse<ApprovalDto>> {
    const { approval, outcome } = await this.decideApproval.execute({
      approvalId,
      decision: body?.decision as 'approved' | 'rejected',
      // The signed session is the record of who decided. A caller cannot name
      // somebody else as the approver.
      decidedBy: request.principal?.sub ?? 'unknown',
      decisionNote: body?.note,
      correlationId: requestIdOf(request)
    });

    return {
      data: toDto(approval, outcome),
      meta: { requestId: requestIdOf(request), timestamp: new Date().toISOString() }
    };
  }
}

function toDto(approval: Approval, outcome: CallOutcome | null): ApprovalDto {
  return {
    id: approval.id,
    displayId: approval.displayId,
    incidentId: approval.incidentId,
    callTaskId: approval.callTaskId,
    status: approval.status,
    reasons: approval.reasons,
    reasonText: approval.reasons.map((reason) => APPROVAL_REASON_TEXT[reason]),
    decidedBy: approval.decidedBy,
    decidedAt: approval.decidedAt?.toISOString() ?? null,
    decisionNote: approval.decisionNote,
    createdAt: approval.createdAt.toISOString(),
    outcome: outcome
      ? {
          structuredResult: outcome.structuredResult,
          taskCompleted: outcome.taskCompleted,
          confidenceScore: outcome.confidenceScore,
          confidenceLabel: outcome.confidenceLabel,
          validationFailed: outcome.validationFailed
        }
      : null
  };
}

function parseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new CallValidationError('limit must be a positive integer');
  }
  return Number(raw);
}
