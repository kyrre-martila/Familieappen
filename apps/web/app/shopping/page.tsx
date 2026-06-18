"use client";

import {
  FormEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
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
  ShoppingCatalogCategory,
  ShoppingCatalogItem,
  ShoppingList,
  addShoppingItem,
  createShoppingList,
  deleteFamilyCustomShoppingItem,
  deleteShoppingItem,
  getShoppingCatalogCategories,
  getShoppingCatalogItems,
  getShoppingList,
  getShoppingLists,
  inviteToShoppingList,
  leaveShoppingList,
  removeShoppingListCollaborator,
  revokeShoppingListInvitation,
  toggleShoppingItem,
  searchShoppingCatalogItems,
  updateFamilyCustomShoppingItem,
  updateShoppingItem,
} from "../../lib/api";
import {
  chooseActiveFamily,
  getUserFacingApiMessage,
  handleMissingOrInvalidAuth,
} from "../../lib/auth-family";
import { clearActiveFamilyId } from "../../lib/session";
import { normalizeShoppingSearchValue } from "@familieappen/shared";

type ShoppingStatus =
  | "loading"
  | "ready"
  | "pending"
  | "unauthorized"
  | "no-family"
  | "error";

const DEFAULT_SHOPPING_UNIT = "stk";
const DEFAULT_CUSTOM_CATEGORY_SLUG = "egne-varer";
const SHOPPING_UNIT_OPTIONS = ["stk", "pk", "kg", "g", "l", "dl", "cl", "ml", "boks", "pose", "flaske", "beger", "glass", "tube"];
const FALLBACK_SHOPPING_CATEGORIES: ShoppingCatalogCategory[] = [
  { id: "fallback-frukt-og-gront", name: "Frukt og grønt", slug: "frukt-og-gront", sortOrder: 10, totalItemCount: 0 },
  { id: "fallback-brod-og-bakevarer", name: "Brød og bakevarer", slug: "brod-og-bakevarer", sortOrder: 20, totalItemCount: 0 },
  { id: "fallback-kjott-og-fisk", name: "Kjøtt og fisk", slug: "kjott-og-fisk", sortOrder: 30, totalItemCount: 0 },
  { id: "fallback-meieri", name: "Meieri", slug: "meieri", sortOrder: 40, totalItemCount: 0 },
  { id: "fallback-drikke", name: "Drikke", slug: "drikke", sortOrder: 50, totalItemCount: 0 },
  { id: "fallback-frysevarer", name: "Frysevarer", slug: "frysevarer", sortOrder: 60, totalItemCount: 0 },
  { id: "fallback-snacks", name: "Snacks", slug: "snacks", sortOrder: 70, totalItemCount: 0 },
  { id: "fallback-hygiene", name: "Hygiene", slug: "hygiene", sortOrder: 80, totalItemCount: 0 },
  { id: "fallback-vask-og-rengjoring", name: "Vask og rengjøring", slug: "vask-og-rengjoring", sortOrder: 90, totalItemCount: 0 },
  { id: "fallback-dyremat", name: "Dyremat", slug: "dyremat", sortOrder: 100, totalItemCount: 0 },
  { id: "fallback-egne-varer", name: "Egne varer", slug: DEFAULT_CUSTOM_CATEGORY_SLUG, sortOrder: 999, totalItemCount: 0 },
];

