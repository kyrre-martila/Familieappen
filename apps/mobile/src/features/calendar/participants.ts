import type { FamilyMember } from "@familieappen/shared";

export type CalendarParticipantSummary = Pick<FamilyMember, "id" | "displayName" | "avatarUrl">;

export function getCalendarEventParticipantIds(input: { participantIds?: string[]; participants: { familyMemberId: string; familyMember?: { id: string } }[] }): string[] {
  if (Array.isArray(input.participantIds)) return [...input.participantIds];
  return input.participants.map((participant) => participant.familyMemberId || participant.familyMember?.id).filter((id): id is string => Boolean(id));
}

export function getCalendarEventParticipantSummaries(input: { participants: { familyMemberId: string; familyMember: CalendarParticipantSummary }[] }): CalendarParticipantSummary[] {
  return input.participants.map((participant) => participant.familyMember).filter((member): member is CalendarParticipantSummary => Boolean(member?.id));
}

export function toggleCalendarParticipantId(selectedIds: string[], memberId: string): string[] {
  return selectedIds.includes(memberId) ? selectedIds.filter((id) => id !== memberId) : [...selectedIds, memberId];
}

export function toggleAllCalendarParticipantIds(selectedIds: string[], members: Pick<FamilyMember, "id">[]): string[] {
  const allIds = members.map((member) => member.id);
  if (allIds.length === 0) return [];
  return allIds.every((id) => selectedIds.includes(id)) ? [] : allIds;
}

export function omitEmptyParticipantIds(ids: string[]): string[] | undefined {
  return ids.length ? ids : undefined;
}
