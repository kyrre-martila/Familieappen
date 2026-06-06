import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type FeedbackType = "feedback" | "bug";

interface FeedbackPayload {
  familyId?: unknown;
  message?: unknown;
  type?: unknown;
  userId?: unknown;
}

function isFeedbackType(type: unknown): type is FeedbackType {
  return type === "feedback" || type === "bug";
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  let payload: FeedbackPayload;

  try {
    payload = (await request.json()) as FeedbackPayload;
  } catch {
    return NextResponse.json({ error: { code: "validation.invalid_json", message: "Invalid JSON." } }, { status: 400 });
  }

  const type = payload.type;
  const message = normalizeOptionalString(payload.message);
  const userId = normalizeOptionalString(payload.userId);
  const familyId = normalizeOptionalString(payload.familyId);

  if (!isFeedbackType(type) || !message) {
    return NextResponse.json({ error: { code: "validation.invalid_input", message: "Feedback type and message are required." } }, { status: 400 });
  }

  const feedback = {
    type,
    message,
    userId,
    familyId,
    createdAt: new Date().toISOString()
  };

  const feedbackDir = path.join(process.cwd(), "var");
  await mkdir(feedbackDir, { recursive: true });
  await appendFile(path.join(feedbackDir, "feedback.jsonl"), `${JSON.stringify(feedback)}\n`, "utf8");

  return NextResponse.json({ data: feedback }, { status: 201 });
}
