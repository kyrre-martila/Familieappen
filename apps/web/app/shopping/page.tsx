"use client";

import {
  FormEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MoreHorizontal, Plus, SlidersHorizontal, X } from "lucide-react";
import { LockedFeatureState } from "../../components/PendingAccess";
import { HuskMobileSheet } from "../../features/husk/components/HuskMobileSheet";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  SectionHeader,
} from "../../components/ui";
import {
  ApiError,
  FamilyWithMembership,
  ShoppingList,
  addShoppingItem,
  deleteShoppingItem,
  getShoppingList,
  toggleShoppingItem,
  updateShoppingItem,
} from "../../lib/api";
import {
  chooseActiveFamily,
  getUserFacingApiMessage,
  handleMissingOrInvalidAuth,
} from "../../lib/auth-family";
import { clearActiveFamilyId } from "../../lib/session";

type ShoppingStatus =
  | "loading"
  | "ready"
  | "pending"
  | "unauthorized"
  | "no-family"
  | "error";

export default function ShoppingPage() {
  const router = useRouter();
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<ShoppingStatus>("loading");
  const [message, setMessage] = useState("Laster handleliste …");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const familyAccess = useFamilyAccess();
  const approvedFamilyContext =
    familyAccess.status === "approved" ? familyAccess.familyContext : null;

  useEffect(() => {
    if (!approvedFamilyContext) {
      return;
    }

    setFamilies(approvedFamilyContext.families);
    setActiveFamilyIdState(approvedFamilyContext.activeFamilyId);
    void loadShoppingList(approvedFamilyContext.activeFamilyId);
  }, [approvedFamilyContext?.activeFamilyId, approvedFamilyContext]);

  const remainingItems = useMemo(
    () => shoppingList?.items.filter((item) => !item.checked) ?? [],
    [shoppingList],
  );
  const completedItems = useMemo(
    () =>
      shoppingList?.items
        .filter((item) => item.checked)
        .sort(sortCompletedShoppingItems) ?? [],
    [shoppingList],
  );
  const recentItems = useMemo(
    () => completedItems.slice(0, 3),
    [completedItems],
  );
  const uncheckedCount = remainingItems.length;
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
    const nextUnit = unit.trim();
    const nextNote = note.trim();
    const nextCategory = category.trim();

    if (!activeFamilyId || nextLabel.length === 0 || isAdding) {
      return;
    }

    setIsAdding(true);
    setMessage("");

    try {
      const input = {
        label: nextLabel,
        ...(nextQuantity ? { quantity: nextQuantity } : {}),
        ...(nextUnit ? { unit: nextUnit } : {}),
        ...(nextNote ? { note: nextNote } : {}),
        ...(nextCategory ? { category: nextCategory } : {}),
      };
      const item = editingItemId
        ? await updateShoppingItem(activeFamilyId, editingItemId, input)
        : await addShoppingItem(activeFamilyId, input);
      setShoppingList((currentList) =>
        currentList
          ? {
              ...currentList,
              items: (editingItemId
                ? currentList.items.map((currentItem) =>
                    currentItem.id === item.id ? item : currentItem,
                  )
                : [...currentList.items, item]
              ).sort(sortShoppingItems),
            }
          : currentList,
      );
      setLabel("");
      setQuantity("");
      setUnit("");
      setNote("");
      setCategory("");
      setIsNewSheetOpen(false);
      setEditingItemId(null);
      setStatus("ready");
    } catch (error) {
      handleActionError(error, editingItemId ? "Kunne ikke lagre varen. Prøv igjen." : "Kunne ikke legge til varen. Prøv igjen.");
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
              items: currentList.items
                .map((item) =>
                  item.id === updatedItem.id ? updatedItem : item,
                )
                .sort(sortShoppingItems),
            }
          : currentList,
      );
      setOpenMenuItemId(null);
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
        currentList
          ? {
              ...currentList,
              items: currentList.items.filter((item) => item.id !== itemId),
            }
          : currentList,
      );
      setOpenMenuItemId(null);
      setStatus("ready");
    } catch (error) {
      handleActionError(error, "Kunne ikke slette varen. Prøv igjen.");
    } finally {
      setPendingItemId(null);
    }
  }

  function handleOpenNewSheet() {
    setEditingItemId(null);
    setQuantity("");
    setUnit("");
    setNote("");
    setCategory("");
    setIsNewSheetOpen(true);
  }

  function handleEditItem(itemId: string) {
    const item = shoppingList?.items.find(
      (currentItem) => currentItem.id === itemId,
    );
    if (!item) {
      return;
    }

    setEditingItemId(itemId);
    setLabel(item.label);
    setQuantity(item.quantity ?? "");
    setUnit(item.unit ?? "");
    setNote(item.note ?? "");
    setCategory(item.category ?? "");
    setOpenMenuItemId(null);
    setIsNewSheetOpen(true);
  }

  function handleCloseItemSheet() {
    setIsNewSheetOpen(false);
    setEditingItemId(null);
    setQuantity("");
    setUnit("");
    setNote("");
    setCategory("");
  }

  function handleMenuClick(
    event: MouseEvent<HTMLButtonElement>,
    itemId: string,
  ) {
    event.stopPropagation();
    setOpenMenuItemId((currentItemId) =>
      currentItemId === itemId ? null : itemId,
    );
  }

  function handleLoadError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(
        getUserFacingApiMessage(
          error,
          "Your session has expired. Logg inn på nytt.",
        ),
      );
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      clearActiveFamilyId();
      setActiveFamilyIdState(null);
      setShoppingList(null);
      setStatus("error");
      setMessage(
        "Handlelisten for denne familien kunne ikke lastes for kontoen din.",
      );
      return;
    }

    setStatus("error");
    setMessage("Kunne ikke laste handlelisten akkurat nå. Prøv igjen.");
  }

  function handleActionError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(
        getUserFacingApiMessage(
          error,
          "Your session has expired. Logg inn på nytt.",
        ),
      );
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
          <EmptyState
            title="Sjekker familietilgang"
            description="Vent litt mens vi bekrefter familietilknytningen din."
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <section
        className="shopping-page shopping-page--mobile"
        aria-labelledby="shopping-title"
      >
        <div
          className="shopping-toolbar"
          aria-label="Søk og handlinger for handlelisten"
        >
          <label
            className="husk-search shopping-search"
            htmlFor="shopping-search-input"
          >
            <span className="sr-only">Legg til eller søk etter vare</span>
            <input
              id="shopping-search-input"
              className="husk-search__input"
              maxLength={120}
              onChange={(event) => setLabel(event.target.value)}
              onFocus={() => setMessage("")}
              placeholder="Jeg trenger ..."
              value={label}
            />
          </label>
          <div className="husk-toolbar__actions shopping-toolbar__actions">
            <button
              className="husk-filter-button"
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
            >
              <SlidersHorizontal
                aria-hidden="true"
                size={20}
                strokeWidth={2.4}
              />
              <span>Filter</span>
            </button>
            <button
              className="calendar-title-action husk-new-button"
              type="button"
              onClick={handleOpenNewSheet}
            >
              <Plus aria-hidden="true" size={18} strokeWidth={2.4} />
              <span>Ny</span>
            </button>
          </div>
        </div>

        {hasMultipleFamilies ? (
          <label className="family-switcher shopping-family-switcher">
            <span className="family-switcher__label">Aktiv familie</span>
            <select
              className="family-switcher__select"
              value={activeFamilyId ?? ""}
              onChange={handleFamilyChange}
            >
              {families.map((family) => (
                <option key={family.family.id} value={family.family.id}>
                  {family.family.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          className="shopping-list-selector"
          type="button"
          aria-label="Velg handleliste"
        >
          <span>{shoppingList?.name ?? "Familiehandleliste"}</span>
          <span aria-hidden="true">▼</span>
        </button>

        {status === "unauthorized" ? (
          <ShoppingStatusCard
            message={message}
            status={status}
            onRetry={() => loadShoppingList()}
          />
        ) : null}
        {status === "no-family" ? (
          <ShoppingStatusCard
            message={message}
            status={status}
            onRetry={() => loadShoppingList()}
          />
        ) : null}
        {status === "error" ? (
          <ShoppingStatusCard
            message={message}
            status={status}
            onRetry={() => loadShoppingList()}
          />
        ) : null}
        {message && status === "ready" ? (
          <p className="shopping-card__message">{message}</p>
        ) : null}
        {status === "loading" ? (
          <LoadingState
            title="Laster handleliste"
            description="Henter familiens varer."
          />
        ) : null}

        {status === "ready" && shoppingList ? (
          <>
            <section
              className="shopping-section"
              aria-labelledby="remaining-shopping-title"
            >
              <SectionHeader
                action={<Badge tone="neutral">{uncheckedCount}</Badge>}
                title="Gjenstående varer"
              />
              {remainingItems.length === 0 ? (
                <Card className="shopping-empty-card" tone="default">
                  <EmptyState
                    title="Ingenting å handle akkurat nå"
                    description="Skriv i søkefeltet eller trykk Ny når familien trenger noe."
                  />
                </Card>
              ) : (
                <ul
                  className="shopping-list shopping-list--cards"
                  aria-label="Gjenstående varer"
                >
                  {remainingItems.map((item) => (
                    <ShoppingItemCard
                      key={item.id}
                      item={item}
                      isBusy={pendingItemId === item.id}
                      isMenuOpen={openMenuItemId === item.id}
                      onDelete={handleDeleteItem}
                      onEdit={handleEditItem}
                      onMenuClick={handleMenuClick}
                      onToggle={handleToggleItem}
                    />
                  ))}
                </ul>
              )}
            </section>

            {completedItems.length > 0 ? (
              <section
                className="shopping-section"
                aria-labelledby="completed-shopping-title"
              >
                <button
                  className="shopping-completed-toggle"
                  type="button"
                  aria-expanded={showCompletedItems}
                  aria-controls="completed-shopping-list"
                  onClick={() => setShowCompletedItems((isOpen) => !isOpen)}
                >
                  <span id="completed-shopping-title">Fullførte varer</span>
                  <span className="shopping-completed-toggle__meta">
                    <Badge tone="success">{completedItems.length}</Badge>
                    <ChevronDown aria-hidden="true" className={showCompletedItems ? "shopping-completed-toggle__icon shopping-completed-toggle__icon--open" : "shopping-completed-toggle__icon"} size={18} strokeWidth={2.5} />
                  </span>
                </button>
                {showCompletedItems ? (
                <ul
                  id="completed-shopping-list"
                  className="shopping-list shopping-list--cards"
                  aria-label="Fullførte varer"
                >
                  {completedItems.map((item) => (
                    <ShoppingItemCard
                      key={item.id}
                      item={item}
                      isBusy={pendingItemId === item.id}
                      isMenuOpen={openMenuItemId === item.id}
                      onDelete={handleDeleteItem}
                      onEdit={handleEditItem}
                      onMenuClick={handleMenuClick}
                      onToggle={handleToggleItem}
                    />
                  ))}
                </ul>
                ) : null}
              </section>
            ) : null}

            {recentItems.length > 0 ? (
              <section
                className="shopping-section"
                aria-labelledby="recent-shopping-title"
              >
                <SectionHeader title="Nylig brukt" />
                <div
                  className="shopping-recent-pills"
                  aria-label="Nylig brukte varer"
                >
                  {recentItems.map((item) => (
                    <button
                      className="husk-filter-button shopping-recent-pill"
                      key={item.id}
                      type="button"
                      onClick={() => setLabel(item.label)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <div
          className="shopping-sticky-actions"
          aria-label="Handlelistehandlinger"
        >
          <Button
            disabled={
              isAdding ||
              label.trim().length === 0 ||
              status === "unauthorized" ||
              status === "no-family"
            }
            onClick={() => setIsNewSheetOpen(true)}
            variant="primary"
          >
            Legg til vare
          </Button>
        </div>
      </section>

      <HuskMobileSheet
        isOpen={isNewSheetOpen}
        labelledBy="shopping-item-sheet-title"
        onClose={handleCloseItemSheet}
      >
        <form className="shopping-edit-sheet" onSubmit={handleAddItem}>
          <div className="calendar-filter-sheet__header">
            <div>
              <p className="husk-school-sheet__eyebrow">Handleliste</p>
              <h2 id="shopping-item-sheet-title" className="calendar-filter-sheet__title">
                {editingItemId ? "Rediger vare" : "Ny vare"}
              </h2>
            </div>
            <button className="calendar-filter-sheet__close" type="button" aria-label="Lukk" onClick={handleCloseItemSheet}>
              <X aria-hidden="true" size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="calendar-filter-sheet__content shopping-edit-sheet__content">
            <label className="husk-school-field">
              <span>Navn</span>
              <input maxLength={120} onChange={(event) => setLabel(event.target.value)} placeholder="Jeg trenger ..." value={label} />
            </label>
            <div className="shopping-edit-sheet__grid">
              <label className="husk-school-field">
                <span>Antall</span>
                <input maxLength={60} onChange={(event) => setQuantity(event.target.value)} placeholder="2" value={quantity} />
              </label>
              <label className="husk-school-field">
                <span>Enhet</span>
                <input maxLength={40} onChange={(event) => setUnit(event.target.value)} placeholder="liter" value={unit} />
              </label>
            </div>
            <label className="husk-school-field">
              <span>Notat</span>
              <textarea maxLength={240} onChange={(event) => setNote(event.target.value)} placeholder="F.eks. merke eller tilbud" value={note} />
            </label>
            <label className="husk-school-field">
              <span>Kategori</span>
              <input maxLength={60} onChange={(event) => setCategory(event.target.value)} placeholder="Frukt og grønt" value={category} />
            </label>
          </div>
          <div className="calendar-filter-sheet__actions">
            <button className="calendar-filter-sheet__action calendar-filter-sheet__action--secondary" type="button" onClick={handleCloseItemSheet}>Avbryt</button>
            <button className="calendar-filter-sheet__action calendar-filter-sheet__action--primary" disabled={isAdding || label.trim().length === 0} type="submit">{isAdding ? "Lagrer …" : "Lagre"}</button>
          </div>
        </form>
      </HuskMobileSheet>

      <HuskMobileSheet
        isOpen={isFilterSheetOpen}
        labelledBy="shopping-filter-sheet-title"
        onClose={() => setIsFilterSheetOpen(false)}
      >
        <div className="shopping-sheet">
          <div className="shopping-sheet__header">
            <p className="section-header__eyebrow">Handleliste</p>
            <h2
              id="shopping-filter-sheet-title"
              className="section-header__title"
            >
              Filter
            </h2>
          </div>
          <p className="shopping-card__message">
            Flere handlelister og filtre kommer senere. Foreløpig viser vi
            familiehandlelisten.
          </p>
          <Button variant="primary" onClick={() => setIsFilterSheetOpen(false)}>
            Ferdig
          </Button>
        </div>
      </HuskMobileSheet>
    </PageContainer>
  );
}

function ShoppingItemCard({
  isBusy,
  isMenuOpen,
  item,
  onDelete,
  onEdit,
  onMenuClick,
  onToggle,
}: {
  isBusy: boolean;
  isMenuOpen: boolean;
  item: ShoppingList["items"][number];
  onDelete: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onMenuClick: (event: MouseEvent<HTMLButtonElement>, itemId: string) => void;
  onToggle: (itemId: string) => void;
}) {
  return (
    <li
      className={`shopping-list__item shopping-list__item--card${item.checked ? " shopping-list__item--checked" : ""}`}
    >
      <button
        className="shopping-list__card-button"
        disabled={isBusy}
        type="button"
        onClick={() => onToggle(item.id)}
        aria-label={`${item.checked ? "Flytt tilbake" : "Marker kjøpt"}: ${item.label}`}
      >
        <span className="shopping-list__content">
          <span className="shopping-list__label">{item.label}</span>
          {formatShoppingItemMeta(item) ? (
            <span className="shopping-list__quantity">{formatShoppingItemMeta(item)}</span>
          ) : null}
        </span>
      </button>
      <div className="shopping-list__menu-wrap">
        <button
          aria-label={`Meny for ${item.label}`}
          className="shopping-list__menu-button"
          disabled={isBusy}
          onClick={(event) => onMenuClick(event, item.id)}
          type="button"
        >
          <MoreHorizontal aria-hidden="true" size={20} strokeWidth={2.5} />
        </button>
        {isMenuOpen ? (
          <div className="shopping-list__menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => onEdit(item.id)}
            >
              Rediger
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => onDelete(item.id)}
            >
              Slett
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function formatShoppingItemMeta(item: ShoppingList["items"][number]) {
  return [item.quantity, item.unit, item.category, item.note].filter(Boolean).join(" · ");
}

function ShoppingStatusCard({
  message,
  onRetry,
  status,
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
        <Link
          className="button button--primary"
          href="/onboarding/create-family"
        >
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

function sortCompletedShoppingItems(
  first: ShoppingList["items"][number],
  second: ShoppingList["items"][number],
) {
  return (
    new Date(second.checkedAt ?? second.updatedAt).getTime() -
    new Date(first.checkedAt ?? first.updatedAt).getTime()
  );
}

function sortShoppingItems(
  first: ShoppingList["items"][number],
  second: ShoppingList["items"][number],
) {
  if (first.checked !== second.checked) {
    return first.checked ? 1 : -1;
  }

  return (
    new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
  );
}
