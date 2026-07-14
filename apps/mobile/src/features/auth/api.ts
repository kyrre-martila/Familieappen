import { apiRequest } from "../../lib/api/client";
import type { AuthResponse, AuthUser, FamilyWithMembership, LogoutResponse, PasswordResetMessage } from "./types";

export function loginWithEmail(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: input });
}

export function logoutSession(accessToken: string) {
  return apiRequest<LogoutResponse>("/auth/logout", { method: "POST", accessToken });
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<AuthUser>("/me", { accessToken });
}

export function listFamilies(accessToken: string) {
  return apiRequest<FamilyWithMembership[]>("/families", { accessToken });
}

export function forgotPassword(input: { email: string }) {
  return apiRequest<PasswordResetMessage>("/auth/forgot-password", { method: "POST", body: input });
}

export function resetPassword(input: { token: string; password: string }) {
  return apiRequest<PasswordResetMessage>("/auth/reset-password", { method: "POST", body: input });
}
