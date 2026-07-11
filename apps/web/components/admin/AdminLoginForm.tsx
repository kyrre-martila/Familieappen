"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { adminLogin } from "../../lib/admin-client-api";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value === "/admin/login") return "/admin";
  return value;
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await adminLogin({ email, password });
      router.replace(safeReturnTo(searchParams.get("returnTo")));
      router.refresh();
    } catch {
      setError("Unable to sign in with the provided credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <div className="admin-field">
        <label htmlFor="admin-email">Email</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="admin-field">
        <label htmlFor="admin-password">Password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
      <button className="admin-button admin-button--primary" type="submit" disabled={!canSubmit} aria-busy={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