export default function ShoppingPage() {
  const router = useRouter();
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<ShoppingStatus>("loading");
  const [message, setMessage] = useState("Laster handleliste …");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("stk");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("egne-varer");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [isListSheetOpen, setIsListSheetOpen] = useState(false);
  const [isCreateListSheetOpen, setIsCreateListSheetOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [createListError, setCreateListError] = useState("");
  const [activeShoppingListId, setActiveShoppingListId] = useState<string | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [sharePendingId, setSharePendingId] = useState<string | null>(null);
  const [isRecentItemsOpen, setIsRecentItemsOpen] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<ShoppingCatalogCategory[]>([]);
  const [catalogItems, setCatalogItems] = useState<ShoppingCatalogItem[]>([]);
  const [catalogSearchResults, setCatalogSearchResults] = useState<ShoppingCatalogItem[]>([]);
  const [openCatalogCategories, setOpenCatalogCategories] = useState<Record<string, boolean>>({});
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [itemSheetError, setItemSheetError] = useState("");
  const currentSaveAttemptRef = useRef(0);

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
    () => groupShoppingItemsByCategory(remainingItems, catalogCategories),
    [catalogCategories, remainingItems],
  );
  const completedItems = useMemo(
    () =>
      shoppingList?.items
        .filter((item) => item.checked)
        .sort(sortCompletedShoppingItems) ?? [],
    [shoppingList],
  );
  const recentItems = useMemo(
    () => getRecentShoppingCatalogItems(completedItems, catalogItems),
    [catalogItems, completedItems],
  );
  const uncheckedCount = remainingItems.length;
  const hasMultipleFamilies = families.length > 1;
  const selectedShoppingListName = formatShoppingListName(shoppingList?.name);
  const isDefaultShoppingList = shoppingList?.isDefault ?? selectedShoppingListName === "Familiehandleliste";
  const isSearchingCatalog = normalizeShoppingSearchValue(label).length >= 2;
  const visibleCatalogCategories = useMemo(
    () =>
      catalogCategories
        .map((categoryOption) => ({
          ...categoryOption,
          items: openCatalogCategories[categoryOption.slug]
            ? catalogItems.filter((item) => item.categorySlug === categoryOption.slug)
            : [],
        }))
        .filter((categoryOption) => categoryOption.slug === DEFAULT_CUSTOM_CATEGORY_SLUG || categoryOption.totalItemCount > 0),
    [catalogCategories, catalogItems, openCatalogCategories],
  );

  useEffect(() => {
    let isCancelled = false;

    if (!isSearchingCatalog) {
      setCatalogSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void searchShoppingCatalogItems(label, activeFamilyId ?? undefined).then((items) => {
        if (!isCancelled) {
          setCatalogSearchResults(items);
        }
      }).catch(() => {
        if (!isCancelled) {
          setCatalogSearchResults([]);
        }
      });
    }, 150);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeFamilyId, isSearchingCatalog, label]);

  async function loadShoppingList(familyId = activeFamilyId, listId = activeShoppingListId ?? undefined) {
    if (!familyId) {
      setStatus("no-family");
      setMessage("Velg familie før du åpner handlelisten.");
      return;
    }

    setStatus("loading");
    setMessage("Laster handleliste …");

    try {
      const [nextShoppingLists, nextShoppingList, nextCatalogCategories, nextCatalogItems] = await Promise.all([
        getShoppingLists(familyId),
        getShoppingList(familyId, listId),
        getShoppingCatalogCategories(familyId),
        getShoppingCatalogItems(familyId),
      ]);
      setShoppingLists(nextShoppingLists);
      setShoppingList(dedupeShoppingListItems(nextShoppingList));
      setActiveShoppingListId(nextShoppingList.id);
      setCatalogCategories(getCategoryOptions(nextCatalogCategories.length > 0 ? nextCatalogCategories : FALLBACK_SHOPPING_CATEGORIES));
      setCatalogItems(nextCatalogItems);
      setOpenCatalogCategories((currentCategories) => ({
        ...Object.fromEntries((nextCatalogCategories.length > 0 ? nextCatalogCategories : FALLBACK_SHOPPING_CATEGORIES).map((categoryOption) => [categoryOption.slug, false])),
        ...currentCategories,
      }));
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

  async function refreshShoppingData(familyId = activeFamilyId, listId = activeShoppingListId ?? undefined) {
    if (!familyId) return;
    const [nextShoppingList, nextCatalogCategories, nextCatalogItems] = await Promise.all([
      getShoppingList(familyId, listId),
      getShoppingCatalogCategories(familyId),
      getShoppingCatalogItems(familyId),
    ]);
    const categories = getCategoryOptions(nextCatalogCategories.length > 0 ? nextCatalogCategories : FALLBACK_SHOPPING_CATEGORIES);
    setShoppingList(dedupeShoppingListItems(nextShoppingList));
    setActiveShoppingListId(nextShoppingList.id);
    setCatalogCategories(categories);
    setCatalogItems(nextCatalogItems);
    if (normalizeShoppingSearchValue(label).length >= 2) {
      setCatalogSearchResults(await searchShoppingCatalogItems(label, familyId));
    }
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextLabel = label.trim();
    const nextQuantity = quantity.trim();
    const nextUnit = unit.trim() || DEFAULT_SHOPPING_UNIT;
    const nextNote = note.trim();
    const nextCategory = getShoppingCategorySubmissionValue(category, catalogCategories);
    const saveAttempt = currentSaveAttemptRef.current + 1;
    currentSaveAttemptRef.current = saveAttempt;
    setItemSheetError("");

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
        ...(!editingItemId ? { createCustom: true } : {}),
      };
      const customEditId = editingItemId?.startsWith("custom:") ? editingItemId.slice("custom:".length) : null;
      const item: ShoppingItem | null = customEditId
        ? null
        : editingItemId
          ? (await updateShoppingItem(activeFamilyId, editingItemId, input, shoppingList?.id)).item
          : (await addShoppingItem(activeFamilyId, input, shoppingList?.id)).item;
      if (customEditId) {
        const updatedCustomItem = await updateFamilyCustomShoppingItem(activeFamilyId, customEditId, { name: nextLabel, defaultUnit: nextUnit, suggestedQuantity: nextQuantity || 1, categorySlug: nextCategory });
        setCatalogItems((items) => items.map((catalogItem) => catalogItem.id === updatedCustomItem.id ? updatedCustomItem : catalogItem));
        await refreshShoppingData(activeFamilyId, activeShoppingListId ?? shoppingList?.id);
      }
      setShoppingList((currentList) =>
        currentList
          ? {
              ...currentList,
              items: item ? reconcileShoppingListItems(currentList.items, item, Boolean(editingItemId)).sort(sortShoppingItems) : dedupeShoppingItemsById(currentList.items),
            }
          : currentList,
      );
      setLabel("");
      setQuantity("");
      setUnit(DEFAULT_SHOPPING_UNIT);
      setNote("");
      setCategory(DEFAULT_CUSTOM_CATEGORY_SLUG);
      await refreshShoppingData(activeFamilyId, activeShoppingListId ?? shoppingList?.id);
      setIsNewSheetOpen(false);
      setItemSheetError("");
      setEditingItemId(null);
      setStatus("ready");
    } catch (error) {
      if (currentSaveAttemptRef.current === saveAttempt) {
        const fallbackMessage = editingItemId
          ? "Kunne ikke lagre varen. Prøv igjen."
          : "Kunne ikke legge til varen. Prøv igjen.";
        const userMessage = getUserFacingApiMessage(error, fallbackMessage);
        handleActionError(error, fallbackMessage);
        setItemSheetError(userMessage);
      }
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
      const updatedItem = await toggleShoppingItem(activeFamilyId, itemId, shoppingList?.id);
      setShoppingList((currentList) =>
        currentList
          ? {
              ...currentList,
              items: reconcileShoppingListItems(currentList.items, updatedItem, true).sort(sortShoppingItems),
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
      await deleteShoppingItem(activeFamilyId, itemId, shoppingList?.id);
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
    if (!activeFamilyId || isAdding) {
      return;
    }

    const matchingCompletedItem = findMatchingShoppingItem(
      item,
      shoppingList?.items ?? [],
      true,
    );

    if (matchingCompletedItem) {
      await handleToggleItem(matchingCompletedItem.id);
      return;
    }

    if (isCatalogItemInList(item, shoppingList?.items ?? [])) {
      return;
    }

    setIsAdding(true);
    setMessage("");

    try {
      const { item: addedItem } = await addShoppingItem(activeFamilyId, {
        label: item.name,
        quantity: String(item.suggestedQuantity),
        unit: item.defaultUnit,
        category: item.categorySlug,
        ...(item.isCustom ? { customItemId: item.id } : {}),
      }, shoppingList?.id);
      setShoppingList((currentList) =>
        currentList
          ? {
              ...currentList,
              items: reconcileShoppingListItems(currentList.items, addedItem, false).sort(sortShoppingItems),
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
    currentSaveAttemptRef.current += 1;
    const nextLabel = label.trim();
    if (!nextLabel) {
      return;
    }

    setEditingItemId(null);
    setQuantity("");
    setUnit(DEFAULT_SHOPPING_UNIT);
    setNote("");
    setCategory(DEFAULT_CUSTOM_CATEGORY_SLUG);
    setItemSheetError("");
    setIsNewSheetOpen(true);
  }

  function toggleCatalogCategory(categorySlug: string) {
    setOpenCatalogCategories((currentCategories) => ({
      ...currentCategories,
      [categorySlug]: !(currentCategories[categorySlug] ?? false),
    }));
  }

  function handleOpenNewSheet() {
    currentSaveAttemptRef.current += 1;
    setEditingItemId(null);
    setQuantity("");
    setUnit(DEFAULT_SHOPPING_UNIT);
    setNote("");
    setCategory(DEFAULT_CUSTOM_CATEGORY_SLUG);
    setItemSheetError("");
    setIsNewSheetOpen(true);
  }

  function handleEditItem(itemId: string) {
    currentSaveAttemptRef.current += 1;
    const item = shoppingList?.items.find(
      (currentItem) => currentItem.id === itemId,
    );
    if (!item) {
      return;
    }

    setEditingItemId(itemId);
    setLabel(item.label);
    setQuantity(item.quantity ?? "");
    setUnit(item.unit && SHOPPING_UNIT_OPTIONS.includes(item.unit) ? item.unit : DEFAULT_SHOPPING_UNIT);
    setNote(item.note ?? "");
    setCategory(getShoppingCategorySubmissionValue(item.category ?? DEFAULT_CUSTOM_CATEGORY_SLUG, catalogCategories));
    setOpenMenuItemId(null);
    setItemSheetError("");
    setIsNewSheetOpen(true);
  }

  function handleCloseItemSheet() {
    currentSaveAttemptRef.current += 1;
    setIsNewSheetOpen(false);
    setEditingItemId(null);
    setQuantity("");
    setUnit(DEFAULT_SHOPPING_UNIT);
    setNote("");
    setCategory(DEFAULT_CUSTOM_CATEGORY_SLUG);
    setItemSheetError("");
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


  async function handleEditCustomCatalogItem(item: ShoppingCatalogItem) {
    currentSaveAttemptRef.current += 1;
    setEditingItemId(`custom:${item.id}`);
    setLabel(item.name);
    setQuantity(String(item.suggestedQuantity));
    setUnit(item.defaultUnit && SHOPPING_UNIT_OPTIONS.includes(item.defaultUnit) ? item.defaultUnit : DEFAULT_SHOPPING_UNIT);
    setNote("");
    setCategory(getShoppingCategorySubmissionValue(item.categorySlug, catalogCategories));
    setOpenMenuItemId(null);
    setItemSheetError("");
    setIsNewSheetOpen(true);
  }

  async function handleDeleteCustomCatalogItem(itemId: string) {
    if (!activeFamilyId || pendingItemId) return;
    setPendingItemId(itemId);
    setMessage("");
    try {
      await deleteFamilyCustomShoppingItem(activeFamilyId, itemId);
      await refreshShoppingData(activeFamilyId, activeShoppingListId ?? shoppingList?.id);
      setOpenMenuItemId(null);
    } catch (error) {
      handleActionError(error, "Kunne ikke slette egen vare. Prøv igjen.");
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleSelectShoppingList(listId: string) {
    if (!activeFamilyId || listId === shoppingList?.id) {
      setIsListSheetOpen(false);
      return;
    }
    setActiveShoppingListId(listId);
    setIsListSheetOpen(false);
    await loadShoppingList(activeFamilyId, listId);
  }

  async function handleCreateShoppingList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFamilyId || newListName.trim().length === 0) return;
    setCreateListError("");
    try {
      const created = await createShoppingList(activeFamilyId, newListName.trim());
      const nextShoppingLists = await getShoppingLists(activeFamilyId);
      setShoppingLists(nextShoppingLists.some((list) => list.id === created.id) ? nextShoppingLists : [...nextShoppingLists, created]);
      setShoppingList(dedupeShoppingListItems(created));
      setActiveShoppingListId(created.id);
      setNewListName("");
      setIsCreateListSheetOpen(false);
      setStatus("ready");
      setMessage("");
    } catch (error) {
      const errorMessage = getUserFacingApiMessage(error, "Kunne ikke opprette handlelisten. Prøv igjen.");
      setCreateListError(errorMessage);
      setMessage(errorMessage);
      handleActionError(error, "Kunne ikke opprette handlelisten. Prøv igjen.");
    }
  }

  async function handleShareShoppingList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFamilyId || !shoppingList || shoppingList.isDefault || inviteEmail.trim().length === 0 || isSharing) return;
    setIsSharing(true);
    setShareError("");
    try {
      const response = await inviteToShoppingList(activeFamilyId, shoppingList.id, inviteEmail.trim());
      setShoppingList((current) => current ? { ...current, invitations: [response.invitation, ...(current.invitations ?? []).filter((invite) => invite.id !== response.invitation.id)] } : current);
      setShoppingLists((lists) => lists.map((list) => list.id === shoppingList.id ? { ...list, invitations: [response.invitation, ...(list.invitations ?? []).filter((invite) => invite.id !== response.invitation.id)] } : list));
      setInviteEmail("");
      setMessage("Invitasjonen er sendt.");
    } catch (error) {
      const errorMessage = getUserFacingApiMessage(error, "Kunne ikke sende invitasjonen. Prøv igjen.");
      setShareError(errorMessage);
    } finally {
      setIsSharing(false);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!activeFamilyId || !shoppingList || sharePendingId) return;
    setSharePendingId(invitationId);
    setShareError("");
    try {
      const updated = await revokeShoppingListInvitation(activeFamilyId, shoppingList.id, invitationId);
      setShoppingList((current) => current ? { ...current, invitations: (current.invitations ?? []).map((invite) => invite.id === updated.id ? updated : invite) } : current);
      setShoppingLists((lists) => lists.map((list) => list.id === shoppingList.id ? { ...list, invitations: (list.invitations ?? []).map((invite) => invite.id === updated.id ? updated : invite) } : list));
    } catch (error) {
      setShareError(getUserFacingApiMessage(error, "Kunne ikke trekke tilbake invitasjonen."));
    } finally {
      setSharePendingId(null);
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    if (!activeFamilyId || !shoppingList || sharePendingId) return;
    setSharePendingId(userId);
    setShareError("");
    try {
      await removeShoppingListCollaborator(activeFamilyId, shoppingList.id, userId);
      setShoppingList((current) => current ? { ...current, collaborators: (current.collaborators ?? []).filter((collaborator) => collaborator.userId !== userId) } : current);
    } catch (error) {
      setShareError(getUserFacingApiMessage(error, "Kunne ikke fjerne tilgang."));
    } finally {
      setSharePendingId(null);
    }
  }

  async function handleLeaveShoppingList() {
    if (!activeFamilyId || !shoppingList || sharePendingId || shoppingList.ownerUserId === null) return;
    setSharePendingId("me");
    setShareError("");
    try {
      await leaveShoppingList(activeFamilyId, shoppingList.id);
      const lists = await getShoppingLists(activeFamilyId);
      setShoppingLists(lists);
      const nextList = lists[0];
      if (nextList) await loadShoppingList(activeFamilyId, nextList.id);
      setIsShareSheetOpen(false);
    } catch (error) {
      setShareError(getUserFacingApiMessage(error, "Kunne ikke forlate handlelisten."));
    } finally {
      setSharePendingId(null);
    }
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

    const userMessage = getUserFacingApiMessage(error, fallbackMessage);
    setMessage(userMessage);
    if (isNewSheetOpen) setItemSheetError(userMessage);
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
    <AppShell hideTitleRow title="Handleliste">
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
              <button className="husk-filter-button" type="button" onClick={() => setIsShareSheetOpen(true)}>
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
                  title="Aktive varer"
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
                              catalogCategories={catalogCategories}
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
                      onChange={(event) => { setLabel(event.target.value); setItemSheetError(""); currentSaveAttemptRef.current += 1; }}
                      onFocus={() => setMessage("")}
                      placeholder="Jeg trenger ..."
                      value={label}
                    />
                  </label>
                </div>
                {recentItems.length > 0 &&
                !(isSearchingCatalog && catalogSearchResults.length > 0) ? (
                  <CollapsibleShoppingSection
                    badgeCount={recentItems.length}
                    controlsId="recent-shopping-list"
                    isOpen={isRecentItemsOpen}
                    title="Nylige varer"
                    tone="success"
                    onToggle={() => setIsRecentItemsOpen((isOpen) => !isOpen)}
                  >
                    <div id="recent-shopping-list">
                      <RecentItemGrid
                        catalogCategories={catalogCategories}
                        items={recentItems}
                        pendingItemId={pendingItemId}
                        shoppingItems={shoppingList.items}
                        onAddCatalogItem={addItemFromCatalog}
                        onRestoreItem={handleToggleItem}
                      />
                    </div>
                  </CollapsibleShoppingSection>
                ) : null}
                {isSearchingCatalog ? (
                  <CatalogItemGrid
                    items={catalogSearchResults}
                    shoppingItems={shoppingList.items}
                    onAddItem={addItemFromCatalog}
                    openMenuItemId={openMenuItemId}
                    onMenuClick={handleMenuClick}
                    onEditCustomItem={handleEditCustomCatalogItem}
                    onDeleteCustomItem={handleDeleteCustomCatalogItem}
                  />
                ) : (
                  <div className="shopping-catalog-categories">
                    {visibleCatalogCategories.map((categoryOption) => {
                      const isCategoryOpen =
                        openCatalogCategories[categoryOption.slug] ?? false;

                      return (
                        <CollapsibleShoppingSection
                          badgeCount={categoryOption.totalItemCount}
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
                              openMenuItemId={openMenuItemId}
                              onMenuClick={handleMenuClick}
                              onEditCustomItem={handleEditCustomCatalogItem}
                              onDeleteCustomItem={handleDeleteCustomCatalogItem}
                            />
                          </div>
                        </CollapsibleShoppingSection>
                      );
                    })}
                  </div>
                )}
                {isSearchingCatalog ? (
                  <button
                    className="shopping-custom-item-button"
                    type="button"
                    onClick={prepareCustomItem}
                  >
                    Opprett «{label.trim()}» som egen vare
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
              {itemSheetError ? <p className="shopping-create-list-sheet__error" role="alert">{itemSheetError}</p> : null}
              <label className="husk-school-field">
                <span>Navn</span>
                <input
                  maxLength={120}
                  onChange={(event) => { setLabel(event.target.value); setItemSheetError(""); currentSaveAttemptRef.current += 1; }}
                  placeholder="Jeg trenger ..."
                  value={label}
                />
              </label>
              <div className="shopping-edit-sheet__grid">
                <label className="husk-school-field">
                  <span>Antall</span>
                  <input
                    maxLength={60}
                    onChange={(event) => { setQuantity(event.target.value); setItemSheetError(""); currentSaveAttemptRef.current += 1; }}
                    placeholder="2"
                    value={quantity}
                  />
                </label>
                <label className="husk-school-field">
                  <span>Enhet</span>
                  <select onChange={(event) => { setUnit(event.target.value); setItemSheetError(""); currentSaveAttemptRef.current += 1; }} value={unit}>
                    {SHOPPING_UNIT_OPTIONS.map((unitOption) => <option key={unitOption} value={unitOption}>{unitOption}</option>)}
                  </select>
                </label>
              </div>
              <label className="husk-school-field">
                <span>Notat</span>
                <textarea
                  maxLength={240}
                  onChange={(event) => { setNote(event.target.value); setItemSheetError(""); currentSaveAttemptRef.current += 1; }}
                  placeholder="F.eks. merke eller tilbud"
                  value={note}
                />
              </label>
              <label className="husk-school-field">
                <span>Kategori</span>
                <select onChange={(event) => { setCategory(event.target.value); setItemSheetError(""); currentSaveAttemptRef.current += 1; }} value={category}>
                  {getCategoryOptions(catalogCategories).map((categoryOption) => <option key={categoryOption.slug} value={categoryOption.slug}>{categoryOption.name}</option>)}
                </select>
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
              {shoppingLists.map((list) => (
                <button
                  className={`shopping-list-sheet__option${list.id === shoppingList?.id ? " shopping-list-sheet__option--selected" : ""}`}
                  key={list.id}
                  type="button"
                  onClick={() => handleSelectShoppingList(list.id)}
                >
                  <span>
                    <strong>{formatShoppingListName(list.name)}</strong>
                    <small>{list.isDefault ? "Standardlisten for familien" : "Delt handleliste"}</small>
                  </span>
                  {list.id === shoppingList?.id ? <Check aria-hidden="true" size={20} strokeWidth={2.6} /> : null}
                </button>
              ))}
            </div>
            <div className="calendar-filter-sheet__actions">
              <button
                className="calendar-filter-sheet__action calendar-filter-sheet__action--primary shopping-list-sheet__add"
                type="button"
                onClick={() => {
                  setIsListSheetOpen(false);
                  setIsCreateListSheetOpen(true);
                }}
              >
                <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
                Legg til ny handleliste
              </button>
            </div>
          </div>
        </HuskMobileSheet>

        <HuskMobileSheet
          isOpen={isCreateListSheetOpen}
          labelledBy="shopping-create-list-sheet-title"
          onClose={() => {
            setIsCreateListSheetOpen(false);
            setCreateListError("");
          }}
        >
          <form className="shopping-sheet shopping-create-list-sheet" onSubmit={handleCreateShoppingList}>
            <div className="calendar-filter-sheet__header">
              <div>
                <p className="husk-school-sheet__eyebrow">Handleliste</p>
                <h2
                  id="shopping-create-list-sheet-title"
                  className="calendar-filter-sheet__title"
                >
                  Ny handleliste
                </h2>
              </div>
              <button
                className="calendar-filter-sheet__close"
                type="button"
                aria-label="Lukk"
                onClick={() => {
                  setIsCreateListSheetOpen(false);
                  setCreateListError("");
                }}
              >
                <X aria-hidden="true" size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="calendar-filter-sheet__content shopping-create-list-sheet__content">
              <label className="husk-school-field">
                <span>Navn på handleliste</span>
                <input
                  maxLength={80}
                  onChange={(event) => {
                    setNewListName(event.target.value);
                    setCreateListError("");
                  }}
                  placeholder="F.eks. Helgehandel"
                  value={newListName}
                />
              </label>
              <p className="shopping-create-list-sheet__notice">Listen opprettes som en egen handleliste du kan dele.</p>
              {createListError ? (
                <p className="shopping-create-list-sheet__error" role="alert">
                  {createListError}
                </p>
              ) : null}
            </div>
            <div className="calendar-filter-sheet__actions">
              <button
                className="calendar-filter-sheet__action calendar-filter-sheet__action--secondary"
                type="button"
                onClick={() => setIsCreateListSheetOpen(false)}
              >
                Avbryt
              </button>
              <button
                className="calendar-filter-sheet__action calendar-filter-sheet__action--primary"
                disabled={newListName.trim().length === 0}
                type="submit"
              >
                Opprett handleliste
              </button>
            </div>
          </form>
        </HuskMobileSheet>

        <HuskMobileSheet
          isOpen={isShareSheetOpen}
          labelledBy="shopping-share-sheet-title"
          onClose={() => setIsShareSheetOpen(false)}
        >
          <form className="shopping-sheet shopping-create-list-sheet" onSubmit={handleShareShoppingList}>
            <div className="calendar-filter-sheet__header">
              <div>
                <p className="husk-school-sheet__eyebrow">Del handleliste</p>
                <h2 id="shopping-share-sheet-title" className="calendar-filter-sheet__title">Inviter på e-post</h2>
              </div>
              <button className="calendar-filter-sheet__close" type="button" aria-label="Lukk" onClick={() => setIsShareSheetOpen(false)}><X aria-hidden="true" size={18} strokeWidth={2.5} /></button>
            </div>
            <div className="calendar-filter-sheet__content shopping-create-list-sheet__content">
              <label className="husk-school-field">
                <span>E-postadresse</span>
                <input maxLength={160} onChange={(event) => { setInviteEmail(event.target.value); setShareError(""); }} placeholder="navn@eksempel.no" type="email" value={inviteEmail} />
              </label>
              {shareError ? <p className="shopping-create-list-sheet__error" role="alert">{shareError}</p> : null}
              {(shoppingList?.invitations ?? []).length > 0 ? (
                <div className="shopping-create-list-sheet__notice">
                  {(shoppingList?.invitations ?? []).map((invite) => (
                    <p key={invite.id}>{invite.invitedEmail}: {invite.status === "accepted" ? "Akseptert" : invite.status === "pending" ? "Venter" : invite.status} {invite.status === "pending" ? <button type="button" onClick={() => handleRevokeInvitation(invite.id)} disabled={sharePendingId === invite.id}>Trekk tilbake</button> : null}</p>
                  ))}
                </div>
              ) : null}
              {(shoppingList?.collaborators ?? []).length > 0 ? <div className="shopping-create-list-sheet__notice">{(shoppingList?.collaborators ?? []).map((collaborator) => <p key={collaborator.id}>{collaborator.name ?? collaborator.email}: <button type="button" onClick={() => handleRemoveCollaborator(collaborator.userId)} disabled={sharePendingId === collaborator.userId}>Fjern tilgang</button></p>)}</div> : null}
              {shoppingList && !shoppingList.isDefault && shoppingList.ownerUserId ? <button className="calendar-filter-sheet__action calendar-filter-sheet__action--secondary" type="button" onClick={handleLeaveShoppingList} disabled={sharePendingId === "me"}>Forlat delt liste</button> : null}
            </div>
            <div className="calendar-filter-sheet__actions">
              <button className="calendar-filter-sheet__action calendar-filter-sheet__action--secondary" type="button" onClick={() => setIsShareSheetOpen(false)}>Lukk</button>
              <button className="calendar-filter-sheet__action calendar-filter-sheet__action--primary" disabled={isSharing || inviteEmail.trim().length === 0} type="submit">{isSharing ? "Sender …" : "Send invitasjon"}</button>
            </div>
          </form>
        </HuskMobileSheet>
      </PageContainer>
    </AppShell>
  );
}

type ShoppingItem = ShoppingList["items"][number];


function dedupeShoppingListItems<T extends ShoppingList | null>(list: T): T {
  if (!list) return list;
  return { ...list, items: dedupeShoppingItemsById(list.items) } as T;
}

function dedupeShoppingItemsById(items: ShoppingItem[]) {
  const byId = new Map<string, ShoppingItem>();

  for (const item of items) {
    byId.set(item.id, item);
  }

  return [...byId.values()];
}

function reconcileShoppingListItems(items: ShoppingItem[], nextItem: ShoppingItem, replaceOnly: boolean) {
  let didReplace = false;
  const nextItems = dedupeShoppingItemsById(items).map((item) => {
    if (item.id !== nextItem.id) {
      return item;
    }

    didReplace = true;
    return nextItem;
  });

  if (!didReplace && !replaceOnly) {
    nextItems.push(nextItem);
  }

  return nextItems;
}

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

function RecentItemGrid({
  catalogCategories,
  items,
  onAddCatalogItem,
  onRestoreItem,
  pendingItemId,
  shoppingItems,
}: {
  catalogCategories: ShoppingCatalogCategory[];
  items: ShoppingCatalogItem[];
  onAddCatalogItem: (item: ShoppingCatalogItem) => void;
  onRestoreItem: (itemId: string) => void;
  pendingItemId: string | null;
  shoppingItems: ShoppingItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="shopping-catalog-grid">
      {items.map((item) => {
        const activeItem = findMatchingShoppingItem(item, shoppingItems, false);
        const completedItem = findMatchingShoppingItem(item, shoppingItems, true);
        const isBusy = completedItem ? pendingItemId === completedItem.id : false;
        return (
          <button
            className="shopping-catalog-item"
            disabled={Boolean(activeItem) || isBusy}
            key={`recent-${item.categorySlug}-${item.name}`}
            type="button"
            onClick={() => completedItem ? onRestoreItem(completedItem.id) : onAddCatalogItem(item)}
          >
            <span className="shopping-catalog-item__name">{item.name}</span>
            <span className="shopping-catalog-item__meta">
              {item.suggestedQuantity} {item.defaultUnit} · {getShoppingCategoryName(item.categorySlug, catalogCategories)}
              {activeItem ? " · I listen" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CatalogItemGrid({
  items,
  onAddItem,
  onDeleteCustomItem,
  onEditCustomItem,
  onMenuClick,
  openMenuItemId,
  shoppingItems,
}: {
  items: ShoppingCatalogItem[];
  onAddItem: (item: ShoppingCatalogItem) => void;
  onDeleteCustomItem: (itemId: string) => void;
  onEditCustomItem: (item: ShoppingCatalogItem) => void;
  onMenuClick: (event: MouseEvent<HTMLButtonElement>, itemId: string) => void;
  openMenuItemId: string | null;
  shoppingItems: ShoppingItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="shopping-catalog-grid">
      {items.map((item) => {
        const alreadyAdded = isCatalogItemInList(item, shoppingItems);
        return (
          <div className={item.isCustom ? "shopping-catalog-item-shell shopping-catalog-item-shell--custom" : "shopping-catalog-item-shell"} key={`${item.categorySlug}-${item.name}`}>
            <button
              className="shopping-catalog-item"
              disabled={alreadyAdded}
              type="button"
              onClick={() => onAddItem(item)}
            >
              <span className="shopping-catalog-item__name">{item.name}</span>
              <span className="shopping-catalog-item__meta">
                {item.suggestedQuantity} {item.defaultUnit}
                {alreadyAdded ? " · I listen" : ""}
              </span>
            </button>
            {item.isCustom ? (
              <div className="shopping-catalog-item__menu-wrap">
                <button className="shopping-item-card__menu-button" type="button" aria-label={`Meny for ${item.name}`} onClick={(event) => onMenuClick(event, item.id)}>
                  <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.5} />
                </button>
                {openMenuItemId === item.id ? (
                  <div className="shopping-item-card__menu-popover">
                    <button type="button" onClick={() => onEditCustomItem(item)}>Rediger</button>
                    <button type="button" onClick={() => onDeleteCustomItem(item.id)}>Slett</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function isCatalogItemInList(
  catalogItem: ShoppingCatalogItem,
  shoppingItems: ShoppingItem[],
) {
  return Boolean(findMatchingShoppingItem(catalogItem, shoppingItems, false));
}

function findMatchingShoppingItem(
  catalogItem: ShoppingCatalogItem,
  shoppingItems: ShoppingItem[],
  checked: boolean,
) {
  if (catalogItem.isCustom) {
    return shoppingItems.find(
      (shoppingItem) =>
        shoppingItem.checked === checked &&
        shoppingItem.familyCustomShoppingItemId === catalogItem.id,
    );
  }

  const itemValues = [catalogItem.name, ...catalogItem.aliases].map(
    normalizeShoppingSearchValue,
  );

  return shoppingItems.find(
    (shoppingItem) =>
      shoppingItem.checked === checked &&
      itemValues.includes(normalizeShoppingSearchValue(shoppingItem.label)),
  );
}

function getCatalogItemForShoppingItem(
  shoppingItem: ShoppingItem,
  catalogItems: ShoppingCatalogItem[],
) {
  if (shoppingItem.familyCustomShoppingItemId) {
    const customCatalogItem = catalogItems.find(
      (catalogItem) => catalogItem.id === shoppingItem.familyCustomShoppingItemId,
    );

    if (customCatalogItem) {
      return customCatalogItem;
    }
  }

  const normalizedLabel = normalizeShoppingSearchValue(shoppingItem.label);

  return catalogItems.find((catalogItem) =>
    [catalogItem.name, ...catalogItem.aliases]
      .map(normalizeShoppingSearchValue)
      .includes(normalizedLabel),
  );
}

function getRecentShoppingCatalogItems(
  shoppingItems: ShoppingItem[],
  catalogItems: ShoppingCatalogItem[],
) {
  const recentItems = new Map<string, ShoppingCatalogItem>();

  for (const shoppingItem of shoppingItems) {
    const catalogItem = getCatalogItemForShoppingItem(shoppingItem, catalogItems);

    if (!catalogItem) {
      continue;
    }

    const itemKey = normalizeShoppingSearchValue(catalogItem.name);

    if (!recentItems.has(itemKey)) {
      recentItems.set(itemKey, catalogItem);
    }

    if (recentItems.size === 20) {
      break;
    }
  }

  return [...recentItems.values()];
}

function isShoppingLabelInList(
  label: string,
  shoppingItems: ShoppingItem[],
  catalogItems: ShoppingCatalogItem[],
) {
  const normalizedLabel = normalizeShoppingSearchValue(label);
  const catalogItem = catalogItems.find((item) =>
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

function getShoppingCategoryName(
  categorySlug: string,
  catalogCategories: ShoppingCatalogCategory[],
) {
  return catalogCategories.find((category) => category.slug === categorySlug)?.name ?? categorySlug;
}

function getCategoryOptions(catalogCategories: ShoppingCatalogCategory[]) {
  const options = catalogCategories.length > 0 ? catalogCategories : FALLBACK_SHOPPING_CATEGORIES;
  return options.some((categoryOption) => categoryOption.slug === DEFAULT_CUSTOM_CATEGORY_SLUG)
    ? options
    : [...options, FALLBACK_SHOPPING_CATEGORIES[FALLBACK_SHOPPING_CATEGORIES.length - 1]];
}

function getShoppingCategorySubmissionValue(category: string, catalogCategories: ShoppingCatalogCategory[]) {
  const trimmedCategory = category.trim();

  if (!trimmedCategory) {
    return DEFAULT_CUSTOM_CATEGORY_SLUG;
  }

  if (normalizeShoppingSearchValue(trimmedCategory) === "egne varer") {
    return "egne-varer";
  }

  return (
    catalogCategories.find(
      (categoryOption) =>
        categoryOption.slug === trimmedCategory ||
        normalizeShoppingSearchValue(categoryOption.name) ===
          normalizeShoppingSearchValue(trimmedCategory),
    )?.slug ?? trimmedCategory
  );
}

function getShoppingItemCategory(item: ShoppingItem, catalogCategories: ShoppingCatalogCategory[]) {
  if (!item.category) {
    return { name: "Andre varer", slug: "andre-varer", sortOrder: 999 };
  }

  if (item.category === "egne-varer") {
    return { name: "Egne varer", slug: "egne-varer", sortOrder: 998 };
  }

  return (
    catalogCategories.find((categoryOption) => categoryOption.slug === item.category) ?? {
      name: item.category,
      slug: normalizeShoppingSearchValue(item.category).replace(/ /g, "-"),
      sortOrder: 997,
    }
  );
}

function groupShoppingItemsByCategory(items: ShoppingItem[], catalogCategories: ShoppingCatalogCategory[]) {
  const groups = new Map<
    string,
    { items: ShoppingItem[]; name: string; slug: string; sortOrder: number }
  >();

  for (const item of items) {
    const category = getShoppingItemCategory(item, catalogCategories);
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
  catalogCategories,
  isBusy,
  isMenuOpen,
  item,
  onDelete,
  onEdit,
  onMenuClick,
  onToggle,
}: {
  catalogCategories: ShoppingCatalogCategory[];
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
          {formatShoppingItemMeta(item, catalogCategories) ? (
            <span className="shopping-list__quantity">
              {formatShoppingItemMeta(item, catalogCategories)}
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

function formatShoppingItemMeta(item: ShoppingItem, catalogCategories: ShoppingCatalogCategory[]) {
  return [
    item.quantity,
    item.unit,
    item.category ? getShoppingItemCategory(item, catalogCategories).name : null,
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
