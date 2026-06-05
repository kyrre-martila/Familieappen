"use client";

import type { MouseEvent } from "react";
import { Gift, Image as ImageIcon, MoreHorizontal, Plus, RefreshCw, Share2 } from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../components/ui";
import { useWishlist } from "../../features/wishlist/hooks/useWishlist";
import type { WishlistItem } from "../../lib/api";

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
    <button className="wishlist-share-button" type="button" aria-disabled="true" onClick={handleUnavailableAction} title="Deling kommer senere">
      <Share2 aria-hidden="true" size={18} />
      <span>Del</span>
    </button>
  );
}

function WishlistTabs() {
  return (
    <div className="wishlist-tabs" role="tablist" aria-label="Ønskelistevisning">
      <button className="wishlist-tabs__tab wishlist-tabs__tab--active" type="button" role="tab" aria-selected="true">
        Min ønskeliste
      </button>
      <button className="wishlist-tabs__tab" type="button" role="tab" aria-selected="false" aria-disabled="true" onClick={handleUnavailableAction} title="Kommer snart">
        Delt med meg
      </button>
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
      <button className="wishlist-empty__button" type="button" aria-disabled="true" onClick={handleUnavailableAction} title="Legg til kommer senere">
        <Plus aria-hidden="true" size={18} />
        Legg til første ønske
      </button>
    </section>
  );
}

function WishlistErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="wishlist-empty wishlist-empty--error" aria-live="polite">
      <div className="wishlist-empty__icon" aria-hidden="true">
        <RefreshCw size={30} />
      </div>
      <h2>Vi fikk ikke hentet ønskelisten</h2>
      <p>Prøv igjen om litt. Ønskelisten din er fortsatt privat.</p>
      <button className="wishlist-empty__button" type="button" onClick={onRetry}>
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
    <span className="wishlist-card__media wishlist-card__media--icon" aria-hidden="true">
      {item.icon ? <span className="wishlist-card__emoji">{item.icon}</span> : <ImageIcon size={28} />}
    </span>
  );
}

function WishlistCard({ item, onDelete }: { item: WishlistItem; onDelete: (itemId: string) => void }) {
  const price = formatPrice(item.price);

  return (
    <article className="wishlist-card" tabIndex={0} aria-labelledby={`wishlist-item-${item.id}`}>
      <WishlistMedia item={item} />
      <div className="wishlist-card__body">
        <h2 className="wishlist-card__title" id={`wishlist-item-${item.id}`}>{item.title}</h2>
        {price ? <p className="wishlist-card__price">{price}</p> : null}
        {item.storeOrLink ? <p className="wishlist-card__store">{item.storeOrLink}</p> : null}
      </div>
      <details className="wishlist-card__menu">
        <summary aria-label={`Åpne meny for ${item.title}`}>
          <MoreHorizontal aria-hidden="true" size={24} />
        </summary>
        <div className="wishlist-card__menu-panel" role="menu">
          <button type="button" role="menuitem" aria-disabled="true" onClick={handleUnavailableAction}>Flytt</button>
          <button type="button" role="menuitem" aria-disabled="true" onClick={handleUnavailableAction}>Rediger</button>
          <button type="button" role="menuitem" onClick={() => onDelete(item.id)}>Slett</button>
        </div>
      </details>
    </article>
  );
}

function AddWishButton() {
  return (
    <button className="wishlist-add-button" type="button" aria-disabled="true" onClick={handleUnavailableAction} title="Legg til kommer senere">
      <Plus aria-hidden="true" size={18} />
      Legg til ønske
    </button>
  );
}

function WishlistContent() {
  const { items, loading, error, refresh, deleteItem } = useWishlist();

  return (
    <div className="wishlist-page">
      <WishlistTabs />
      <p className="wishlist-coming-soon" aria-live="polite">Delt med meg: Kommer snart</p>
      {loading ? <WishlistSkeleton /> : null}
      {!loading && error ? <WishlistErrorState onRetry={() => void refresh()} /> : null}
      {!loading && !error && items.length === 0 ? <WishlistEmptyState /> : null}
      {!loading && !error && items.length > 0 ? (
        <>
          <div className="wishlist-list" aria-label="Mine ønsker">
            {items.map((item) => (
              <WishlistCard item={item} key={item.id} onDelete={(itemId) => void deleteItem(itemId)} />
            ))}
          </div>
          <AddWishButton />
        </>
      ) : null}
    </div>
  );
}

export default function WishlistPage() {
  const familyAccess = useFamilyAccess();

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Ønskeliste" titleAction={<WishlistShareButton />}>
        <PageContainer>
          <WishlistSkeleton />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title="Ønskeliste" titleAction={<WishlistShareButton />}>
      <PageContainer>
        <WishlistContent />
      </PageContainer>
    </AppShell>
  );
}
