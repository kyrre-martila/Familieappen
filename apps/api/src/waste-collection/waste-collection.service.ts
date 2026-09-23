import { BadGatewayException, BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families/family-authorization.service";
import { addLocalDays, localParts } from "../health-plans/health-plan-scheduling.domain";
import { DEFAULT_HEALTH_PLAN_TIMEZONE } from "../health-plans/health-plan.domain";
import { PrismaService } from "../prisma";
import { ConfigureWasteCollectionDto, WasteEventDto, WasteSubscriptionDto } from "./dto/waste-collection.dto";
import { FamilyAddressResponseDto } from "./dto/family-address.dto";
import { MinRenovasjonProvider } from "./providers/min-renovasjon.provider";
import { InvalidProviderResponseError, ISO_LOCAL_DATE, NormalizedAddress, WasteProviderConfigurationError, WasteProviderUnavailableError } from "./waste-collection.domain";
import { localDateToPrismaDate, prismaDateToLocalDate } from "./waste-collection.persistence";

const DAY_MS = 86_400_000;
@Injectable()
export class WasteCollectionService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: FamilyAuthorizationService,
    private readonly provider: MinRenovasjonProvider) {}

  async getFamilyAddress(userId: string, familyId: string): Promise<FamilyAddressResponseDto> {
    await this.authorization.requireFamilyMember(userId, familyId);
    const address = await (this.prisma.client as any).familyAddress.findUnique({ where: { familyId } });
    if (!address) throw new NotFoundException("Family address is not configured");
    const subscription = await (this.prisma.client as any).wasteCollectionSubscription.findUnique({ where: { familyId }, select: { lastSyncStatus: true, lastSyncError: true } });
    return familyAddressResponse(address, subscription);
  }

  async saveFamilyAddress(userId: string, familyId: string, input: unknown): Promise<FamilyAddressResponseDto> {
    await this.authorization.requireFamilyRole(userId, familyId, ["OWNER", "PARENT"]);
    const address = validateAddress(input);
    const stored = await (this.prisma.client as any).familyAddress.upsert({
      where: { familyId }, create: { familyId, ...address }, update: address
    });

    // Address persistence is complete before optional integrations run. No
    // provider or subscription failure can roll canonical family data back.
    try { await this.configureWasteForStoredAddress(familyId, stored.id); } catch { /* integration state is best effort */ }
    const subscription = await (this.prisma.client as any).wasteCollectionSubscription.findUnique({ where: { familyId }, select: { lastSyncStatus: true, lastSyncError: true } });
    return familyAddressResponse(stored, subscription);
  }

  private async configureWasteForStoredAddress(familyId: string, addressId: string): Promise<void> {
    const subscription = await (this.prisma.client as any).wasteCollectionSubscription.upsert({
      where: { familyId },
      create: { familyId, addressId, provider: this.provider.providerId, enabled: true, selectedFractionIds: [] },
      update: { addressId, provider: this.provider.providerId, enabled: true, nextSyncAt: new Date() }
    });
    try { await this.syncSubscription(subscription.id); } catch { /* syncSubscription records retry/error state */ }
  }

  async configure(userId: string, familyId: string, input: ConfigureWasteCollectionDto): Promise<WasteSubscriptionDto> {
    await this.authorization.requireFamilyRole(userId, familyId, ["OWNER", "PARENT"]);
    const address = validateAddress(input.address);
    const enabled = input.enabled === undefined ? true : input.enabled;
    if (typeof enabled !== "boolean") throw new BadRequestException("enabled must be a boolean");
    const selected = validateSelectedFractions(input.selectedFractionIds);
    const subscription = await (this.prisma.client as any).$transaction(async (tx: any) => {
      const storedAddress = await tx.familyAddress.upsert({ where: { familyId }, create: { familyId, ...address }, update: address });
      return tx.wasteCollectionSubscription.upsert({ where: { familyId }, create: { familyId, addressId: storedAddress.id, provider: this.provider.providerId, enabled, selectedFractionIds: selected },
        update: { addressId: storedAddress.id, provider: this.provider.providerId, enabled, selectedFractionIds: selected, nextSyncAt: new Date() } });
    });
    // The home address is canonical family data. A provider outage must never
    // roll back, or make the client believe it failed to save, that address.
    if (enabled) {
      try { await this.syncSubscription(subscription.id); } catch { /* sync status is persisted by syncSubscription */ }
    }
    return this.getSubscription(userId, familyId);
  }

  async getSubscription(userId: string, familyId: string): Promise<WasteSubscriptionDto> {
    await this.authorization.requireFamilyMember(userId, familyId);
    const row = await (this.prisma.client as any).wasteCollectionSubscription.findUnique({ where: { familyId }, include: { address: true, fractions: { where: { active: true } } } });
    if (!row) throw new NotFoundException("Waste collection is not configured");
    return toSubscriptionDto(row);
  }

  async listEvents(userId: string, familyId: string, from?: unknown, to?: unknown): Promise<WasteEventDto[]> {
    await this.authorization.requireFamilyMember(userId, familyId);
    const fromDate = validateDateQuery(from, currentOsloDate());
    const toDate = validateDateQuery(to, addDays(fromDate, 180));
    if (toDate < fromDate) throw new BadRequestException("to must not be before from");
    const subscription = await (this.prisma.client as any).wasteCollectionSubscription.findUnique({ where: { familyId }, select: { id: true, enabled: true, selectedFractionIds: true } });
    if (!subscription) throw new NotFoundException("Waste collection is not configured");
    if (!subscription.enabled) return [];
    const rows = await (this.prisma.client as any).wasteCollectionEvent.findMany({
      where: { subscriptionId: subscription.id, collectionDate: { gte: localDateToPrismaDate(fromDate), lte: localDateToPrismaDate(toDate) },
        ...(subscription.selectedFractionIds.length > 0 ? { providerFractionId: { in: subscription.selectedFractionIds } } : {}) },
      include: { fraction: true }, orderBy: [{ collectionDate: "asc" }, { providerFractionId: "asc" }]
    });
    return rows.map((row: any) => ({ id: row.id, provider: row.provider, providerFractionId: row.providerFractionId,
      collectionDate: prismaDateToLocalDate(row.collectionDate), allDay: true as const, name: row.fraction.name, icon: row.fraction.icon,
      standardFractionId: row.fraction.standardFractionId, standardFractionIcon: row.fraction.standardFractionIcon }));
  }

  async syncSubscription(subscriptionId: string): Promise<void> {
    const subscription = await (this.prisma.client as any).wasteCollectionSubscription.findUnique({ where: { id: subscriptionId }, include: { address: true } });
    if (!subscription?.enabled) return;
    await (this.prisma.client as any).wasteCollectionSubscription.update({ where: { id: subscriptionId }, data: { lastSyncStartedAt: new Date(), lastSyncStatus: "syncing", lastSyncError: null } });
    try {
      const result = await this.provider.getCollections(toAddress(subscription.address));
      const now = new Date();
      await (this.prisma.client as any).$transaction(async (tx: any) => {
        await tx.wasteCollectionFraction.updateMany({ where: { subscriptionId }, data: { active: false } });
        const fractions = new Map<string, any>();
        for (const fraction of result.fractions) {
          const stored = await tx.wasteCollectionFraction.upsert({ where: { subscriptionId_providerFractionId: { subscriptionId, providerFractionId: fraction.providerFractionId } },
            create: { subscriptionId, ...fraction, active: true }, update: { ...fraction, active: true } });
          fractions.set(fraction.providerFractionId, stored);
        }
        for (const event of result.events) {
          const fraction = fractions.get(event.providerFractionId);
          if (!fraction) throw new InvalidProviderResponseError("Calendar references an unknown fraction");
          await tx.wasteCollectionEvent.upsert({ where: { subscriptionId_providerFractionId_collectionDate: { subscriptionId, providerFractionId: event.providerFractionId, collectionDate: localDateToPrismaDate(event.collectionDate) } },
            create: { subscriptionId, fractionId: fraction.id, provider: this.provider.providerId, providerFractionId: event.providerFractionId, collectionDate: localDateToPrismaDate(event.collectionDate), fetchedAt: now },
            update: { fractionId: fraction.id, fetchedAt: now } });
        }
        // Do not delete absent future rows: a short/incomplete upstream response must not erase a good cache.
        await tx.wasteCollectionSubscription.update({ where: { id: subscriptionId }, data: { lastSuccessfulSyncAt: now, lastSyncStatus: "success", lastSyncError: null, nextSyncAt: new Date(now.getTime() + DAY_MS) } });
      });
    } catch (error) {
      const diagnostic = error instanceof WasteProviderConfigurationError ? "provider_not_configured" : error instanceof InvalidProviderResponseError ? "invalid_provider_response" : "provider_unavailable";
      await (this.prisma.client as any).wasteCollectionSubscription.update({ where: { id: subscriptionId }, data: { lastSyncStatus: "error", lastSyncError: diagnostic, nextSyncAt: new Date(Date.now() + 60 * 60 * 1000) } });
      this.rethrowProviderError(error);
    }
  }

  private rethrowProviderError(error: unknown): never {
    if (error instanceof WasteProviderConfigurationError) throw new ServiceUnavailableException("Waste collection is not configured on the server");
    if (error instanceof WasteProviderUnavailableError) throw new ServiceUnavailableException(error.message);
    if (error instanceof InvalidProviderResponseError) throw new BadGatewayException(error.message);
    throw error;
  }
}

