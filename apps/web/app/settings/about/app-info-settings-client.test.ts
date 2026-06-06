import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

const source = readFileSync(resolve("app/settings/about/AppInfoSettingsClient.tsx"), "utf8");
const apiSource = readFileSync(resolve("lib/api.ts"), "utf8");

test("feedback and bug actions open real forms", () => {
  assert(source.includes('label="Send tilbakemelding"'));
  assert(source.includes('setSheet("feedback")'));
  assert(source.includes('label="Rapporter feil"'));
  assert(source.includes('setSheet("bug")'));
  assert(source.includes('isBug ? "Rapporter feil" : "Send tilbakemelding"'));
  assert(source.includes('isBug ? "Hva skjedde?" : "Melding"'));
});

test("feedback form submits to the authenticated backend helper with type and app version", () => {
  assert(source.includes('import { ApiError, submitFeedback }'));
  assert(source.includes("await submitFeedback({"));
  assert(source.includes("type,"));
  assert(source.includes("message: trimmedMessage"));
  assert(source.includes("appVersion: version"));
  assert(apiSource.includes('return apiRequest<FeedbackSubmission>("/feedback"'));
  assert.equal(source.includes('fetch("/api/feedback"'), false);
  assert.equal(source.includes("feedback.jsonl"), false);
});

test("submit loading state disables actions and keeps form open until backend success", () => {
  assert(source.includes('disabled={status === "sending"}'));
  assert(source.includes('status === "sending" ? "Sender…" : "Send"'));

  const handleSendIndex = source.indexOf("async function handleSend");
  assert.notEqual(handleSendIndex, -1);
  const tryIndex = source.indexOf("try {", handleSendIndex);
  const catchIndex = source.indexOf("} catch (error) {", tryIndex);
  const tryBlock = source.slice(tryIndex, catchIndex);
  assert(tryBlock.includes("await submitFeedback"));
  assert(tryBlock.includes("onSent("));

  const finallyBoundary = source.indexOf("  }\n\n  return (", catchIndex);
  const catchBlock = source.slice(catchIndex, finallyBoundary);
  assert.equal(catchBlock.includes("onSent("), false);
  assert(catchBlock.includes("setStatus(\"error\")"));
  assert(catchBlock.includes("setError(error instanceof ApiError ? error.message"));
});

test("success closes the sheet and shows calm confirmation copy", () => {
  assert(source.includes('"Takk for tilbakemeldingen."'));
  assert(source.includes('"Takk, feilen er rapportert."'));
  assert(source.includes('role="status"'));
  assert(source.includes('setSheet(null); setSuccessMessage(message);'));
});

test("backend and rate limit errors are shown clearly while the form stays open", () => {
  assert(source.includes("error instanceof ApiError ? error.message"));
  assert(source.includes("profile-edit-sheet__error"));
  const catchIndex = source.indexOf("} catch (error) {");
  const catchBlock = source.slice(catchIndex, source.indexOf("  }\n\n  return (", catchIndex));
  assert.equal(catchBlock.includes("setSheet(null)"), false);
  assert.equal(catchBlock.includes("onSent("), false);
});

test("privacy note is shown in feedback forms", () => {
  assert(source.includes("Ikke del sensitive opplysninger her."));
  assert(source.includes("app-info-sheet__privacy-note"));
});
