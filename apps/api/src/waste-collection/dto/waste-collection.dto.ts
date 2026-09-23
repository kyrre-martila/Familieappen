import { NormalizedAddress, WasteFraction } from "../waste-collection.domain";

export interface ConfigureWasteCollectionDto { address?: unknown; enabled?: unknown; selectedFractionIds?: unknown; }
export interface WasteSubscriptionDto {
  id: string; provider: string; enabled: boolean; address: NormalizedAddress;
  selectedFractionIds: string[]; fractions: WasteFraction[];
  lastSuccessfulSyncAt: string | null; lastSyncStatus: string | null; lastSyncError: string | null;
}
export interface WasteEventDto extends WasteFraction { id: string; provider: string; collectionDate: string; allDay: true; }
