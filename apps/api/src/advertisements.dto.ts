export type PublicAdvertisementPlacement = "HOME" | "CALENDAR" | "MENU";
export type PublicAdvertisementEventType = "IMPRESSION" | "CLICK";
export interface PublicAdvertisementQueryDto { placement?: unknown; }
export interface PublicAdvertisementEventDto { placement?: unknown; }
