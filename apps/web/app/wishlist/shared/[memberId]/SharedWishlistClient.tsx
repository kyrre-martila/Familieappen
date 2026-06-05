"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Image as ImageIcon, RefreshCw } from "lucide-react";

import { AppShell } from "../../../../components/AppShell";
import { LockedFeatureState } from "../../../../components/PendingAccess";
import { useFamilyAccess } from "../../../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../../../components/ui";
import { useSharedWishlists } from "../../../../features/wishlist/hooks/useSharedWishlists";
import { ApiError, removeSharedWishlist, type SharedWishlistItem, type SharedWishlistItemsResponse } from "../../../../lib/api";

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

function getReservationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 409) {
    return "Dette ønsket er allerede reservert";
  }

  if (error instanceof ApiError && error.message) {
    return error.message;
  }

  return fallback;
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

function SharedWishlistMedia({ item }: { item: SharedWishlistItem }) {
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

function ReservationBadge() {
  return (
    <span className="wishlist-reservation-badge">
      <CheckCircle2 size={16} aria-hidden="true" />
      Reservert
    </span>
  );
}

function SharedWishlistItemCard({
  item,
  onOpenReserve,
  onUnreserve,
  isBusy,
}: {
  item: SharedWishlistItem;
  onOpenReserve: (item: SharedWishlistItem) => void;
  onUnreserve: (item: SharedWishlistItem) => void;
  isBusy: boolean;
}) {
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
      <div className="wishlist-reservation-action">
        {item.isReserved ? (
          <>
            <ReservationBadge />
            {item.reservedByMe ? (
              <button className="wishlist-reservation-undo" type="button" onClick={() => onUnreserve(item)} disabled={isBusy}>
                Angre
              </button>
            ) : null}
          </>
        ) : (
          <button className="wishlist-reservation-button" type="button" onClick={() => onOpenReserve(item)} disabled={isBusy}>
            Reserver
          </button>
        )}
      </div>
    </article>
  );
}

function ReserveSheet({ item, onCancel, onConfirm, isBusy }: { item: SharedWishlistItem; onCancel: () => void; onConfirm: () => void; isBusy: boolean }) {
  return (
    <div className="wishlist-reserve-sheet" role="presentation">
      <button className="wishlist-reserve-sheet__backdrop" type="button" aria-label="Avbryt reservasjon" onClick={onCancel} />
      <section className="wishlist-reserve-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="wishlist-reserve-title">
        <p className="wishlist-reserve-sheet__eyebrow">{item.title}</p>
        <h2 id="wishlist-reserve-title">Reservere gave?</h2>
        <p>Andre vil se at ønsket er reservert, men ikke hvem som reserverte det.</p>
        <div className="wishlist-reserve-sheet__actions">
          <button className="wishlist-reserve-sheet__button wishlist-reserve-sheet__button--ghost" type="button" onClick={onCancel} disabled={isBusy}>
            Avbryt
          </button>
          <button className="wishlist-reserve-sheet__button wishlist-reserve-sheet__button--primary" type="button" onClick={onConfirm} disabled={isBusy}>
            Reserver
          </button>
        </div>
      </section>
    </div>
  );
}

