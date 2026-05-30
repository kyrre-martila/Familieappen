import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";

interface HttpRequestLike {
  url?: string;
}

interface HttpResponseLike {
  status(statusCode: number): {
    json(body: ErrorResponseBody): void;
  };
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(statusCode).json({
      statusCode,
      message: this.getSafeMessage(exception, statusCode),
      error: this.getErrorName(exception, statusCode),
      path: request.url ?? "",
      timestamp: new Date().toISOString()
    });
  }

  private getSafeMessage(exception: unknown, statusCode: number): string {
    if (!(exception instanceof HttpException)) {
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

    return statusCode === HttpStatus.INTERNAL_SERVER_ERROR
      ? "Internal server error"
      : exception.message;
  }

  private getErrorName(exception: unknown, statusCode: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (this.hasError(response)) {
        return response.error;
      }
    }

    return statusCode === HttpStatus.INTERNAL_SERVER_ERROR
      ? "Internal Server Error"
      : "Request Error";
  }

  private hasMessage(value: unknown): value is { message: string | string[] } {
    return (
      typeof value === "object" &&
      value !== null &&
      "message" in value &&
      (typeof value.message === "string" || Array.isArray(value.message))
    );
  }

  private hasError(value: unknown): value is { error: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      "error" in value &&
      typeof value.error === "string"
    );
  }
}
