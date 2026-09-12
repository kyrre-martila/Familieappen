import type { FamilyMember, HealthPlan, HealthPlanOccurrence } from "../../lib/api";

export type FamilyRequestToken = { context: string | null; generation: number };

/** Small generation guard used alongside AbortController for responses that win an abort race. */
export class FamilyRequestGuard {
  private context: string | null = null;
  private generation = 0;

  changeContext(context: string | null): void { this.context = context; this.generation += 1; }
  begin(): FamilyRequestToken { return { context: this.context, generation: ++this.generation }; }
  invalidate(): void { this.generation += 1; }
  isCurrent(token: FamilyRequestToken): boolean { return token.context === this.context && token.generation === this.generation; }
}

export function emptyHealthPlanOverviewState(): { members: FamilyMember[]; plans: HealthPlan[]; items: HealthPlanOccurrence[]; memberId: string; planId: string; upcomingCount: number } {
  return { members: [], plans: [], items: [], memberId: "", planId: "", upcomingCount: 5 };
}

export function canEditHealthPlan(status: HealthPlan["status"]): boolean {
  return status === "DRAFT" || status === "ACTIVE" || status === "PAUSED";
}