function SharedWishlistContent({ memberId }: { memberId: string }) {
  const router = useRouter();
  const { getSharedWishlistItems, reserveSharedWishlistItem, unreserveSharedWishlistItem, loading, loadingItemsForMemberId, error } = useSharedWishlists();
  const [wishlist, setWishlist] = useState<SharedWishlistItemsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingReserveItem, setPendingReserveItem] = useState<SharedWishlistItem | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [removingShare, setRemovingShare] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (loading) {
      return () => {
        isMounted = false;
      };
    }

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
  }, [getSharedWishlistItems, loading, memberId]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const retryLoad = () => {
    setLoadError(null);
    void getSharedWishlistItems(memberId).then(setWishlist).catch(() => {
      setLoadError("Kunne ikke hente ønskelisten akkurat nå");
    });
  };

  const replaceLocalItem = (item: SharedWishlistItem) => {
    setWishlist((currentWishlist) => {
      if (!currentWishlist) {
        return currentWishlist;
      }

      return {
        ...currentWishlist,
        items: currentWishlist.items.map((currentItem) => currentItem.id === item.id ? { ...currentItem, ...item } : currentItem)
      };
    });
  };

  const handleReserve = async () => {
    if (!pendingReserveItem) {
      return;
    }

    setBusyItemId(pendingReserveItem.id);

    try {
      const item = await reserveSharedWishlistItem(memberId, pendingReserveItem.id);
      replaceLocalItem(item);
      setPendingReserveItem(null);
      setToast("Ønske reservert");
    } catch (reserveError) {
      setToast(getReservationErrorMessage(reserveError, "Kunne ikke reservere ønsket akkurat nå"));
    } finally {
      setBusyItemId(null);
    }
  };

  const handleUnreserve = async (item: SharedWishlistItem) => {
    const previousItem = { ...item };
    const optimisticItem = { ...item, isReserved: false, reservedByMe: false };
    setBusyItemId(item.id);
    replaceLocalItem(optimisticItem);

    try {
      const releasedItem = await unreserveSharedWishlistItem(memberId, item.id);
      replaceLocalItem(releasedItem);
      setToast("Reservasjon fjernet");
    } catch (unreserveError) {
      replaceLocalItem(previousItem);
      setToast(getReservationErrorMessage(unreserveError, "Kunne ikke fjerne reservasjonen akkurat nå"));
    } finally {
      setBusyItemId(null);
    }
  };


  const handleRemoveSharedWishlist = async () => {
    if (!wishlist?.shareId) return;

    setRemovingShare(true);
    try {
      await removeSharedWishlist(wishlist.shareId);
      window.sessionStorage.setItem("familieappen:wishlist:toast", "Ønskelisten er fjernet fra Delt med meg.");
      router.push("/wishlist?tab=shared");
    } catch (removeError) {
      setToast(removeError instanceof Error ? removeError.message : "Kunne ikke fjerne ønskelisten akkurat nå");
      setRemovingShare(false);
    }
  };

  const isLoading = !wishlist && !loadError && (loading || loadingItemsForMemberId === memberId);
  const title = wishlist ? `${wishlist.ownerName} sin ønskeliste` : "Delt ønskeliste";

  return (
    <AppShell title={title}>
      <PageContainer>
        <div className="wishlist-page wishlist-page--shared-detail">
          {isLoading ? <SharedWishlistSkeleton /> : null}
          {!isLoading && (loadError || (error && !wishlist)) ? (
            <SharedWishlistErrorState onRetry={retryLoad} />
          ) : null}
          {wishlist && wishlist.items.length === 0 ? (
            <section className="wishlist-empty" aria-live="polite">
              <h2>Ingen ønsker enda</h2>
            </section>
          ) : null}
          {wishlist?.isExternal ? (
            <button className="wishlist-remove-shared-button" type="button" onClick={() => void handleRemoveSharedWishlist()} disabled={removingShare}>
              Fjern fra Delt med meg
            </button>
          ) : null}
          {wishlist && wishlist.items.length > 0 ? (
            <>
              <div className="wishlist-list" aria-label={`${wishlist.ownerName} sin ønskeliste`}>
                {wishlist.items.map((item) => (
                  <SharedWishlistItemCard
                    item={item}
                    key={item.id}
                    onOpenReserve={setPendingReserveItem}
                    onUnreserve={handleUnreserve}
                    isBusy={busyItemId === item.id}
                  />
                ))}
              </div>
              <p className="wishlist-reservation-note">Reservasjoner er private. Bare du ser det du reserverer.</p>
            </>
          ) : null}
        </div>
      </PageContainer>
      {pendingReserveItem ? <ReserveSheet item={pendingReserveItem} onCancel={() => setPendingReserveItem(null)} onConfirm={handleReserve} isBusy={busyItemId === pendingReserveItem.id} /> : null}
      <p className={`wishlist-toast${toast ? " wishlist-toast--visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </p>
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
