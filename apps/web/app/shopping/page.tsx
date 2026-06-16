"use client";

import {
  FormEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Share2,
  X,
} from "lucide-react";
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
import {
  SHOPPING_CATALOG,
  SHOPPING_CATEGORIES,
  getShoppingCatalogItemsByCategory,
  getShoppingCategoryBySlug,
  normalizeShoppingSearchValue,
  searchShoppingCatalog,
  type ShoppingCatalogItem,
} from "@familieappen/shared";

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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [isListSheetOpen, setIsListSheetOpen] = useState(false);
  const [isRecentItemsOpen, setIsRecentItemsOpen] = useState(true);
  const [openCatalogCategories, setOpenCatalogCategories] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      SHOPPING_CATEGORIES.map((categoryOption) => [categoryOption.slug, true]),
    ),
  );
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
  const groupedRemainingItems = useMemo(
    () => groupShoppingItemsByCategory(remainingItems),
    [remainingItems],
  );
  const completedItems = useMemo(
    () =>
      shoppingList?.items
        .filter((item) => item.checked)
        .sort(sortCompletedShoppingItems) ?? [],
    [shoppingList],
  );
  const recentItems = completedItems;
  const uncheckedCount = remainingItems.length;
  const hasMultipleFamilies = families.length > 1;
  const selectedShoppingListName = formatShoppingListName(shoppingList?.name);
  const isDefaultShoppingList =
    selectedShoppingListName === "Familiehandleliste";
  const catalogSearchResults = useMemo(
    () => searchShoppingCatalog(label),
    [label],
  );
  const isSearchingCatalog = normalizeShoppingSearchValue(label).length >= 2;
  const catalogItemCount = SHOPPING_CATALOG.length;
  const visibleCatalogCategories = useMemo(
    () =>
      SHOPPING_CATEGORIES.map((categoryOption) => ({
        ...categoryOption,
        items: getShoppingCatalogItemsByCategory(categoryOption.slug).slice(
          0,
          8,
        ),
      })).filter((categoryOption) => categoryOption.items.length > 0),
    [catalogItemCount],
  );

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

    if (
      !editingItemId &&
      isShoppingLabelInList(nextLabel, shoppingList?.items ?? [])
    ) {
      setMessage("Varen ligger allerede i handlelisten.");
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
      handleActionError(
        error,
        editingItemId
          ? "Kunne ikke lagre varen. Prøv igjen."
          : "Kunne ikke legge til varen. Prøv igjen.",
      );
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

  async function addItemFromCatalog(item: ShoppingCatalogItem) {
    if (
      !activeFamilyId ||
      isAdding ||
      isCatalogItemInList(item, shoppingList?.items ?? [])
    ) {
      return;
    }

    setIsAdding(true);
    setMessage("");

    try {
      const addedItem = await addShoppingItem(activeFamilyId, {
        label: item.name,
        quantity: String(item.suggestedQuantity),
        unit: item.defaultUnit,
        category: item.categorySlug,
      });
      setShoppingList((currentList) =>
        currentList
          ? {
              ...currentList,
              items: [...currentList.items, addedItem].sort(sortShoppingItems),
            }
          : currentList,
      );
      setLabel("");
      setStatus("ready");
    } catch (error) {
      handleActionError(error, "Kunne ikke legge til varen. Prøv igjen.");
    } finally {
      setIsAdding(false);
    }
  }

  function prepareCustomItem() {
    const nextLabel = label.trim();
    if (!nextLabel) {
      return;
    }

    setEditingItemId(null);
    setQuantity("");
    setUnit("");
    setNote("");
    setCategory("egne-varer");
    setIsNewSheetOpen(true);
  }

  function toggleCatalogCategory(categorySlug: string) {
    setOpenCatalogCategories((currentCategories) => ({
      ...currentCategories,
      [categorySlug]: !(currentCategories[categorySlug] ?? true),
    }));
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
    <AppShell title="Handleliste">
      <PageContainer>
        <section
          className="shopping-page shopping-page--mobile"
          aria-label="Handleliste"
        >
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

          <div className="shopping-list-toolbar" aria-label="Handlelistevalg">
            <button
              className="shopping-list-selector"
              type="button"
              aria-expanded={isListSheetOpen}
              aria-haspopup="dialog"
              aria-label="Velg handleliste"
              onClick={() => setIsListSheetOpen(true)}
            >
              <span>{selectedShoppingListName}</span>
              <ChevronDown aria-hidden="true" size={18} strokeWidth={2.5} />
            </button>
            {!isDefaultShoppingList ? (
              <button className="husk-filter-button" type="button">
                <Share2 aria-hidden="true" size={20} strokeWidth={2.4} />
                <span>Del</span>
              </button>
            ) : null}
          </div>

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
                  title="Handleliste"
                />
                {remainingItems.length === 0 ? (
                  <Card className="shopping-empty-card" tone="default">
                    <EmptyState
                      title="Ingenting å handle akkurat nå"
                      description="Skriv i søkefeltet eller trykk Ny når familien trenger noe."
                    />
                  </Card>
                ) : (
                  <div className="shopping-category-groups">
                    {groupedRemainingItems.map((group) => (
                      <div className="shopping-category-group" key={group.slug}>
                        <h3 className="shopping-category-group__title">
                          {group.name}
                        </h3>
                        <ul
                          className="shopping-list shopping-list--cards"
                          aria-label={group.name}
                        >
                          {group.items.map((item) => (
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
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="shopping-section shopping-catalog-section"
                aria-labelledby="shopping-catalog-title"
              >
                <div className="shopping-catalog-section__header">
                  <h2
                    id="shopping-catalog-title"
                    className="section-header__title"
                  >
                    Legg varer i handleliste
                  </h2>
                  <label
                    className="husk-search shopping-search"
                    htmlFor="shopping-search-input"
                  >
                    <span className="sr-only">Søk i varekatalog</span>
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
                </div>
                {recentItems.length > 0 ? (
                  <CollapsibleShoppingSection
                    badgeCount={recentItems.length}
                    controlsId="recent-shopping-list"
                    isOpen={isRecentItemsOpen}
                    title="Nylige varer"
                    tone="success"
                    onToggle={() => setIsRecentItemsOpen((isOpen) => !isOpen)}
                  >
                    <ul
                      id="recent-shopping-list"
                      className="shopping-list shopping-list--cards"
                      aria-label="Nylige varer"
                    >
                      {recentItems.map((item) => (
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
                  </CollapsibleShoppingSection>
                ) : null}
                {isSearchingCatalog ? (
                  <CatalogItemGrid
                    items={catalogSearchResults}
                    shoppingItems={shoppingList.items}
                    onAddItem={addItemFromCatalog}
                  />
                ) : (
                  <div className="shopping-catalog-categories">
                    {visibleCatalogCategories.map((categoryOption) => {
                      const isCategoryOpen =
                        openCatalogCategories[categoryOption.slug] ?? true;

                      return (
                        <CollapsibleShoppingSection
                          badgeCount={categoryOption.items.length}
                          controlsId={`shopping-catalog-category-${categoryOption.slug}`}
                          isOpen={isCategoryOpen}
                          key={categoryOption.slug}
                          title={categoryOption.name}
                          onToggle={() =>
                            toggleCatalogCategory(categoryOption.slug)
                          }
                        >
                          <div
                            id={`shopping-catalog-category-${categoryOption.slug}`}
                          >
                            <CatalogItemGrid
                              items={categoryOption.items}
                              shoppingItems={shoppingList.items}
                              onAddItem={addItemFromCatalog}
                            />
                          </div>
                        </CollapsibleShoppingSection>
                      );
                    })}
                  </div>
                )}
                {isSearchingCatalog && catalogSearchResults.length === 0 ? (
                  <button
                    className="shopping-custom-item-button"
                    type="button"
                    onClick={prepareCustomItem}
                  >
                    Legg til «{label.trim()}» som egen vare
                  </button>
                ) : null}
              </section>
            </>
          ) : null}
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
                <h2
                  id="shopping-item-sheet-title"
                  className="calendar-filter-sheet__title"
                >
                  {editingItemId ? "Rediger vare" : "Ny vare"}
                </h2>
              </div>
              <button
                className="calendar-filter-sheet__close"
                type="button"
                aria-label="Lukk"
                onClick={handleCloseItemSheet}
              >
                <X aria-hidden="true" size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="calendar-filter-sheet__content shopping-edit-sheet__content">
              <label className="husk-school-field">
                <span>Navn</span>
                <input
                  maxLength={120}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Jeg trenger ..."
                  value={label}
                />
              </label>
              <div className="shopping-edit-sheet__grid">
                <label className="husk-school-field">
                  <span>Antall</span>
                  <input
                    maxLength={60}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="2"
                    value={quantity}
                  />
                </label>
                <label className="husk-school-field">
                  <span>Enhet</span>
                  <input
                    maxLength={40}
                    onChange={(event) => setUnit(event.target.value)}
                    placeholder="liter"
                    value={unit}
                  />
                </label>
              </div>
              <label className="husk-school-field">
                <span>Notat</span>
                <textarea
                  maxLength={240}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="F.eks. merke eller tilbud"
                  value={note}
                />
              </label>
              <label className="husk-school-field">
                <span>Kategori</span>
                <input
                  maxLength={60}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Frukt og grønt"
                  value={category}
                />
              </label>
            </div>
            <div className="calendar-filter-sheet__actions">
              <button
                className="calendar-filter-sheet__action calendar-filter-sheet__action--secondary"
                type="button"
                onClick={handleCloseItemSheet}
              >
                Avbryt
              </button>
              <button
                className="calendar-filter-sheet__action calendar-filter-sheet__action--primary"
                disabled={isAdding || label.trim().length === 0}
                type="submit"
              >
                {isAdding ? "Lagrer …" : "Lagre"}
              </button>
            </div>
          </form>
        </HuskMobileSheet>

        <HuskMobileSheet
          isOpen={isListSheetOpen}
          labelledBy="shopping-list-sheet-title"
          onClose={() => setIsListSheetOpen(false)}
        >
          <div className="shopping-sheet shopping-list-sheet">
            <div className="calendar-filter-sheet__header">
              <div>
                <p className="husk-school-sheet__eyebrow">Handleliste</p>
                <h2
                  id="shopping-list-sheet-title"
                  className="calendar-filter-sheet__title"
                >
                  Velg handleliste
                </h2>
              </div>
              <button
                className="calendar-filter-sheet__close"
                type="button"
                aria-label="Lukk"
                onClick={() => setIsListSheetOpen(false)}
              >
                <X aria-hidden="true" size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="calendar-filter-sheet__content shopping-list-sheet__content">
              <button
                className="shopping-list-sheet__option shopping-list-sheet__option--selected"
                type="button"
                onClick={() => setIsListSheetOpen(false)}
              >
                <span>
                  <strong>Familiehandleliste</strong>
                  <small>Standardlisten for familien</small>
                </span>
                <Check aria-hidden="true" size={20} strokeWidth={2.6} />
              </button>
            </div>
            <div className="calendar-filter-sheet__actions">
              <button
                className="calendar-filter-sheet__action calendar-filter-sheet__action--primary shopping-list-sheet__add"
                type="button"
              >
                <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
                Legg til ny handleliste
              </button>
            </div>
          </div>
        </HuskMobileSheet>
      </PageContainer>
    </AppShell>
  );
}

type ShoppingItem = ShoppingList["items"][number];

function formatShoppingListName(name?: string | null) {
  if (!name || name === "Family Shopping") {
    return "Familiehandleliste";
  }

  return name;
}

function CollapsibleShoppingSection({
  badgeCount,
  children,
  controlsId,
  isOpen,
  onToggle,
  title,
  tone = "neutral",
}: {
  badgeCount?: number;
  children: ReactNode;
  controlsId: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  tone?: "neutral" | "success";
}) {
  return (
    <section className="shopping-collapsible-section">
      <button
        className={`shopping-collapsible-toggle shopping-collapsible-toggle--${tone}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={controlsId}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span className="shopping-collapsible-toggle__meta">
          {typeof badgeCount === "number" ? (
            <Badge tone={tone}>{badgeCount}</Badge>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={
              isOpen
                ? "shopping-collapsible-toggle__icon shopping-collapsible-toggle__icon--open"
                : "shopping-collapsible-toggle__icon"
            }
            size={18}
            strokeWidth={2.5}
          />
        </span>
      </button>
      {isOpen ? children : null}
    </section>
  );
}

function CatalogItemGrid({
  items,
  onAddItem,
  shoppingItems,
}: {
  items: ShoppingCatalogItem[];
  onAddItem: (item: ShoppingCatalogItem) => void;
  shoppingItems: ShoppingItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="shopping-catalog-grid">
      {items.map((item) => {
        const alreadyAdded = isCatalogItemInList(item, shoppingItems);
        return (
          <button
            className="shopping-catalog-item"
            disabled={alreadyAdded}
            key={`${item.categorySlug}-${item.name}`}
            type="button"
            onClick={() => onAddItem(item)}
          >
            <span className="shopping-catalog-item__name">{item.name}</span>
            <span className="shopping-catalog-item__meta">
              {item.suggestedQuantity} {item.defaultUnit}
              {alreadyAdded ? " · I listen" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function isCatalogItemInList(
  catalogItem: ShoppingCatalogItem,
  shoppingItems: ShoppingItem[],
) {
  const itemValues = [catalogItem.name, ...catalogItem.aliases].map(
    normalizeShoppingSearchValue,
  );

  return shoppingItems.some((shoppingItem) =>
    itemValues.includes(normalizeShoppingSearchValue(shoppingItem.label)),
  );
}

function isShoppingLabelInList(label: string, shoppingItems: ShoppingItem[]) {
  const normalizedLabel = normalizeShoppingSearchValue(label);
  const catalogItem = searchShoppingCatalog(label).find((item) =>
    [item.name, ...item.aliases]
      .map(normalizeShoppingSearchValue)
      .includes(normalizedLabel),
  );

  if (catalogItem) {
    return isCatalogItemInList(catalogItem, shoppingItems);
  }

  return shoppingItems.some(
    (shoppingItem) =>
      normalizeShoppingSearchValue(shoppingItem.label) === normalizedLabel,
  );
}

function getShoppingItemCategory(item: ShoppingItem) {
  if (!item.category) {
    return { name: "Andre varer", slug: "andre-varer", sortOrder: 999 };
  }

  if (item.category === "egne-varer") {
    return { name: "Egne varer", slug: "egne-varer", sortOrder: 998 };
  }

  return (
    getShoppingCategoryBySlug(item.category) ?? {
      name: item.category,
      slug: normalizeShoppingSearchValue(item.category).replace(/ /g, "-"),
      sortOrder: 997,
    }
  );
}

function groupShoppingItemsByCategory(items: ShoppingItem[]) {
  const groups = new Map<
    string,
    { items: ShoppingItem[]; name: string; slug: string; sortOrder: number }
  >();

  for (const item of items) {
    const category = getShoppingItemCategory(item);
    const existingGroup = groups.get(category.slug);

    if (existingGroup) {
      existingGroup.items.push(item);
    } else {
      groups.set(category.slug, { ...category, items: [item] });
    }
  }

  return [...groups.values()].sort((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }

    return first.name.localeCompare(second.name, "nb-NO");
  });
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
  item: ShoppingItem;
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
            <span className="shopping-list__quantity">
              {formatShoppingItemMeta(item)}
            </span>
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

function formatShoppingItemMeta(item: ShoppingItem) {
  return [
    item.quantity,
    item.unit,
    item.category ? getShoppingItemCategory(item).name : null,
    item.note,
  ]
    .filter(Boolean)
    .join(" · ");
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

function sortCompletedShoppingItems(first: ShoppingItem, second: ShoppingItem) {
  return (
    new Date(second.checkedAt ?? second.updatedAt).getTime() -
    new Date(first.checkedAt ?? first.updatedAt).getTime()
  );
}

function sortShoppingItems(first: ShoppingItem, second: ShoppingItem) {
  if (first.checked !== second.checked) {
    return first.checked ? 1 : -1;
  }

  return (
    new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
  );
}
