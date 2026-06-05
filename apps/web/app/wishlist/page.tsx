"use client";

import type { MouseEvent, PointerEvent } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Gift,
  GripVertical,
  Image as ImageIcon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Share2,
} from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../components/ui";
import { useSharedWishlists } from "../../features/wishlist/hooks/useSharedWishlists";
import { useWishlist } from "../../features/wishlist/hooks/useWishlist";
import type { SharedWishlistSummary, WishlistItem } from "../../lib/api";

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

function handleUnavailableAction(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

function WishlistShareButton() {
  return (
    <button
      className="wishlist-share-button"
      type="button"
      aria-disabled="true"
      onClick={handleUnavailableAction}
      title="Deling kommer senere"
    >
      <Share2 aria-hidden="true" size={18} />
      <span>Del</span>
    </button>
  );
}

function WishlistTabs({ activeTab }: { activeTab: "mine" | "shared" }) {
  return (
    <div
      className="wishlist-tabs"
      role="tablist"
      aria-label="Ønskelistevisning"
    >
      <Link
        className={`wishlist-tabs__tab${activeTab === "mine" ? " wishlist-tabs__tab--active" : ""}`}
        href="/wishlist"
        role="tab"
        aria-selected={activeTab === "mine"}
      >
        Min ønskeliste
      </Link>
      <Link
        className={`wishlist-tabs__tab${activeTab === "shared" ? " wishlist-tabs__tab--active" : ""}`}
        href="/wishlist?tab=shared"
        role="tab"
        aria-selected={activeTab === "shared"}
      >
        Delt med meg
      </Link>
    </div>
  );
}

function WishlistSkeleton() {
  return (
    <div className="wishlist-list" aria-label="Laster ønskeliste">
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

function WishlistEmptyState() {
  return (
    <section className="wishlist-empty" aria-live="polite">
      <div className="wishlist-empty__icon" aria-hidden="true">
        <Gift size={34} />
      </div>
      <h2>Du har ingen ønsker enda</h2>
      <p>Legg til ting du ønsker deg til bursdag, jul eller senere</p>
      <Link className="wishlist-empty__button" href="/wishlist/new">
        <Plus aria-hidden="true" size={18} />
        Legg til første ønske
      </Link>
    </section>
  );
}

function WishlistErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      className="wishlist-empty wishlist-empty--error"
      aria-live="polite"
    >
      <div className="wishlist-empty__icon" aria-hidden="true">
        <RefreshCw size={30} />
      </div>
      <h2>Vi fikk ikke hentet ønskelisten</h2>
      <p>Prøv igjen om litt. Ønskelisten din er fortsatt privat.</p>
      <button
        className="wishlist-empty__button"
        type="button"
        onClick={onRetry}
      >
        Prøv igjen
      </button>
    </section>
  );
}

function WishlistMedia({ item }: { item: WishlistItem }) {
  if (item.imageUrl) {
    return (
      <span className="wishlist-card__media">
        <img alt="" src={item.imageUrl} loading="lazy" />
      </span>
    );
  }

  return (
    <span
      className="wishlist-card__media wishlist-card__media--icon"
      aria-hidden="true"
    >
      {item.icon ? (
        <span className="wishlist-card__emoji">{item.icon}</span>
      ) : (
        <ImageIcon size={28} />
      )}
    </span>
  );
}

function WishlistCard({
  canMove,
  isDragging,
  isMoveMode,
  item,
  onDelete,
  onMove,
  onMoveStart,
  setItemRef,
}: {
  canMove: boolean;
  isDragging: boolean;
  isMoveMode: boolean;
  item: WishlistItem;
  onDelete: (itemId: string) => void;
  onMove: () => void;
  onMoveStart: (itemId: string, event: PointerEvent<HTMLButtonElement>) => void;
  setItemRef: (itemId: string, element: HTMLElement | null) => void;
}) {
  const price = formatPrice(item.price);
  const cardClassName = [
    "wishlist-card",
    isMoveMode ? "wishlist-card--move-mode" : "",
    isDragging ? "wishlist-card--dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={cardClassName}
      ref={(element) => setItemRef(item.id, element)}
      tabIndex={0}
      aria-labelledby={`wishlist-item-${item.id}`}
    >
      {isMoveMode ? (
        <button
          className="wishlist-card__drag-handle"
          type="button"
          aria-label={`Flytt ${item.title}`}
          onPointerDown={(event) => onMoveStart(item.id, event)}
        >
          <GripVertical aria-hidden="true" size={22} />
        </button>
      ) : null}
      <WishlistMedia item={item} />
      <div className="wishlist-card__body">
        <h2 className="wishlist-card__title" id={`wishlist-item-${item.id}`}>
          {item.title}
        </h2>
        <p className="wishlist-card__meta">
          {price ? <span className="wishlist-card__price">{price}</span> : null}
          {price && item.storeOrLink ? <span aria-hidden="true">•</span> : null}
          {item.storeOrLink ? (
            <span className="wishlist-card__store">{item.storeOrLink}</span>
          ) : null}
        </p>
      </div>
      {!isMoveMode ? (
        <details className="wishlist-card__menu">
          <summary aria-label={`Åpne meny for ${item.title}`}>
            <MoreHorizontal aria-hidden="true" size={24} />
          </summary>
          <div className="wishlist-card__menu-panel" role="menu">
            <button
              type="button"
              role="menuitem"
              disabled={!canMove}
              title={
                canMove ? undefined : "Legg til flere ønsker for å flytte dem."
              }
              onClick={onMove}
            >
              Flytt
            </button>
            <Link href={`/wishlist/${item.id}/edit`} role="menuitem">
              Rediger
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => onDelete(item.id)}
            >
              Slett
            </button>
          </div>
        </details>
      ) : null}
    </article>
  );
}

