import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../helpers/apiresponse';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status: HttpStatus;
    let errorMessage: string;

   
    // Set default error message and status code
    errorMessage =
      'Something went wrong while processing your request. Please contact Admin.';
    status = HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponseMessage = Array.isArray(exception.response?.message) ? exception.response?.message[0] : exception.response?.message;

     // Log the exception for debugging purposes
     Logger.error(`Exception caught: ${ exception.message} with exception response: ${exceptionResponseMessage} `, {
      stack: exception.stack,
    });

    // Customize error response based on exception type
    if (exception instanceof UnauthorizedException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      errorMessage =
        (errorResponse as UnauthorizedException).message || exception.message;
    } else if (exception instanceof ForbiddenException) {
      status = HttpStatus.FORBIDDEN;
      errorMessage = 'You do not have permission to access this resource.';
    } else if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      errorMessage = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus() || HttpStatus.FORBIDDEN;
      errorMessage = exception.message || 'Invalid request';
    }

    // Send error response only if headers have not been sent
    if (!response.headersSent) {
      response.status(status).json(
        ApiResponse.fail( exceptionResponseMessage || errorMessage, {
          status,
          error: exception?.response?.message,
        }),
      );
    } else {
      Logger.warn('Headers have already been sent, skipping response');
    }
  }
}
