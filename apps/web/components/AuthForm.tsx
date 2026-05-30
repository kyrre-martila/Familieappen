"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

interface AuthFormProps {
  children: ReactNode;
  submitLabel: string;
  submitTo: string;
}

export function AuthForm({ children, submitLabel, submitTo }: AuthFormProps) {
  const router = useRouter();

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(submitTo);
      }}
    >
      {children}
      <Button type="submit" variant="primary">{submitLabel}</Button>
    </form>
  );
}
