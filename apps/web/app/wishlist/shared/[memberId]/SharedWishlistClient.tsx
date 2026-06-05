"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, RefreshCw } from "lucide-react";

import { AppShell } from "../../../../components/AppShell";
import { LockedFeatureState } from "../../../../components/PendingAccess";
import { useFamilyAccess } from "../../../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../../../components/ui";
import { useSharedWishlists } from "../../../../features/wishlist/hooks/useSharedWishlists";
import type { SharedWishlistItemsResponse, WishlistItem } from "../../../../lib/api";

const priceFormatter = new Intl.NumberFormat("nb-NO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "NOK",
});

function formatPrice(price: number | null) {
  if (price === null) {
    return null;
  }

  return priceFormatter.format(price).replace("NOK", "kr").trim();
}

function SharedWishlistSkeleton() {
  return (
    <div className="wishlist-list" aria-label="Laster delt ønskeliste">
      {[0, 1, 2].map((item) => (
        <div className="wishlist-card wishlist-card--skeleton" key={item}>
          <div className="wishlist-card__media wishlist-skeleton" />
          <div className="wishlist-card__body">
            <span className="wishlist-skeleton wishlist-skeleton--title" />
            <span className="wishlist-skeleton wishlist-skeleton--line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SharedWishlistErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="wishlist-empty wishlist-empty--error" aria-live="polite">
      <div className="wishlist-empty__icon" aria-hidden="true">
        <RefreshCw size={30} />
      </div>
      <h2>Vi fikk ikke hentet ønskelisten</h2>
      <p>Prøv igjen om litt.</p>
      <button className="wishlist-empty__button" type="button" onClick={onRetry}>
        Prøv igjen
      </button>
    </section>
  );
}

function SharedWishlistMedia({ item }: { item: WishlistItem }) {
  if (item.imageUrl) {
    return (
      <span className="wishlist-card__media">
        <img alt="" src={item.imageUrl} loading="lazy" />
      </span>
    );
  }

  return (
    <span className="wishlist-card__media wishlist-card__media--icon" aria-hidden="true">
      {item.icon ? <span className="wishlist-card__emoji">{item.icon}</span> : <ImageIcon size={28} />}
    </span>
  );
}

function SharedWishlistItemCard({ item }: { item: WishlistItem }) {
  const price = formatPrice(item.price);

  return (
    <article className="wishlist-card wishlist-card--readonly" tabIndex={0} aria-labelledby={`shared-wishlist-item-${item.id}`}>
      <SharedWishlistMedia item={item} />
      <div className="wishlist-card__body">
        <h2 className="wishlist-card__title" id={`shared-wishlist-item-${item.id}`}>
          {item.title}
        </h2>
        <p className="wishlist-card__meta">
          {price ? <span className="wishlist-card__price">{price}</span> : null}
          {price && item.storeOrLink ? <span aria-hidden="true">•</span> : null}
          {item.storeOrLink ? <span className="wishlist-card__store">{item.storeOrLink}</span> : null}
        </p>
      </div>
      <span className="wishlist-card__future-action" aria-hidden="true" />
    </article>
  );
}

function SharedWishlistContent({ memberId }: { memberId: string }) {
  const { getSharedWishlistItems, loadingItemsForMemberId, error } = useSharedWishlists();
  const [wishlist, setWishlist] = useState<SharedWishlistItemsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setLoadError(null);
    void getSharedWishlistItems(memberId)
      .then((response) => {
        if (isMounted) {
          setWishlist(response);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError("Kunne ikke hente ønskelisten akkurat nå");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [getSharedWishlistItems, memberId]);

  const isLoading = !wishlist && loadingItemsForMemberId === memberId;
  const title = wishlist ? `${wishlist.ownerName} sin ønskeliste` : "Delt ønskeliste";

  return (
    <AppShell title={title}>
      <PageContainer>
        <div className="wishlist-page wishlist-page--shared-detail">
          {isLoading ? <SharedWishlistSkeleton /> : null}
          {!isLoading && (loadError || (error && !wishlist)) ? (
            <SharedWishlistErrorState onRetry={() => void getSharedWishlistItems(memberId).then(setWishlist)} />
          ) : null}
          {wishlist && wishlist.items.length === 0 ? (
            <section className="wishlist-empty" aria-live="polite">
              <h2>Ingen ønsker enda</h2>
            </section>
          ) : null}
          {wishlist && wishlist.items.length > 0 ? (
            <div className="wishlist-list" aria-label={`${wishlist.ownerName} sin ønskeliste`}>
              {wishlist.items.map((item) => (
                <SharedWishlistItemCard item={item} key={item.id} />
              ))}
            </div>
          ) : null}
        </div>
      </PageContainer>
    </AppShell>
  );
}

export function SharedWishlistClient({ memberId }: { memberId: string }) {
  const familyAccess = useFamilyAccess();

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Delt ønskeliste">
        <PageContainer>
          <SharedWishlistSkeleton />
        </PageContainer>
      </AppShell>
    );
  }

  return <SharedWishlistContent memberId={memberId} />;
}
