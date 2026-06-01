"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Badge, Button, Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";
import {
  FamilyMember,
  Wishlist,
  WishlistSummary,
  addWishlistItem,
  createWishlist,
  createWishlistShare,
  getFamily,
  getWishlist,
  getWishlists,
  markWishlistItemPurchased,
  reserveWishlistItem
} from "../../lib/api";
import { getUserFacingApiMessage, handleMissingOrInvalidAuth } from "../../lib/auth-family";

type WishlistsStatus = "loading" | "ready" | "pending" | "missing-family" | "unauthorized" | "error";

export default function WishlistsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<WishlistsStatus>("loading");
  const [message, setMessage] = useState("Loading wishlists…");
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [wishlists, setWishlists] = useState<WishlistSummary[]>([]);
  const [activeWishlist, setActiveWishlist] = useState<Wishlist | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [wishlistTitle, setWishlistTitle] = useState("");
  const [wishlistDescription, setWishlistDescription] = useState("");
  const [ownerFamilyMemberId, setOwnerFamilyMemberId] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemProductUrl, setItemProductUrl] = useState("");
  const [itemDescription, setItemDescription] = useState("");

  const familyAccess = useFamilyAccess();
  const approvedFamilyContext = familyAccess.status === "approved" ? familyAccess.familyContext : null;

  useEffect(() => {
    if (!approvedFamilyContext) {
      return;
    }

    setFamilyId(approvedFamilyContext.activeFamilyId);
    void loadWishlists(approvedFamilyContext.activeFamilyId);
  }, [approvedFamilyContext?.activeFamilyId, approvedFamilyContext]);

  const activeOwner = useMemo(() => {
    return members.find((member) => member.id === activeWishlist?.ownerFamilyMemberId) ?? null;
  }, [activeWishlist, members]);

  async function loadWishlists(nextFamilyId: string, selectedWishlistId?: string) {
    setStatus("loading");
    setMessage("Loading wishlists…");

    try {
      const [familyDetails, wishlistSummaries] = await Promise.all([getFamily(nextFamilyId), getWishlists(nextFamilyId)]);
      setMembers(familyDetails.members);
      setWishlists(wishlistSummaries);

      const nextOwnerId = ownerFamilyMemberId || familyDetails.members[0]?.id || "";
      setOwnerFamilyMemberId(nextOwnerId);

      const selected = selectedWishlistId
        ? wishlistSummaries.find((wishlist) => wishlist.id === selectedWishlistId)
        : wishlistSummaries[0];

      if (selected) {
        const details = await getWishlist(nextFamilyId, selected.id);
        setActiveWishlist(details);
      } else {
        setActiveWishlist(null);
      }

      setStatus("ready");
      setMessage("Wishlists ready.");
    } catch (error) {
      if (handleMissingOrInvalidAuth(error, router)) {
        setStatus("unauthorized");
        setMessage(getUserFacingApiMessage(error, "Your session has expired. Please sign in again."));
        return;
      }

      setStatus("error");
      setMessage("Wishlists could not load right now. Please try again.");
    }
  }

  async function handleCreateWishlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!familyId) {
      return;
    }

    const created = await createWishlist(familyId, {
      ownerFamilyMemberId,
      title: wishlistTitle,
      description: wishlistDescription || undefined
    });

    setWishlistTitle("");
    setWishlistDescription("");
    setShareUrl(null);
    await loadWishlists(familyId, created.id);
  }

  async function handleSelectWishlist(wishlistId: string) {
    if (!familyId) {
      return;
    }

    setActiveWishlist(await getWishlist(familyId, wishlistId));
    setShareUrl(null);
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!familyId || !activeWishlist) {
      return;
    }

    await addWishlistItem(familyId, activeWishlist.id, {
      title: itemTitle,
      productUrl: itemProductUrl || undefined,
      description: itemDescription || undefined
    });

    setItemTitle("");
    setItemProductUrl("");
    setItemDescription("");
    await loadWishlists(familyId, activeWishlist.id);
  }

  async function handleReserve(itemId: string) {
    if (!familyId || !activeWishlist) {
      return;
    }

    await reserveWishlistItem(familyId, itemId);
    await loadWishlists(familyId, activeWishlist.id);
  }

  async function handleMarkPurchased(itemId: string) {
    if (!familyId || !activeWishlist) {
      return;
    }

    await markWishlistItemPurchased(familyId, itemId);
    await loadWishlists(familyId, activeWishlist.id);
  }

  async function handleCreateShare() {
    if (!familyId || !activeWishlist) {
      return;
    }

    const share = await createWishlistShare(familyId, activeWishlist.id);
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    setShareUrl(`${origin}${share.shareUrl}`);
  }

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <PageContainer>
        <Card tone="default">
          <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
        </Card>
      </PageContainer>
    );
  }

  if (status !== "ready") {
    return (
      <PageContainer>
        <Card tone="default">
          <EmptyState title={status === "loading" ? "Loading wishlists" : "Wishlists unavailable"} description={message} />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <header className="page-header">
        <p className="page-header__eyebrow">Wishlists</p>
        <h1 className="page-header__title">Gift ideas without spoiled surprises</h1>
        <p className="page-header__description">
          Create simple wishlists, add links, and let family helpers reserve gifts without exposing buyer names to the wishlist owner.
        </p>
      </header>

      <section className="wishlist-layout" aria-label="Wishlist workspace">
        <Card className="wishlist-panel" tone="warm">
          <SectionHeader eyebrow="Create" title="New wishlist" />
          <form className="form-stack" onSubmit={handleCreateWishlist}>
            <label className="field">
              <span className="field__label">Owner</span>
              <select className="field__input" value={ownerFamilyMemberId} onChange={(event) => setOwnerFamilyMemberId(event.target.value)} required>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Title</span>
              <input className="field__input" value={wishlistTitle} onChange={(event) => setWishlistTitle(event.target.value)} placeholder="Bursdagsønsker" required />
            </label>
            <label className="field">
              <span className="field__label">Description</span>
              <textarea className="field__input" value={wishlistDescription} onChange={(event) => setWishlistDescription(event.target.value)} placeholder="Valgfri beskrivelse" />
            </label>
            <Button variant="primary" type="submit">Create wishlist</Button>
          </form>
        </Card>

        <Card className="wishlist-panel" tone="default">
          <SectionHeader action={<Badge tone="neutral">{wishlists.length} lists</Badge>} eyebrow="Family" title="Wishlists" />
          {wishlists.length ? (
            <div className="wishlist-selector">
              {wishlists.map((wishlist) => (
                <button
                  className={wishlist.id === activeWishlist?.id ? "wishlist-selector__item wishlist-selector__item--active" : "wishlist-selector__item"}
                  key={wishlist.id}
                  onClick={() => void handleSelectWishlist(wishlist.id)}
                  type="button"
                >
                  <span className="wishlist-selector__title">{wishlist.title}</span>
                  <span className="wishlist-selector__meta">{wishlist.unavailableCount}/{wishlist.itemCount} unavailable</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No wishlists yet" description="Create the first wishlist for a child, birthday, or holiday." />
          )}
        </Card>
      </section>

      {activeWishlist ? (
        <section className="wishlist-detail" aria-label="Selected wishlist">
          <Card tone="accent">
            <SectionHeader
              action={<Badge tone="primary">{activeWishlist.items.length} wishes</Badge>}
              eyebrow={activeOwner ? `For ${activeOwner.displayName}` : "Selected wishlist"}
              title={activeWishlist.title}
            />
            {activeWishlist.description ? <p className="card-note">{activeWishlist.description}</p> : null}
            <div className="wishlist-actions">
              <Button variant="secondary" onClick={() => void handleCreateShare()}>Create share link</Button>
              {shareUrl ? <p className="share-link">{shareUrl}</p> : null}
            </div>
          </Card>

          <Card tone="default">
            <SectionHeader eyebrow="Add" title="Add a wish" />
            <form className="wishlist-item-form" onSubmit={handleAddItem}>
              <label className="field">
                <span className="field__label">Wish</span>
                <input className="field__input" value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} placeholder="LEGO-sett, bok, sykkelhjelm…" required />
              </label>
              <label className="field">
                <span className="field__label">Product link</span>
                <input className="field__input" type="url" value={itemProductUrl} onChange={(event) => setItemProductUrl(event.target.value)} placeholder="https://nettbutikk.no/produkt" />
              </label>
              <label className="field field--wide">
                <span className="field__label">Description</span>
                <input className="field__input" value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} placeholder="Størrelse, farge eller andre detaljer" />
              </label>
              <Button variant="primary" type="submit">Add item</Button>
            </form>
          </Card>

          <div className="wishlist-items">
            {activeWishlist.items.length ? activeWishlist.items.map((item) => (
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
            )) : <EmptyState title="No wishes yet" description="Add gift ideas and product links so helpers know what to buy." />}
          </div>
        </section>
      ) : null}
    </PageContainer>
  );
}
