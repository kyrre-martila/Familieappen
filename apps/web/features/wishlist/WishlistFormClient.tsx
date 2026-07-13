"use client";

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Gift, Link as LinkIcon, Loader2, Trash2 } from "lucide-react";

import { EmptyState } from "../../components/ui";
import { getUserFacingApiMessage } from "../../lib/auth-family";
import { type WishlistItem } from "../../lib/api";
import { useWishlist, type WishlistItemInput } from "./hooks/useWishlist";

import { resolveApiAssetUrl } from "../../lib/assets";
type WishlistFormMode = "create" | "edit";

type WishlistFormClientProps = {
  itemId?: string;
  mode: WishlistFormMode;
};

type WishlistDraft = {
  title: string;
  description: string;
  price: string;
  storeOrLink: string;
  imageUrl: string;
  icon: string;
};

const iconOptions = ["🎁", "🧸", "🚲", "📚", "🎧", "👟", "🎮", "⚽", "🎨", "✨"];
const wishlistToastStorageKey = "familieappen:wishlist:toast";

function getDraftFromItem(item?: WishlistItem): WishlistDraft {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    price: item?.price === null || item?.price === undefined ? "" : String(item.price),
    storeOrLink: item?.storeOrLink ?? "",
    imageUrl: item?.imageUrl ?? "",
    icon: item?.icon ?? "🎁",
  };
}

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toWishlistInput(draft: WishlistDraft): WishlistItemInput {
  const priceText = draft.price.trim().replace(",", ".");
  const price = priceText.length > 0 ? Number(priceText) : null;

  return {
    title: draft.title.trim(),
    description: toNullableText(draft.description),
    price: Number.isFinite(price) ? price : null,
    storeOrLink: toNullableText(draft.storeOrLink),
    imageUrl: toNullableText(draft.imageUrl),
    icon: toNullableText(draft.icon),
  };
}

function rememberWishlistToast(message: string) {
  window.sessionStorage.setItem(wishlistToastStorageKey, message);
}

