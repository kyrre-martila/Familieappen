"use client";

import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageContainer, SectionHeader } from "../../components/ui";
import {
  ApiError,
  FamilyWithMembership,
  ShoppingList,
  addShoppingItem,
  deleteShoppingItem,
  getShoppingList,
  toggleShoppingItem
} from "../../lib/api";
import { chooseActiveFamily, getUserFacingApiMessage, handleMissingOrInvalidAuth } from "../../lib/auth-family";
import { clearActiveFamilyId } from "../../lib/session";

type ShoppingStatus = "loading" | "ready" | "pending" | "unauthorized" | "no-family" | "error";

export default function ShoppingPage() {
  const router = useRouter();
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<ShoppingStatus>("loading");
  const [message, setMessage] = useState("Laster handleliste …");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const familyAccess = useFamilyAccess();
  const approvedFamilyContext = familyAccess.status === "approved" ? familyAccess.familyContext : null;

  useEffect(() => {
    if (!approvedFamilyContext) {
      return;
    }

    setFamilies(approvedFamilyContext.families);
    setActiveFamilyIdState(approvedFamilyContext.activeFamilyId);
    void loadShoppingList(approvedFamilyContext.activeFamilyId);
  }, [approvedFamilyContext?.activeFamilyId, approvedFamilyContext]);

  const uncheckedCount = useMemo(
    () => shoppingList?.items.filter((item) => !item.checked).length ?? 0,
    [shoppingList]
  );
  const totalItems = shoppingList?.items.length ?? 0;
  const hasMultipleFamilies = families.length > 1;

  async function loadShoppingList(familyId = activeFamilyId) {
    if (!familyId) {
      setStatus("no-family");
      setMessage("Velg familie før du åpner handlelisten.");
      return;
    }

    setStatus("loading");
    setMessage("Laster handleliste …");

    try {
      setShoppingList(await getShoppingList(familyId));
      setStatus("ready");
      setMessage("");
    } catch (error) {
      handleLoadError(error);
    }
  }

  async function handleFamilyChange(event: ChangeEvent<HTMLSelectElement>) {
    const familyId = event.target.value;
    chooseActiveFamily(familyId);
    setActiveFamilyIdState(familyId);
    await loadShoppingList(familyId);
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextLabel = label.trim();
    const nextQuantity = quantity.trim();

    if (!activeFamilyId || nextLabel.length === 0 || isAdding) {
      return;
    }

    setIsAdding(true);
    setMessage("");

    try {
      const item = await addShoppingItem(activeFamilyId, {
        label: nextLabel,
        ...(nextQuantity ? { quantity: nextQuantity } : {})
      });
      setShoppingList((currentList) =>
        currentList ? { ...currentList, items: [...currentList.items, item].sort(sortShoppingItems) } : currentList
      );
      setLabel("");
      setQuantity("");
      setStatus("ready");
    } catch (error) {
      handleActionError(error, "Kunne ikke legge til varen. Prøv igjen.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggleItem(itemId: string) {
    if (!activeFamilyId || pendingItemId) {
      return;
    }

    setPendingItemId(itemId);
    setMessage("");

    try {
      const updatedItem = await toggleShoppingItem(activeFamilyId, itemId);
      setShoppingList((currentList) =>
        currentList
          ? {
              ...currentList,
              items: currentList.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)).sort(sortShoppingItems)
            }
          : currentList
      );
      setStatus("ready");
    } catch (error) {
      handleActionError(error, "Kunne ikke oppdatere varen. Prøv igjen.");
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!activeFamilyId || pendingItemId) {
      return;
    }

    setPendingItemId(itemId);
    setMessage("");

    try {
      await deleteShoppingItem(activeFamilyId, itemId);
      setShoppingList((currentList) =>
        currentList ? { ...currentList, items: currentList.items.filter((item) => item.id !== itemId) } : currentList
      );
      setStatus("ready");
    } catch (error) {
      handleActionError(error, "Kunne ikke slette varen. Prøv igjen.");
    } finally {
      setPendingItemId(null);
    }
  }

  function handleLoadError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(getUserFacingApiMessage(error, "Your session has expired. Logg inn på nytt."));
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      clearActiveFamilyId();
      setActiveFamilyIdState(null);
      setShoppingList(null);
      setStatus("error");
      setMessage("Handlelisten for denne familien kunne ikke lastes for kontoen din.");
      return;
    }

    setStatus("error");
    setMessage("Kunne ikke laste handlelisten akkurat nå. Prøv igjen.");
  }

  function handleActionError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(getUserFacingApiMessage(error, "Your session has expired. Logg inn på nytt."));
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      setStatus("error");
      setMessage("Denne varen finnes ikke lenger i familiens handleliste.");
      void loadShoppingList();
      return;
    }

    setMessage(getUserFacingApiMessage(error, fallbackMessage));
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

  return (
    <PageContainer>
      <section className="shopping-page" aria-labelledby="shopping-title">
        <div className="shopping-page__header">
          <div className="shopping-page__copy">
            <Badge tone="primary">Handleliste</Badge>
            <h1 id="shopping-title" className="shopping-page__title">
              Handleliste
            </h1>
            <p className="shopping-page__description">
              {status === "ready"
                ? `${formatItemCount(uncheckedCount)} gjenstår i ${shoppingList?.name ?? "Familiens handleliste"}.`
                : message}
            </p>
          </div>
          {hasMultipleFamilies ? (
            <label className="family-switcher">
              <span className="family-switcher__label">Aktiv familie</span>
              <select className="family-switcher__select" value={activeFamilyId ?? ""} onChange={handleFamilyChange}>
                {families.map((family) => (
                  <option key={family.family.id} value={family.family.id}>
                    {family.family.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <Card className="shopping-card" tone="warm">
          <SectionHeader
            action={<Badge tone="neutral">{totalItems} totalt</Badge>}
            eyebrow="Family list"
            title={formatItemCount(uncheckedCount)}
          />

          {status === "unauthorized" ? (
            <ShoppingStatusCard message={message} status={status} onRetry={() => loadShoppingList()} />
          ) : null}
          {status === "no-family" ? <ShoppingStatusCard message={message} status={status} onRetry={() => loadShoppingList()} /> : null}
          {status === "error" ? <ShoppingStatusCard message={message} status={status} onRetry={() => loadShoppingList()} /> : null}

          {status !== "unauthorized" && status !== "no-family" ? (
            <form className="shopping-form" onSubmit={handleAddItem}>
              <label className="shopping-form__field">
                <span className="shopping-form__label">Legg til vare</span>
                <input
                  className="shopping-form__input"
                  maxLength={120}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Melk"
                  value={label}
                />
              </label>
              <label className="shopping-form__field shopping-form__field--quantity">
                <span className="shopping-form__label">Antall</span>
                <input
                  className="shopping-form__input"
                  maxLength={60}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="2 liter"
                  value={quantity}
                />
              </label>
              <Button className="shopping-form__button" disabled={isAdding || label.trim().length === 0} type="submit" variant="primary">
                + Legg til vare
              </Button>
            </form>
          ) : null}

          {message && status === "ready" ? <p className="shopping-card__message">{message}</p> : null}

          {status === "loading" ? (
            <LoadingState title="Laster handleliste" description="Fetching the latest family items." />
          ) : null}

          {status === "ready" && shoppingList && shoppingList.items.length === 0 ? (
            <EmptyState title="Nothing to buy right now" description="Add an item when the family needs something." />
          ) : null}

          {status === "ready" && shoppingList && shoppingList.items.length > 0 ? (
            <ul className="shopping-list" aria-label="Varer i handlelisten">
              {shoppingList.items.map((item) => (
                <li className={item.checked ? "shopping-list__item shopping-list__item--checked" : "shopping-list__item"} key={item.id}>
                  <button
                    aria-label={`${item.checked ? "Uncheck" : "Check"} ${item.label}`}
                    className="shopping-list__toggle"
                    disabled={pendingItemId === item.id}
                    onClick={() => handleToggleItem(item.id)}
                    type="button"
                  >
                    {item.checked ? "☑" : "☐"}
                  </button>
                  <div className="shopping-list__content">
                    <span className="shopping-list__label">{item.label}</span>
                    {item.quantity ? <span className="shopping-list__quantity">{item.quantity}</span> : null}
                  </div>
                  <button
                    aria-label={`Delete ${item.label}`}
                    className="shopping-list__delete"
                    disabled={pendingItemId === item.id}
                    onClick={() => handleDeleteItem(item.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>
    </PageContainer>
  );
}

function ShoppingStatusCard({
  message,
  onRetry,
  status
}: {
  message: string;
  onRetry: () => void;
  status: ShoppingStatus;
}) {
  if (status === "unauthorized") {
    return (
      <div className="shopping-status">
        <EmptyState title="Logg inn på nytt" description={message} />
        <Link className="button button--primary" href="/login">
          Gå til innlogging
        </Link>
      </div>
    );
  }

  if (status === "no-family") {
    return (
      <div className="shopping-status">
        <EmptyState title="Opprett din første familie" description={message} />
        <Link className="button button--primary" href="/onboarding/create-family">
          Opprett familie
        </Link>
      </div>
    );
  }

  return (
    <div className="shopping-status">
      <ErrorState title="Handleliste kunne ikke lastes" description={message} />
      <Button variant="primary" onClick={onRetry}>
        Prøv igjen
      </Button>
    </div>
  );
}

function formatItemCount(count: number): string {
  return `${count} vare${count === 1 ? "" : "r"} gjenstår`;
}

function sortShoppingItems(first: ShoppingList["items"][number], second: ShoppingList["items"][number]) {
  if (first.checked !== second.checked) {
    return first.checked ? 1 : -1;
  }

  return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
}
