import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

interface IErrorResponseBody {
  statusCode: HttpStatus;
  message: string | string[];
  error: string;
}

/**
 * Global safety net for every unhandled exception.
 * Domain/HTTP exceptions should already carry the right status and message;
 * this filter only maps low-level infrastructure errors (TypeORM) and
 * guarantees a consistent error shape for anything else.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.resolveBody(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private resolveBody(exception: unknown): IErrorResponseBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ??
            exception.message);
      return {
        statusCode: status,
        message,
        error: exception.name.replace('Exception', ''),
      };
    }

    if (
      exception instanceof QueryFailedError &&
      (exception as unknown as { code?: string }).code === 'ER_DUP_ENTRY'
    ) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'El recurso ya existe',
        error: 'Conflict',
      };
    }

    if (exception instanceof EntityNotFoundError) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Recurso no encontrado',
        error: 'Not Found',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
    };
  }
}
