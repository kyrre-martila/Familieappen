"use client";

import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";
import {
  ApiError,
  FamilyWithMembership,
  ShoppingList,
  addShoppingItem,
  clearActiveFamilyId,
  clearAuthSession,
  deleteShoppingItem,
  getAccessToken,
  getActiveFamilyId,
  getShoppingList,
  listFamilies,
  setActiveFamilyId,
  toggleShoppingItem
} from "../../lib/api";

type ShoppingStatus = "loading" | "ready" | "unauthorized" | "no-family" | "error";

export default function ShoppingPage() {
  const router = useRouter();
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<ShoppingStatus>("loading");
  const [message, setMessage] = useState("Loading shopping list…");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      clearAuthSession();
      router.replace("/login");
      return;
    }

    void bootstrapShopping();
  }, [router]);

  const uncheckedCount = useMemo(
    () => shoppingList?.items.filter((item) => !item.checked).length ?? 0,
    [shoppingList]
  );
  const totalItems = shoppingList?.items.length ?? 0;
  const hasMultipleFamilies = families.length > 1;

  async function bootstrapShopping() {
    setStatus("loading");
    setMessage("Loading shopping list…");

    try {
      const userFamilies = await listFamilies();
      setFamilies(userFamilies);

      if (userFamilies.length === 0) {
        clearActiveFamilyId();
        setActiveFamilyIdState(null);
        setShoppingList(null);
        setStatus("no-family");
        setMessage("Create a family before using the shared shopping list.");
        return;
      }

      const storedFamilyId = getActiveFamilyId();
      const nextFamily = userFamilies.find((family) => family.family.id === storedFamilyId) ?? userFamilies[0];
      setActiveFamilyId(nextFamily.family.id);
      setActiveFamilyIdState(nextFamily.family.id);
      await loadShoppingList(nextFamily.family.id);
    } catch (error) {
      handleLoadError(error);
    }
  }

  async function loadShoppingList(familyId = activeFamilyId) {
    if (!familyId) {
      setStatus("no-family");
      setMessage("Choose a family before opening the shopping list.");
      return;
    }

    setStatus("loading");
    setMessage("Loading shopping list…");

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
    setActiveFamilyId(familyId);
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
      handleActionError(error, "Could not add the item. Please try again.");
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
      handleActionError(error, "Could not update the item. Please try again.");
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
      handleActionError(error, "Could not delete the item. Please try again.");
    } finally {
      setPendingItemId(null);
    }
  }

  function handleLoadError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession();
      setStatus("unauthorized");
      setMessage("Your session has expired. Please sign in again.");
      router.replace("/login");
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      clearActiveFamilyId();
      setActiveFamilyIdState(null);
      setShoppingList(null);
      setStatus("error");
      setMessage("That family shopping list could not be loaded for your account.");
      return;
    }

    setStatus("error");
    setMessage("Could not load shopping right now. Please try again.");
  }

  function handleActionError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession();
      setStatus("unauthorized");
      setMessage("Your session has expired. Please sign in again.");
      router.replace("/login");
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      setStatus("error");
      setMessage("This item is no longer available in your family shopping list.");
      void loadShoppingList();
      return;
    }

    setMessage(error instanceof ApiError ? error.message : fallbackMessage);
  }

  return (
    <PageContainer>
      <section className="shopping-page" aria-labelledby="shopping-title">
        <div className="shopping-page__header">
          <div className="shopping-page__copy">
            <Badge tone="primary">Shared shopping</Badge>
            <h1 id="shopping-title" className="shopping-page__title">
              Shopping
            </h1>
            <p className="shopping-page__description">
              {status === "ready"
                ? `${formatItemCount(uncheckedCount)} remaining for ${shoppingList?.name ?? "Family Shopping"}.`
                : message}
            </p>
          </div>
          {hasMultipleFamilies ? (
            <label className="family-switcher">
              <span className="family-switcher__label">Active family</span>
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
            action={<Badge tone="neutral">{totalItems} total</Badge>}
            eyebrow="Family list"
            title={formatItemCount(uncheckedCount)}
          />

          {status === "unauthorized" ? (
            <ShoppingStatusCard message={message} status={status} onRetry={bootstrapShopping} />
          ) : null}
          {status === "no-family" ? <ShoppingStatusCard message={message} status={status} onRetry={bootstrapShopping} /> : null}
          {status === "error" ? <ShoppingStatusCard message={message} status={status} onRetry={() => loadShoppingList()} /> : null}

          {status !== "unauthorized" && status !== "no-family" ? (
            <form className="shopping-form" onSubmit={handleAddItem}>
              <label className="shopping-form__field">
                <span className="shopping-form__label">Add item</span>
                <input
                  className="shopping-form__input"
                  maxLength={120}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Milk"
                  value={label}
                />
              </label>
              <label className="shopping-form__field shopping-form__field--quantity">
                <span className="shopping-form__label">Quantity</span>
                <input
                  className="shopping-form__input"
                  maxLength={60}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="2 liters"
                  value={quantity}
                />
              </label>
              <Button className="shopping-form__button" disabled={isAdding || label.trim().length === 0} type="submit" variant="primary">
                + Add item
              </Button>
            </form>
          ) : null}

          {message && status === "ready" ? <p className="shopping-card__message">{message}</p> : null}

          {status === "loading" ? (
            <EmptyState title="Loading shopping list" description="Fetching the latest family items." />
          ) : null}

          {status === "ready" && shoppingList && shoppingList.items.length === 0 ? (
            <EmptyState title="Nothing to buy right now" description="Add an item when the family needs something." />
          ) : null}

          {status === "ready" && shoppingList && shoppingList.items.length > 0 ? (
            <ul className="shopping-list" aria-label="Shopping items">
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
        <EmptyState title="Please sign in again" description={message} />
        <Link className="button button--primary" href="/login">
          Go to login
        </Link>
      </div>
    );
  }

  if (status === "no-family") {
    return (
      <div className="shopping-status">
        <EmptyState title="Create your first family" description={message} />
        <Link className="button button--primary" href="/onboarding/create-family">
          Create family
        </Link>
      </div>
    );
  }

  return (
    <div className="shopping-status">
      <EmptyState title="Shopping could not load" description={message} />
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function formatItemCount(count: number): string {
  return `${count} item${count === 1 ? "" : "s"} remaining`;
}

function sortShoppingItems(first: ShoppingList["items"][number], second: ShoppingList["items"][number]) {
  if (first.checked !== second.checked) {
    return first.checked ? 1 : -1;
  }

  return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
}
