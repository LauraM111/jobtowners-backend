import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { errorResponse } from '../helpers/response.helper';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        errorDetails = (exceptionResponse as any).error;
      } else {
        message = exceptionResponse || exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = exception.stack;
    }

    // Special handling for webhook routes
    const isWebhookRoute = request.url.includes('/webhooks/') || request.url.includes('/webhook');
    
    if (isWebhookRoute) {
      // For webhook routes, always return 200 to prevent retries
      this.logger.error(
        `WEBHOOK ERROR: ${request.method} ${request.url} - Original Status: ${status} - ${message}`,
        errorDetails,
      );
      
      response
        .status(HttpStatus.OK)
        .json({ 
          received: true, 
          error: message,
          originalStatus: status 
        });
      return;
    }

    // Log the error for non-webhook routes
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      errorDetails,
    );

    // Send the error response for non-webhook routes
    response
      .status(status)
      .json(errorResponse(message, errorDetails));
  }
} 