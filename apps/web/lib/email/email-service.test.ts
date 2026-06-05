import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { sendEmail } from "./email-service";
import { renderEmailTemplate } from "./email-templates";
import type { EmailTemplate } from "./email-types";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test("renders the wishlist invite template without throwing", () => {
  const rendered = renderEmailTemplate("wishlist-invite", {
    inviterName: "Ola",
    ownerName: "Kari",
    inviteUrl: "https://familieappen.no/invite/wishlist/test-token",
  });

  assert.equal(rendered.subject, "Du er invitert til en ønskeliste");
  assert.match(rendered.html, /Åpne ønskeliste/);
  assert.match(rendered.text, /Ola har invitert deg til å følge ønskelisten til Kari\./);
  assert.equal(
    rendered.link,
    "https://familieappen.no/invite/wishlist/test-token",
  );
});

test("sendEmail returns ok in dev-log mode when no provider is configured", async () => {
  delete process.env.EMAIL_PROVIDER;
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "development",
    configurable: true,
  });

  const infoMessages: unknown[] = [];
  const originalInfo = console.info;
  console.info = (...messages: unknown[]) => {
    infoMessages.push(messages);
  };

  try {
    const result = await sendEmail({
      to: "mottaker@example.com",
      template: "wishlist-invite",
      data: {
        inviterName: "Ola",
        ownerName: "Kari",
        inviteUrl: "https://familieappen.no/invite/wishlist/test-token",
      },
    });

    assert.deepEqual(result, { ok: true, mode: "dev-log" });
    assert.equal(infoMessages.length, 1);
  } finally {
    console.info = originalInfo;
  }
});

test("unsupported templates fail clearly", async () => {
  assert.throws(
    () =>
      renderEmailTemplate("unknown-template" as EmailTemplate, {} as never),
    /Unsupported email template: unknown-template/,
  );

  const result = await sendEmail({
    to: "mottaker@example.com",
    template: "unknown-template" as EmailTemplate,
    data: {} as never,
  });

  assert.equal(result.ok, false);
  assert.equal(result.mode, "dev-log");
  assert.match(result.error ?? "", /Unsupported email template: unknown-template/);
});
