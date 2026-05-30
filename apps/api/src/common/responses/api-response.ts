export interface ApiResponse<TData> {
  data: TData;
}

export function createApiResponse<TData>(data: TData): ApiResponse<TData> {
  return { data };
}
