export type AuthSyncEvent = "login" | "logout";

export class ResumeGate {
  private lastAcceptedAt = Number.NEGATIVE_INFINITY;
  constructor(private readonly throttleMs: number) {}
  shouldRun(now: number): boolean {
    if (now - this.lastAcceptedAt < this.throttleMs) return false;
    this.lastAcceptedAt = now;
    return true;
  }
}

export class OperationEpoch {
  private epoch = 0;
  begin(): number { return ++this.epoch; }
  invalidate(): void { this.epoch += 1; }
  isCurrent(candidate: number): boolean { return candidate === this.epoch; }
}

export function parseAuthSyncEvent(value: unknown): AuthSyncEvent | null {
  if (!value || typeof value !== "object") return null;
  const event = (value as { event?: unknown }).event;
  return event === "login" || event === "logout" ? event : null;
}
