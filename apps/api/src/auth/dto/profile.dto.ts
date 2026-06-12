export interface UserProfileDto {
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

export interface UpdateUserProfileRequestDto {
  name?: unknown;
  firstName?: unknown;
  middleName?: unknown;
  lastName?: unknown;
  displayName?: unknown;
  avatarUrl?: unknown;
  email?: unknown;
  phone?: unknown;
}

export interface ChangePasswordRequestDto {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
}

export interface ChangePasswordResponseDto {
  message: string;
}


export interface DeleteAccountRequestDto {
  password?: unknown;
  confirmationText?: unknown;
}

export interface DeleteAccountResponseDto {
  message: string;
}
