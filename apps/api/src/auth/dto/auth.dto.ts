export interface RegisterRequestDto {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}

export interface LoginRequestDto {
  email?: unknown;
  password?: unknown;
}

export interface SafeUserDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface AuthResponseDto {
  user: SafeUserDto;
  tokens: AuthTokensDto;
}
