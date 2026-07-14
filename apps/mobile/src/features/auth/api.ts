import { apiRequest } from "../../lib/api/client";
import type { AuthResponse, AuthUser, LogoutResponse } from "./types";

export function loginWithEmail(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: input });
}

export function logoutSession(accessToken: string) {
  return apiRequest<LogoutResponse>("/auth/logout", { method: "POST", accessToken });
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<AuthUser>("/me", { accessToken });
}
