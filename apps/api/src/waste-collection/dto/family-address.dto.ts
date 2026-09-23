import { NormalizedAddress } from "../waste-collection.domain";

export interface SaveFamilyAddressDto { address?: unknown; }
export interface FamilyAddressResponseDto {
  address: NormalizedAddress;
  wasteCollection: { status: "configured" | "unavailable"; lastSyncStatus: string | null; lastSyncError: string | null };
}
