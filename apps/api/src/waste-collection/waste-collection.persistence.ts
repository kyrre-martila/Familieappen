import { ISO_LOCAL_DATE } from "./waste-collection.domain";

/**
 * Prisma 7 represents PostgreSQL DATE fields as JavaScript Date values. This is
 * strictly an ORM persistence adapter: the value is constructed from numeric UTC
 * fields (never timezone-dependent string parsing) and must not escape into the
 * waste domain or API. UTC is a neutral carrier here, not an event instant.
 */
export function localDateToPrismaDate(value: string): Date {
  if (!ISO_LOCAL_DATE.test(value)) throw new Error("A persistence date must use YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const carrier = new Date(Date.UTC(year, month - 1, day));
  if (carrier.getUTCFullYear() !== year || carrier.getUTCMonth() !== month - 1 || carrier.getUTCDate() !== day) {
    throw new Error("A persistence date must be a valid calendar date");
  }
  return carrier;
}

/**
 * Reverse the Prisma DATE carrier using UTC fields only. Local getters would make
 * the result depend on the server timezone and can shift the calendar date.
 */
export function prismaDateToLocalDate(value: Date | string): string {
  if (typeof value === "string") {
    if (!ISO_LOCAL_DATE.test(value)) throw new Error("PostgreSQL returned an invalid DATE");
    return value;
  }
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}
