import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiError, ApiErrorCode } from '@fieldrelay/contracts';
import {
  CallAuthorizationError,
  CallValidationError,
  CallbackAuthenticationError,
  IdempotencyConflictError,
  NotFoundError,
  OperationInProgressError
} from '../application/errors';
import { IncidentInvariantError } from '../domain/incident.entity';
import { requestIdOf } from './request-context';

// Single place where application and domain errors become HTTP. Keeping the
// mapping here is what lets every endpoint return the same error envelope and
// the use cases stay free of transport concerns.
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const requestId = requestIdOf(http.getRequest<Request>());

    const { status, code, message } = this.classify(exception);
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Only unexpected failures are logged with their stack; expected refusals
      // are normal traffic.
      this.logger.error(`[${requestId}] ${String(exception)}`);
    }

    const body: ApiError = { error: { code, message, requestId } };
    response.status(status).json(body);
  }

  private classify(exception: unknown): {
    status: number;
    code: ApiErrorCode;
    message: string;
  } {
    if (exception instanceof CallValidationError || exception instanceof IncidentInvariantError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_FAILED',
        message: exception.message
      };
    }
    if (exception instanceof CallAuthorizationError) {
      return {
        status: HttpStatus.FORBIDDEN,
        code: 'NOT_AUTHORIZED',
        message: exception.message
      };
    }
    if (exception instanceof CallbackAuthenticationError) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        code: 'NOT_AUTHORIZED',
        message: exception.message
      };
    }
    if (exception instanceof NotFoundError) {
      return { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message: exception.message };
    }
    if (exception instanceof IdempotencyConflictError) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'IDEMPOTENCY_KEY_MISMATCH',
        message: exception.message
      };
    }
    if (exception instanceof OperationInProgressError) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'OPERATION_IN_PROGRESS',
        message: exception.message
      };
    }
    // Framework-raised failures (unknown route, malformed JSON body, ...).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code: ApiErrorCode =
        status === HttpStatus.NOT_FOUND
          ? 'NOT_FOUND'
          : status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN
            ? 'NOT_AUTHORIZED'
            : status >= HttpStatus.INTERNAL_SERVER_ERROR
              ? 'INTERNAL_ERROR'
              : 'VALIDATION_FAILED';
      return { status, code, message: exception.message };
    }
    // Nothing internal leaks: an unmapped failure is always a generic 500.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'The request could not be completed.'
    };
  }
}
