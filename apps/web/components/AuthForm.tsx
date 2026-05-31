"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "../lib/api";
import { getUserFacingApiMessage } from "../lib/auth-family";
import { saveAuthSession } from "../lib/session";
import { Button } from "./ui";

interface AuthFormProps {
  children: ReactNode;
  mode?: "login" | "register";
  submitLabel: string;
  submitTo: string;
}

export function AuthForm({ children, mode, submitLabel, submitTo }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!mode) {
      router.push(submitTo);
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        const password = getFormString(formData, "password");
        const confirmPassword = getFormString(formData, "confirmPassword");

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const auth = await register({
          name: getFormString(formData, "name"),
          email: getFormString(formData, "email"),
          password
        });
        saveAuthSession(auth);
      } else {
        const auth = await login({
          email: getFormString(formData, "email"),
          password: getFormString(formData, "password")
        });
        saveAuthSession(auth);
      }

      router.push(submitTo);
    } catch (submitError) {
      setError(getUserFacingApiMessage(submitError, "Something went wrong. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {children}
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      <Button disabled={isSubmitting} type="submit" variant="primary">
        {isSubmitting ? "Please wait…" : submitLabel}
      </Button>
    </form>
  );
}

function getFormString(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}
