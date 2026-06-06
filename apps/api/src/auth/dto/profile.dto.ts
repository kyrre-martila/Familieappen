export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequestDto {
  name?: unknown;
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
