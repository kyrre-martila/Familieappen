"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, PageContainer, SectionHeader } from "../../../../components/ui";
import {
  PublicWishlist,
  getPublicWishlist,
  markPublicWishlistItemPurchased,
  reservePublicWishlistItem
} from "../../../../lib/api";

export default function SharedWishlistPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [wishlist, setWishlist] = useState<PublicWishlist | null>(null);
  const [reservedByName, setReservedByName] = useState("");
  const [message, setMessage] = useState("Loading shared wishlist…");

  useEffect(() => {
    void params.then(({ token: nextToken }) => {
      setToken(nextToken);
      void loadWishlist(nextToken);
    });
  }, [params]);

  async function loadWishlist(nextToken = token) {
    try {
      setWishlist(await getPublicWishlist(nextToken));
      setMessage("Shared wishlist ready.");
    } catch {
      setWishlist(null);
      setMessage("This shared wishlist could not be opened.");
    }
  }

  async function handleReserve(itemId: string) {
    await reservePublicWishlistItem(token, itemId, reservedByName || undefined);
    await loadWishlist();
  }

  async function handleMarkPurchased(itemId: string) {
    await markPublicWishlistItemPurchased(token, itemId, reservedByName || undefined);
    await loadWishlist();
  }

  if (!wishlist) {
    return (
      <PageContainer>
        <Card tone="default">
          <EmptyState title="Shared wishlist" description={message} />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <header className="page-header">
        <p className="page-header__eyebrow">Shared wishlist</p>
        <h1 className="page-header__title">{wishlist.title}</h1>
        <p className="page-header__description">
          Reserve or mark a gift as purchased. FamilieAppen only shows availability here and does not expose private family data.
        </p>
      </header>

      <Card tone="warm">
        <SectionHeader eyebrow="Optional" title="Your name" />
        <label className="field">
          <span className="field__label">Name for coordination</span>
          <input className="field__input" value={reservedByName} onChange={(event) => setReservedByName(event.target.value)} placeholder="Grandma, Uncle Alex…" />
        </label>
        <p className="card-note">This name is stored for coordination, but it is not shown in the family wishlist view.</p>
      </Card>

      <section className="wishlist-items" aria-label="Shared wishlist items">
        {wishlist.items.map((item) => (
          <Card className="wishlist-item" key={item.id} tone={item.unavailable ? "soft" : "default"}>
            <div className="wishlist-item__content">
              <Badge tone={item.unavailable ? "warning" : "success"}>{item.unavailable ? "Unavailable" : "Available"}</Badge>
              <h2 className="wishlist-item__title">{item.title}</h2>
              {item.description ? <p className="wishlist-item__description">{item.description}</p> : null}
              {item.productUrl ? <a className="wishlist-item__link" href={item.productUrl} rel="noreferrer" target="_blank">Open product link</a> : null}
            </div>
            <div className="wishlist-item__actions">
              <Button variant="secondary" disabled={item.unavailable} onClick={() => void handleReserve(item.id)}>Reserve</Button>
              <Button variant="primary" disabled={item.purchased} onClick={() => void handleMarkPurchased(item.id)}>Mark purchased</Button>
            </div>
          </Card>
        ))}
      </section>
    </PageContainer>
  );
}
