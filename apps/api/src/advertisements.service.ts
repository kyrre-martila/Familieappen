import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma";
import { PublicAdvertisementEventType, PublicAdvertisementPlacement } from "./advertisements.dto";

const placements: PublicAdvertisementPlacement[] = ["HOME", "CALENDAR", "MENU", "WISHLIST", "SHOPPING"];
const AD_PUBLIC_PREFIX = "/uploads/advertisements";

@Injectable()
export class AdvertisementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { placement?: unknown }) {
    const now = new Date();
    const placement = query.placement === undefined ? undefined : this.placement(query.placement);
    const ads = await (this.prisma.client as any).advertisement.findMany({
      where: {
        status: "ACTIVE",
        ...(placement ? { placements: { some: { placement } } } : {}),
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        mobileImagePath: { not: null },
        altText: { not: null },
        targetUrl: { not: null }
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: { placements: { select: { placement: true } } }
    });
    return ads.filter((ad: any) => this.isValid(ad)).map((ad: any) => this.publicAd(ad, placement));
  }

  async recordEvent(id: string, type: PublicAdvertisementEventType, userId: string, placement: unknown) {
    const ad = await (this.prisma.client as any).advertisement.findUnique({ where: { id }, include: { placements: { select: { placement: true } } } });
    if (!ad || !this.isValid(ad) || ad.status !== "ACTIVE" || !this.scheduleValid(ad, new Date())) throw new NotFoundException("Advertisement not found");
    const eventPlacement = placement === undefined ? this.adPlacements(ad)[0] : this.placement(placement);
    if (!eventPlacement || !this.adPlacements(ad).includes(eventPlacement)) throw new NotFoundException("Advertisement not found");
    await (this.prisma.client as any).advertisementEvent.create({ data: { advertisementId: id, type, metadata: { userId, placement: eventPlacement } } });
    return { recorded: true };
  }

  private placement(value: unknown): PublicAdvertisementPlacement {
    if (typeof value !== "string" || !placements.includes(value as PublicAdvertisementPlacement)) throw new BadRequestException("Unsupported advertisement placement");
    return value as PublicAdvertisementPlacement;
  }
  private scheduleValid(ad: any, now: Date) { return (!ad.startsAt || ad.startsAt <= now) && (!ad.endsAt || ad.endsAt >= now); }
  private isValid(ad: any) { return Boolean(ad.mobileImagePath && ad.altText?.trim() && /^https:\/\//i.test(ad.targetUrl ?? "")); }
  private publicAd(ad: any, placement?: PublicAdvertisementPlacement) { return { id: ad.id, placement: placement ?? this.adPlacements(ad)[0], targetUrl: ad.targetUrl, altText: ad.altText.trim(), images: { mobile: this.img(ad,"mobile"), tablet: this.img(ad,"tablet"), desktop: this.img(ad,"desktop") } }; }
  private adPlacements(ad: any) { return Array.isArray(ad?.placements) ? ad.placements.map((p: any) => typeof p === "string" ? p : p.placement).filter(Boolean) : (ad?.placement ? [ad.placement] : []); }
  private img(ad: any, p: "mobile"|"tablet"|"desktop") { const path = ad[`${p}ImagePath`]; return path ? { url: `${AD_PUBLIC_PREFIX}/${path}`, width: ad[`${p}ImageWidth`], height: ad[`${p}ImageHeight`], mimeType: ad[`${p}ImageMimeType`] } : null; }
}
