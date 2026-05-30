import { HttpException, HttpStatus } from "@nestjs/common";
import { ApiErrorCode } from "./api-error-codes";

export class ApiException extends HttpException {
  constructor(statusCode: HttpStatus, code: ApiErrorCode, message: string) {
    super({ error: { code, message } }, statusCode);
  }
}