function validateAddress(value: unknown): NormalizedAddress {
  const a = value as any;
  const strings = ["label", "streetName", "postalCode", "postalPlace", "municipalityNumber", "municipalityName", "addressCode"];
  if (!a || typeof a !== "object" || strings.some((key) => typeof a[key] !== "string" || !a[key].trim()) || !Number.isInteger(a.houseNumber) || a.houseNumber < 1 ||
      !(a.houseLetter == null || typeof a.houseLetter === "string") || !(a.latitude == null || Number.isFinite(a.latitude)) || !(a.longitude == null || Number.isFinite(a.longitude)) ||
      (a.latitude != null && Math.abs(a.latitude) > 90) || (a.longitude != null && Math.abs(a.longitude) > 180)) throw new BadRequestException("A complete normalized address is required");
  return Object.fromEntries(Object.entries(a).filter(([key]) => [...strings, "houseNumber", "houseLetter", "latitude", "longitude"].includes(key))) as unknown as NormalizedAddress;
}
function validateSelectedFractions(value: unknown): string[] { if (value === undefined) return []; if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) throw new BadRequestException("selectedFractionIds must be a list of strings"); return [...new Set(value)]; }
function validateDateQuery(value: unknown, fallback: string): string { if (value === undefined) return fallback; if (typeof value !== "string" || !ISO_LOCAL_DATE.test(value)) throw new BadRequestException("Dates must use YYYY-MM-DD"); return value; }
export function currentOsloDate(now = new Date()): string {
  const parts = localParts(now, DEFAULT_HEALTH_PLAN_TIMEZONE);
  return formatLocalDate(parts);
}
function addDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return formatLocalDate(addLocalDays({ year, month, day }, days));
}
function formatLocalDate(value: { year: number; month: number; day: number }): string {
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}
function toAddress(row: any): NormalizedAddress { return { label: row.label, streetName: row.streetName, houseNumber: row.houseNumber, houseLetter: row.houseLetter, postalCode: row.postalCode, postalPlace: row.postalPlace, municipalityNumber: row.municipalityNumber, municipalityName: row.municipalityName, addressCode: row.addressCode, latitude: row.latitude == null ? null : Number(row.latitude), longitude: row.longitude == null ? null : Number(row.longitude) }; }
function familyAddressResponse(row: any, subscription: any): FamilyAddressResponseDto {
  return { address: toAddress(row), wasteCollection: { status: subscription && subscription.lastSyncStatus !== "error" ? "configured" : "unavailable", lastSyncStatus: subscription?.lastSyncStatus ?? null, lastSyncError: subscription?.lastSyncError ?? null } };
}
function toSubscriptionDto(row: any): WasteSubscriptionDto { return { id: row.id, provider: row.provider, enabled: row.enabled, address: toAddress(row.address), selectedFractionIds: row.selectedFractionIds, fractions: row.fractions.map((f: any) => ({ providerFractionId: f.providerFractionId, name: f.name, icon: f.icon, standardFractionId: f.standardFractionId, standardFractionIcon: f.standardFractionIcon })), lastSuccessfulSyncAt: row.lastSuccessfulSyncAt?.toISOString() ?? null, lastSyncStatus: row.lastSyncStatus, lastSyncError: row.lastSyncError }; }