export function WishlistFormClient({ itemId, mode }: WishlistFormClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { items, loading, error, createWishlistItem, updateWishlistItem, deleteWishlistItem } = useWishlist();
  const existingItem = useMemo(() => items.find((item) => item.id === itemId), [itemId, items]);
  const [draft, setDraft] = useState<WishlistDraft>(() => getDraftFromItem(existingItem));
  const [hydratedItemId, setHydratedItemId] = useState<string | null>(existingItem?.id ?? null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!existingItem || hydratedItemId === existingItem.id) {
      return;
    }

    setHydratedItemId(existingItem.id);
    setDraft(getDraftFromItem(existingItem));
  }, [existingItem, hydratedItemId]);

  const isEditMode = mode === "edit";
  const pageTitle = isEditMode ? "Rediger ønske" : "Legg til ønske";

  function updateDraft(field: keyof WishlistDraft, value: string) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    if (field === "title" && value.trim().length > 0) {
      setValidationMessage(null);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        updateDraft("imageUrl", reader.result);
      }
    });
    reader.readAsDataURL(file);
  }

  function cancel() {
    router.push("/wishlist");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setValidationMessage("Legg til en tittel");
      return;
    }

    if (isEditMode && !itemId) return;

    setSaving(true);
    setActionMessage(null);

    try {
      const input = toWishlistInput(draft);
      if (isEditMode) {
        await updateWishlistItem(itemId as string, input);
      } else {
        await createWishlistItem(input);
      }
      rememberWishlistToast("Ønske lagret");
      router.push("/wishlist");
    } catch (submitError) {
      setActionMessage(getUserFacingApiMessage(submitError, "Kunne ikke lagre ønsket akkurat nå"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!itemId || !window.confirm("Vil du slette ønsket?")) {
      return;
    }

    setDeleting(true);
    setActionMessage(null);

    try {
      await deleteWishlistItem(itemId);
      rememberWishlistToast("Ønske slettet");
      router.push("/wishlist");
    } catch (deleteError) {
      setActionMessage(getUserFacingApiMessage(deleteError, "Kunne ikke slette ønsket akkurat nå"));
    } finally {
      setDeleting(false);
    }
  }

  if (isEditMode && loading) {
    return (
      <main className="wishlist-form-shell">
        <WishlistFormTopBar title={pageTitle} onBack={cancel} />
        <div className="wishlist-form wishlist-form--loading" aria-label="Laster ønske">
          <Loader2 aria-hidden="true" className="wishlist-form-spinner" size={26} />
        </div>
      </main>
    );
  }

  if (isEditMode && !existingItem) {
    return (
      <main className="wishlist-form-shell">
        <WishlistFormTopBar title={pageTitle} onBack={cancel} />
        <div className="wishlist-form">
          <EmptyState title="Fant ikke ønsket" description={error ?? "Ønsket kan være slettet eller utilgjengelig."} />
          <button className="wishlist-form-button wishlist-form-button--outline" type="button" onClick={cancel}>Tilbake</button>
        </div>
      </main>
    );
  }

  return (
    <main className="wishlist-form-shell">
      <WishlistFormTopBar title={pageTitle} onBack={cancel} />
      <form className="wishlist-form" onSubmit={handleSubmit} noValidate>
        <section className="wishlist-form-media-grid" aria-label="Bilde eller ikon">
          <button className="wishlist-form-media-card wishlist-form-media-card--image" type="button" onClick={() => fileInputRef.current?.click()}>
            <span className="wishlist-form-media-card__preview" aria-hidden="true">
              {draft.imageUrl ? <img alt="" src={resolveApiAssetUrl(draft.imageUrl) ?? draft.imageUrl} /> : <Camera size={28} />}
            </span>
            <span>Bilde</span>
            <small>{draft.imageUrl ? "Endre bilde" : "Legg til bilde"}</small>
          </button>
          <input ref={fileInputRef} className="wishlist-form-file-input" type="file" accept="image/*" onChange={handleImageChange} />

          <div className="wishlist-form-media-card wishlist-form-media-card--icon">
            <span className="wishlist-form-media-card__preview wishlist-form-media-card__preview--icon" aria-hidden="true">
              {draft.icon || <Gift size={34} />}
            </span>
            <span>Ikon</span>
            <div className="wishlist-form-icon-options" aria-label="Velg ikon">
              {iconOptions.map((icon) => (
                <button
                  aria-label={`Velg ${icon}`}
                  aria-pressed={draft.icon === icon}
                  className="wishlist-form-icon-option"
                  key={icon}
                  type="button"
                  onClick={() => updateDraft("icon", icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </section>

        <label className="wishlist-form-field">
          <span>Tittel <strong aria-hidden="true">*</strong></span>
          <input
            autoComplete="off"
            className="wishlist-form-input"
            name="title"
            onChange={(event) => updateDraft("title", event.target.value)}
            placeholder="Hva ønsker du deg?"
            required
            value={draft.title}
          />
        </label>
        {validationMessage ? <p className="wishlist-form-message" role="alert">{validationMessage}</p> : null}

        <label className="wishlist-form-field">
          <span>Beskrivelse</span>
          <textarea
            className="wishlist-form-input wishlist-form-textarea"
            name="description"
            onChange={(event) => updateDraft("description", event.target.value)}
            placeholder="Legg til en beskrivelse"
            value={draft.description}
          />
        </label>

        <label className="wishlist-form-field">
          <span>Pris</span>
          <span className="wishlist-form-price-wrap">
            <input
              className="wishlist-form-input"
              inputMode="decimal"
              min="0"
              name="price"
              onChange={(event) => updateDraft("price", event.target.value)}
              placeholder="0"
              type="number"
              value={draft.price}
            />
            <span aria-hidden="true">kr</span>
          </span>
        </label>

        <label className="wishlist-form-field">
          <span>Link / butikk</span>
          <span className="wishlist-form-link-wrap">
            <LinkIcon aria-hidden="true" size={20} />
            <input
              autoComplete="off"
              className="wishlist-form-input"
              name="storeOrLink"
              onChange={(event) => updateDraft("storeOrLink", event.target.value)}
              placeholder="Lenke eller butikk"
              value={draft.storeOrLink}
            />
          </span>
        </label>

        {actionMessage ? <p className="wishlist-form-message" role="alert">{actionMessage}</p> : null}

        <div className="wishlist-form-actions">
          <button className="wishlist-form-button wishlist-form-button--outline" type="button" onClick={cancel}>Avbryt</button>
          <button className="wishlist-form-button wishlist-form-button--primary" type="submit" disabled={saving || deleting}>
            {saving ? "Lagrer …" : "Lagre"}
          </button>
        </div>

        {isEditMode ? (
          <button className="wishlist-form-delete" type="button" onClick={() => void handleDelete()} disabled={saving || deleting}>
            <Trash2 aria-hidden="true" size={18} />
            {deleting ? "Sletter …" : "Slett ønske"}
          </button>
        ) : null}
      </form>
    </main>
  );
}

function WishlistFormTopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="wishlist-form-topbar">
      <button className="wishlist-form-back" type="button" onClick={onBack} aria-label="Tilbake til ønskelisten">
        <ArrowLeft aria-hidden="true" size={28} />
      </button>
      <h1>{title}</h1>
      <span aria-hidden="true" />
    </header>
  );
}
