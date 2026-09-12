import type { HealthPlanHistory, HealthPlanLog, HealthPlanNote } from "../../lib/api";

export type HealthPlanTimelineEntry =
  | { kind: "history"; id: string; at: string; title: string; actorDisplayName: string | null }
  | { kind: "note"; id: string; at: string; title: string; actorDisplayName: string | null; text: string; context: HealthPlanNote["targetContext"] };

const numberMetadata = (metadata: Record<string, unknown> | null, key: string) => typeof metadata?.[key] === "number" ? metadata[key] : null;
const stringMetadata = (metadata: Record<string, unknown> | null, key: string) => typeof metadata?.[key] === "string" ? metadata[key] : null;

export function formatHealthPlanHistoryEntry(entry: Pick<HealthPlanHistory, "type" | "metadata">, stepOrders: ReadonlyMap<string, number> = new Map()): string {
  const metadata = entry.metadata;
  switch (entry.type) {
    case "CREATED": return "Planen ble opprettet";
    case "PAUSED": return "Planen ble pauset";
    case "RESUMED": return "Planen ble fortsatt";
    case "DEFINITION_UPDATED": return "Planen ble redigert";
    case "LEVEL_INCREASED":
    case "LEVEL_DECREASED": { const target = numberMetadata(metadata, "toLevelIndex"); if (target === null || target < 0) return "Planen ble oppdatert"; return `${entry.type === "LEVEL_INCREASED" ? "Trappet opp" : "Trappet ned"} til ${target === 0 ? "Basisplan" : `Trinn ${target}`}`; }
    case "STEP_ADVANCED": { const id = stringMetadata(metadata, "toStepId"); const order = id ? stepOrders.get(id) : undefined; return order === undefined ? "Gikk automatisk videre til neste del" : `Gikk automatisk videre til Del ${order + 1}`; }
    case "STATUS_CHANGED": { const from = stringMetadata(metadata, "fromStatus"); const to = stringMetadata(metadata, "toStatus"); if (from === "DRAFT" && to === "ACTIVE") return "Planen ble startet"; if ((from === "ACTIVE" || from === "PAUSED") && to === "COMPLETED") return "Planen ble avsluttet"; if (to === "ARCHIVED") return "Planen ble arkivert"; return "Planstatus ble oppdatert"; }
    default: return "Planen ble oppdatert";
  }
}

export function healthPlanTimeline(log: HealthPlanLog, stepOrders: ReadonlyMap<string, number> = new Map()): HealthPlanTimelineEntry[] {
  return [
    ...log.history.map(entry => ({ kind: "history" as const, id: `history:${entry.id}`, at: entry.occurredAt, title: formatHealthPlanHistoryEntry(entry, stepOrders), actorDisplayName: entry.actorDisplayName })),
    ...log.notes.map(note => ({ kind: "note" as const, id: `note:${note.id}`, at: note.createdAt, title: note.targetContext ? `Kommentar til «${note.targetContext.actionTitle}»` : "Notat", actorDisplayName: note.authorDisplayName, text: note.text, context: note.targetContext })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime() || b.id.localeCompare(a.id));
}

export function osloDate(value: string, long = false): string { return new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", day: "numeric", month: long ? "long" : "short", ...(long ? {} : { year: "numeric" }) }).format(new Date(value)); }
export function osloTime(value: string): string { return new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
