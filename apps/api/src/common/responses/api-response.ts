export interface ApiResponse<TData> {
  data: TData;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export function createApiResponse<TData>(data: TData): ApiResponse<TData> {
  return { data };
}
