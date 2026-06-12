export type IdentitySource = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
};

export function getDisplayName(identity: IdentitySource): string {
  return (
    identity.displayName?.trim() ||
    [identity.firstName, identity.middleName, identity.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() ||
    identity.name?.trim() ||
    identity.email?.trim() ||
    "FamilieAppen"
  );
}

export function getInitials(identity: IdentitySource | string): string {
  const source = typeof identity === "string" ? { displayName: identity } : identity;
  const name = getDisplayName(source);
  const nameParts = name.split(/\s+/).filter(Boolean);
  const sourceParts = [source.firstName, source.lastName].filter((part): part is string => Boolean(part?.trim()));
  const parts = sourceParts.length >= 2 ? sourceParts : nameParts;

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toLocaleUpperCase("nb-NO");
  }

  if (parts.length === 1 && !source.name && !source.displayName && source.email) {
    return source.email.slice(0, 2).toLocaleUpperCase("nb-NO");
  }

  return (parts[0]?.slice(0, 2) || source.email?.slice(0, 2) || "FA").toLocaleUpperCase("nb-NO");
}
