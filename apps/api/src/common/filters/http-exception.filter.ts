import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { API_ERROR_CODES, ApiErrorCode } from "../errors";
import { ApiErrorResponse } from "../responses/api-response";

interface HttpResponseLike {
  status(statusCode: number): {
    json(body: ApiErrorResponse): void;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(statusCode).json({
      error: this.getErrorPayload(exception, statusCode)
    });
  }

  private getErrorPayload(exception: unknown, statusCode: number): { code: ApiErrorCode; message: string } {
    if (!(exception instanceof HttpException)) {
      return {
        code: API_ERROR_CODES.SERVER_INTERNAL_ERROR,
        message: "Internal server error"
      };
    }

    const apiError = this.getApiError(exception.getResponse());

    if (apiError) {
      return apiError;
    }

    const message = this.getSafeMessage(exception, statusCode);

    return {
      code: this.getFallbackCode(exception, message),
      message
    };
  }

  private getApiError(response: unknown): { code: ApiErrorCode; message: string } | null {
    if (
      typeof response === "object" &&
      response !== null &&
      "error" in response &&
      typeof response.error === "object" &&
      response.error !== null &&
      "code" in response.error &&
      "message" in response.error &&
      typeof response.error.code === "string" &&
      typeof response.error.message === "string"
    ) {
      return {
        code: response.error.code as ApiErrorCode,
        message: response.error.message
      };
    }

    return null;
  }

  private getSafeMessage(exception: HttpException, statusCode: number): string {
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      return "Internal server error";
    }

    const response = exception.getResponse();

    if (typeof response === "string") {
      return response;
    }

    if (this.hasMessage(response)) {
      return Array.isArray(response.message)
        ? response.message.join(", ")
        : response.message;
    }

    return exception.message || "Request failed";
  }

  private getFallbackCode(exception: HttpException, message: string): ApiErrorCode {
    if (exception instanceof UnauthorizedException) {
      if (message.toLowerCase().includes("expired")) {
        return API_ERROR_CODES.AUTH_EXPIRED_TOKEN;
      }

      if (message.toLowerCase().includes("email") || message.toLowerCase().includes("password")) {
        return API_ERROR_CODES.AUTH_INVALID_CREDENTIALS;
      }

      if (message.toLowerCase().includes("authorization") || message.toLowerCase().includes("bearer")) {
        return API_ERROR_CODES.AUTH_REQUIRES_AUTH;
      }

      return API_ERROR_CODES.AUTH_INVALID_TOKEN;
    }

    if (exception instanceof ConflictException && message.toLowerCase().includes("email")) {
      return API_ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS;
    }

    if (exception instanceof ForbiddenException) {
      return API_ERROR_CODES.FAMILY_ACCESS_DENIED;
    }

    if (exception instanceof NotFoundException) {
      return this.getNotFoundCode(message);
    }

    if (exception instanceof BadRequestException) {
      return message.toLowerCase().includes("required")
        ? API_ERROR_CODES.VALIDATION_MISSING_FIELD
        : API_ERROR_CODES.VALIDATION_INVALID_INPUT;
    }

    return API_ERROR_CODES.SERVER_INTERNAL_ERROR;
  }

  private getNotFoundCode(message: string): ApiErrorCode {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("family")) {
      return API_ERROR_CODES.FAMILY_NOT_FOUND;
    }

    if (normalizedMessage.includes("shopping")) {
      return API_ERROR_CODES.SHOPPING_ITEM_NOT_FOUND;
    }

    if (normalizedMessage.includes("task")) {
      return API_ERROR_CODES.TASK_NOT_FOUND;
    }

    if (normalizedMessage.includes("calendar")) {
      return API_ERROR_CODES.CALENDAR_EVENT_NOT_FOUND;
    }

    if (normalizedMessage.includes("reminder")) {
      return API_ERROR_CODES.REMINDER_NOT_FOUND;
    }

    if (normalizedMessage.includes("shared wishlist item")) {
      return API_ERROR_CODES.WISHLIST_ITEM_MISMATCH;
    }

    if (normalizedMessage.includes("shared wishlist")) {
      return API_ERROR_CODES.WISHLIST_INVALID_SHARE_TOKEN;
    }

    if (normalizedMessage.includes("wishlist")) {
      return API_ERROR_CODES.WISHLIST_NOT_FOUND;
    }

    return API_ERROR_CODES.FAMILY_NOT_FOUND;
  }

  private hasMessage(value: unknown): value is { message: string | string[] } {
    return (
      typeof value === "object" &&
      value !== null &&
      "message" in value &&
      (typeof value.message === "string" || Array.isArray(value.message))
    );
  }
}
