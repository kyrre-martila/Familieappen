import { apiRequest } from "../../lib/api/client";
import type {
  AuthResponse,
  AuthUser,
  FamilyDetails,
  FamilyInvitation,
  FamilyWithMembership,
  LogoutResponse,
  PasswordResetMessage,
} from "./types";

export function loginWithEmail(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: input,
  });
}

export function logoutSession(accessToken: string) {
  return apiRequest<LogoutResponse>("/auth/logout", {
    method: "POST",
    accessToken,
  });
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<AuthUser>("/me", { accessToken });
}

export function listFamilies(accessToken: string) {
  return apiRequest<FamilyWithMembership[]>("/families", { accessToken });
}

export function forgotPassword(input: { email: string }) {
  return apiRequest<PasswordResetMessage>("/auth/forgot-password", {
    method: "POST",
    body: input,
  });
}

export function resetPassword(input: { token: string; password: string }) {
  return apiRequest<PasswordResetMessage>("/auth/reset-password", {
    method: "POST",
    body: input,
  });
}

export function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export function updateCurrentUserProfile(
  accessToken: string,
  input: Partial<
    Pick<AuthUser, "firstName" | "middleName" | "lastName" | "phone">
  >,
) {
  return apiRequest<AuthUser>("/me", {
    method: "PATCH",
    accessToken,
    body: input,
  });
}

export function createFamily(accessToken: string, input: { name: string }) {
  return apiRequest<FamilyDetails>("/families", {
    method: "POST",
    accessToken,
    body: input,
  });
}

export function getFamily(accessToken: string, familyId: string) {
  return apiRequest<FamilyDetails>(
    `/families/${encodeURIComponent(familyId)}`,
    { accessToken },
  );
}

export function joinFamilyByCode(accessToken: string, code: string) {
  return apiRequest<FamilyInvitation>("/families/join-by-code", {
    method: "POST",
    accessToken,
    body: { code },
  });
}
