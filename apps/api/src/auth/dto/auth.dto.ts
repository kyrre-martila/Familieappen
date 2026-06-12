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
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
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

export interface RefreshResponseDto {
  tokens: AuthTokensDto;
}

export interface LogoutResponseDto {
  message: string;
}
