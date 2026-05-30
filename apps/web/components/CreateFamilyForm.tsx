"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFamily, setActiveFamilyId } from "../lib/api";
import { Button } from "./ui";

export function CreateFamilyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("familyName");

    try {
      const details = await createFamily({ name: typeof name === "string" ? name : "" });
      setActiveFamilyId(details.family.id);
      router.push("/onboarding/add-members");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create family. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="form-field">
        <span className="form-field__label">Family name</span>
        <input className="form-field__input" name="familyName" type="text" placeholder="The Hansen Family" required />
      </label>
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      <Button disabled={isSubmitting} type="submit" variant="primary">
        {isSubmitting ? "Creating…" : "Continue"}
      </Button>
    </form>
  );
}
