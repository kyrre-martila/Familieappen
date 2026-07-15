import { apiRequest } from "../../lib/api/client";
import type {
  AuthResponse,
  AuthUser,
  FamilyDetails,
  FamilyInvitation,
  CurrentUserPendingFamilyAccess,
  FamilyInviteResponse,
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

export function getMyPendingFamilyAccess(accessToken: string) {
  return apiRequest<CurrentUserPendingFamilyAccess>("/families/my-pending-access", { accessToken });
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
    Pick<AuthUser, "firstName" | "middleName" | "lastName" | "phone" | "birthDate">
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

export function inviteFamilyMember(accessToken: string, familyId: string, input: { email: string; role: "PARENT" | "CHILD" | "GUEST" }) {
  return apiRequest<FamilyInviteResponse>(`/families/${encodeURIComponent(familyId)}/invitations`, {
    method: "POST",
    accessToken,
    body: input,
  });
}

export function uploadCurrentUserAvatar(accessToken: string, file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append("avatar", file as unknown as Blob);
  return apiRequest<AuthUser>("/me/avatar", { method: "POST", accessToken, body: form });
}

export function removeCurrentUserAvatar(accessToken: string) {
  return apiRequest<AuthUser>("/me/avatar", { method: "DELETE", accessToken });
}
