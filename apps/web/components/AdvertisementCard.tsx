"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { getAdvertisements, recordAdvertisementClick, recordAdvertisementImpression, type AdvertisementImageVariant, type AdvertisementPlacement, type PublicAdvertisement } from "../lib/api";
import { resolveApiAssetUrl } from "../lib/assets";

export function AdvertisementPlacementCard({ placement }: { placement: AdvertisementPlacement }) {
  const [ad, setAd] = useState<PublicAdvertisement | null>(null);
  useEffect(() => { let cancelled = false; getAdvertisements(placement).then((ads) => { if (!cancelled) setAd(ads[0] ?? null); }).catch(() => { if (!cancelled) setAd(null); }); return () => { cancelled = true; }; }, [placement]);
  return ad ? <AdvertisementCard advertisement={ad} /> : null;
}

export function AdvertisementCard({ advertisement }: { advertisement: PublicAdvertisement }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const impressed = useRef(false);
  const [hidden, setHidden] = useState(false);
  const image = useMemo(() => selectImage(advertisement.images), [advertisement.images]);
  const imageUrl = resolveApiAssetUrl(image?.url) ?? null;

  useEffect(() => {
    const node = ref.current;
    if (!node || impressed.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5) && !impressed.current) {
        impressed.current = true;
        void recordAdvertisementImpression(advertisement.id, advertisement.placement).catch(() => undefined);
        observer.disconnect();
      }
    }, { threshold: [0.5] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [advertisement.id, advertisement.placement]);

  if (hidden || !image || !imageUrl || !advertisement.altText) return null;

  function click(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
    void recordAdvertisementClick(advertisement.id, advertisement.placement).catch(() => undefined);
  }

  return (
    <a ref={ref} className="advertisement-card" href={advertisement.targetUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={click} aria-label={`Annonse: ${advertisement.altText}`}>
      <span className="advertisement-card__label">Annonse</span>
      <img className="advertisement-card__image" src={imageUrl} width={image.width} height={image.height} alt={advertisement.altText} loading="lazy" decoding="async" onError={() => setHidden(true)} />
    </a>
  );
}

export function selectImage(images: PublicAdvertisement["images"]): AdvertisementImageVariant | null {
  if (typeof window === "undefined") return images.mobile;
  if (window.matchMedia("(min-width: 72rem)").matches) return images.desktop ?? images.tablet ?? images.mobile;
  if (window.matchMedia("(min-width: 48rem)").matches) return images.tablet ?? images.mobile;
  return images.mobile;
}