function AddWishButton() {
  return (
    <Link className="wishlist-add-button" href="/wishlist/new">
      <Plus aria-hidden="true" size={18} />
      Legg til ønske
    </Link>
  );
}


function SharedWishlistEmptyState() {
  return (
    <section className="wishlist-empty wishlist-empty--shared" aria-live="polite">
      <h2>Ingen delte ønskelister enda</h2>
      <p>Når noen i familien legger til ønsker, vises de her.</p>
    </section>
  );
}

function SharedWishlistAvatar({ summary }: { summary: SharedWishlistSummary }) {
  if (summary.ownerAvatarUrl) {
    return (
      <span className="wishlist-shared-card__avatar">
        <img alt="" src={summary.ownerAvatarUrl} loading="lazy" />
      </span>
    );
  }

  const initials = summary.ownerName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className="wishlist-shared-card__avatar wishlist-shared-card__avatar--initials"
      style={{ backgroundColor: summary.ownerColor }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function SharedWishlistCard({ summary }: { summary: SharedWishlistSummary }) {
  const wishText = `${summary.itemCount} ${summary.itemCount === 1 ? "ønske" : "ønsker"}`;

  return (
    <Link
      className="wishlist-shared-card"
      href={`/wishlist/shared/${encodeURIComponent(summary.ownerFamilyMemberId)}`}
      aria-label={`${summary.ownerName} sin ønskeliste, ${wishText}`}
    >
      <SharedWishlistAvatar summary={summary} />
      <span className="wishlist-shared-card__body">
        <strong>{summary.ownerName}</strong>
        <small>{wishText}</small>
      </span>
      <ChevronRight aria-hidden="true" size={28} />
    </Link>
  );
}

function SharedWishlistList() {
  const { sharedWishlistSummaries, loading, error, refresh } = useSharedWishlists();

  if (loading) {
    return <WishlistSkeleton />;
  }

  if (error && sharedWishlistSummaries.length === 0) {
    return <WishlistErrorState onRetry={() => void refresh()} />;
  }

  if (sharedWishlistSummaries.length === 0) {
    return <SharedWishlistEmptyState />;
  }

  return (
    <div className="wishlist-shared-list" aria-label="Ønskelister delt med meg">
      {error ? (
        <p className="wishlist-move-note" role="status">
          {error}
        </p>
      ) : null}
      {sharedWishlistSummaries.map((summary) => (
        <SharedWishlistCard key={summary.ownerFamilyMemberId} summary={summary} />
      ))}
    </div>
  );
}

function WishlistToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedMessage = window.sessionStorage.getItem(
      "familieappen:wishlist:toast",
    );
    if (!savedMessage) return;

    window.sessionStorage.removeItem("familieappen:wishlist:toast");
    setMessage(savedMessage);
    const timeout = window.setTimeout(() => setMessage(null), 2400);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <p
      className={`wishlist-toast${message ? " wishlist-toast--visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}

function moveItem(items: WishlistItem[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function WishlistContent({ activeTab }: { activeTab: "mine" | "shared" }) {
  const { items, loading, error, refresh, deleteItem, reorderItems } =
    useWishlist();
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [displayItems, setDisplayItems] = useState<WishlistItem[]>(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [moveMessage, setMoveMessage] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const dragStartOrderRef = useRef<string[]>([]);
  const latestDisplayItemsRef = useRef<WishlistItem[]>(items);

  useEffect(() => {
    setDisplayItems(items);
    latestDisplayItemsRef.current = items;
    if (items.length < 2) {
      setIsMoveMode(false);
    }
  }, [items]);

  function setItemRef(itemId: string, element: HTMLElement | null) {
    if (element) {
      itemRefs.current.set(itemId, element);
      return;
    }

    itemRefs.current.delete(itemId);
  }

  function enterMoveMode() {
    if (items.length < 2) {
      setMoveMessage("Legg til flere ønsker for å flytte dem.");
      window.setTimeout(() => setMoveMessage(null), 2600);
      return;
    }

    setMoveMessage(null);
    setIsMoveMode(true);
  }

  function exitMoveMode() {
    setDraggingId(null);
    setIsMoveMode(false);
    setDisplayItems(items);
  }

  function handleMoveStart(
    itemId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (!isMoveMode || items.length < 2) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(itemId);
    dragStartOrderRef.current = latestDisplayItemsRef.current.map(
      (item) => item.id,
    );
  }

  useEffect(() => {
    if (!draggingId) {
      return;
    }

    function handlePointerMove(event: globalThis.PointerEvent) {
      setDisplayItems((currentItems) => {
        const fromIndex = currentItems.findIndex(
          (item) => item.id === draggingId,
        );
        if (fromIndex < 0) {
          return currentItems;
        }

        const targetIndex = currentItems.findIndex((item) => {
          if (item.id === draggingId) {
            return false;
          }

          const element = itemRefs.current.get(item.id);
          if (!element) {
            return false;
          }

          const rect = element.getBoundingClientRect();
          return event.clientY >= rect.top && event.clientY <= rect.bottom;
        });

        if (targetIndex < 0 || targetIndex === fromIndex) {
          return currentItems;
        }

        const nextItems = moveItem(currentItems, fromIndex, targetIndex);
        latestDisplayItemsRef.current = nextItems;
        return nextItems;
      });
    }

    function handlePointerUp() {
      const orderedIds = latestDisplayItemsRef.current.map((item) => item.id);
      const orderChanged =
        orderedIds.join("|") !== dragStartOrderRef.current.join("|");

      setDraggingId(null);

      if (!orderChanged) {
        return;
      }

      void reorderItems(orderedIds).catch(() => {
        setDisplayItems(items);
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggingId, items, reorderItems]);

  return (
    <div className="wishlist-page">
      <WishlistToast />
      <WishlistTabs activeTab={activeTab} />
      {activeTab === "shared" ? <SharedWishlistList /> : null}
      {activeTab === "mine" && isMoveMode ? (
        <p className="wishlist-move-helper">
          Flytt ønskene ved å dra dem opp eller ned.
        </p>
      ) : null}
      {activeTab === "mine" && moveMessage ? (
        <p className="wishlist-move-note" role="status">
          {moveMessage}
        </p>
      ) : null}
      {activeTab === "mine" && loading ? <WishlistSkeleton /> : null}
      {activeTab === "mine" && !loading && error && items.length === 0 ? (
        <WishlistErrorState onRetry={() => void refresh()} />
      ) : null}
      {activeTab === "mine" && !loading && error && items.length > 0 ? (
        <p className="wishlist-move-note" role="status">
          {error}
        </p>
      ) : null}
      {activeTab === "mine" && !loading && !error && items.length === 0 ? <WishlistEmptyState /> : null}
      {activeTab === "mine" && !loading && items.length > 0 ? (
        <>
          <div
            className="wishlist-list"
            aria-label={isMoveMode ? "Flytt mine ønsker" : "Mine ønsker"}
          >
            {displayItems.map((item) => (
              <WishlistCard
                canMove={items.length > 1}
                isDragging={draggingId === item.id}
                isMoveMode={isMoveMode}
                item={item}
                key={item.id}
                onDelete={(itemId) => void deleteItem(itemId)}
                onMove={enterMoveMode}
                onMoveStart={handleMoveStart}
                setItemRef={setItemRef}
              />
            ))}
          </div>
          {isMoveMode ? (
            <button
              className="wishlist-done-button"
              type="button"
              onClick={exitMoveMode}
            >
              Ferdig
            </button>
          ) : (
            <AddWishButton />
          )}
        </>
      ) : null}
    </div>
  );
}

function WishlistPageInner() {
  const familyAccess = useFamilyAccess();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "shared" ? "shared" : "mine";

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Ønskeliste" titleAction={activeTab === "mine" ? <WishlistShareButton /> : undefined}>
        <PageContainer>
          <WishlistSkeleton />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title="Ønskeliste" titleAction={activeTab === "mine" ? <WishlistShareButton /> : undefined}>
      <PageContainer>
        <WishlistContent activeTab={activeTab} />
      </PageContainer>
    </AppShell>
  );
}


export default function WishlistPage() {
  return (
    <Suspense fallback={
      <AppShell title="Ønskeliste" titleAction={<WishlistShareButton />}>
        <PageContainer>
          <WishlistSkeleton />
        </PageContainer>
      </AppShell>
    }>
      <WishlistPageInner />
    </Suspense>
  );
}
