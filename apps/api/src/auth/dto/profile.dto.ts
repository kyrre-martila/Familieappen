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
