import { useRef } from "react";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import {
  completeHuskListItem,
  createHuskList,
  createHuskListItem,
  deleteHuskListItem,
  uncompleteHuskListItem,
  updateHuskList,
  updateHuskListItem,
} from "../api";
import {
  huskListFormToCreatePayload,
  huskListFormToUpdatePayload,
  huskListItemFormToCreatePayload,
  huskListItemFormToUpdatePayload,
  type HuskListForm,
  type HuskListItemForm,
} from "../huskListForm";
import {
  appendHuskListItem,
  mergeCreatedHuskList,
  removeHuskListItem,
  replaceHuskList,
  replaceHuskListItem,
} from "../listCache";
import { huskQueryKeys } from "../queryKeys";
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Kunne ikke lagre akkurat nå.";
function useFamily() {
  const { accessToken } = useAuth();
  const families = useQuery({
    queryKey: huskQueryKeys.families,
    queryFn: () => listFamilies(accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 60_000,
  });
  return {
    accessToken,
    families,
    familyId: families.data?.[0]?.family.id ?? null,
  };
}
export function useCreateHuskList() {
  const { accessToken, families, familyId } = useFamily();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (form: HuskListForm) =>
      createHuskList(
        accessToken!,
        familyId!,
        huskListFormToCreatePayload(form),
      ),
    onSuccess: (list) => {
      if (familyId)
        client.setQueryData(huskQueryKeys.lists(familyId), (c) =>
          mergeCreatedHuskList(c as any, list),
        );
      router.replace(`/(app)/husk/lists/${list.id}`);
    },
  });
  return {
    create: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error ? message(mutation.error) : null,
    resetError: mutation.reset,
    familiesLoading: families.isLoading,
    missingContext: Boolean(accessToken && families.isSuccess && !familyId),
  };
}
export function useUpdateHuskList(listId: string) {
  const { accessToken, families, familyId } = useFamily();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (form: HuskListForm) =>
      updateHuskList(
        accessToken!,
        familyId!,
        listId,
        huskListFormToUpdatePayload(form),
      ),
    onSuccess: (list) => {
      if (familyId)
        client.setQueryData(huskQueryKeys.lists(familyId), (c) =>
          replaceHuskList(c as any, list),
        );
      router.replace(`/(app)/husk/lists/${list.id}`);
    },
  });
  return {
    update: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error ? message(mutation.error) : null,
    resetError: mutation.reset,
    familiesLoading: families.isLoading,
    missingContext: Boolean(accessToken && families.isSuccess && !familyId),
  };
}
export function useHuskListItemMutations(listId: string) {
  const { accessToken, familyId } = useFamily();
  const client = useQueryClient();
  const completionInFlightRef = useRef(false);
  const set = (fn: (c: any) => any) => {
    if (familyId) client.setQueryData(huskQueryKeys.lists(familyId), fn);
  };
  const create = useMutation({
    mutationFn: (form: HuskListItemForm) =>
      createHuskListItem(
        accessToken!,
        familyId!,
        listId,
        huskListItemFormToCreatePayload(form),
      ),
    onSuccess: (item) => set((c) => appendHuskListItem(c, listId, item)),
  });
  const update = useMutation({
    mutationFn: ({
      itemId,
      form,
    }: {
      itemId: string;
      form: HuskListItemForm;
    }) =>
      updateHuskListItem(
        accessToken!,
        familyId!,
        listId,
        itemId,
        huskListItemFormToUpdatePayload(form),
      ),
    onSuccess: (item) => set((c) => replaceHuskListItem(c, listId, item)),
  });
  const remove = useMutation({
    mutationFn: (itemId: string) =>
      deleteHuskListItem(accessToken!, familyId!, listId, itemId),
    onSuccess: (item, itemId) =>
      set((c) => removeHuskListItem(c, listId, item?.id ?? itemId)),
  });
  const complete = useMutation({
    mutationFn: (itemId: string) =>
      completeHuskListItem(accessToken!, familyId!, listId, itemId),
    onSuccess: (item) => set((c) => replaceHuskListItem(c, listId, item)),
  });
  const uncomplete = useMutation({
    mutationFn: (itemId: string) =>
      uncompleteHuskListItem(accessToken!, familyId!, listId, itemId),
    onSuccess: (item) => set((c) => replaceHuskListItem(c, listId, item)),
  });
  const completionSaving = complete.isPending || uncomplete.isPending;
  const runCompletion = async (
    action: "complete" | "uncomplete",
    itemId: string,
  ) => {
    if (completionInFlightRef.current) return;
    completionInFlightRef.current = true;
    complete.reset();
    uncomplete.reset();
    try {
      if (action === "complete") {
        await complete.mutateAsync(itemId);
      } else {
        await uncomplete.mutateAsync(itemId);
      }
    } finally {
      completionInFlightRef.current = false;
    }
  };
  const error =
    create.error ||
    update.error ||
    remove.error ||
    complete.error ||
    uncomplete.error;
  return {
    createItem: create.mutateAsync,
    updateItem: update.mutateAsync,
    deleteItem: remove.mutateAsync,
    completeItem: (itemId: string) => runCompletion("complete", itemId),
    uncompleteItem: (itemId: string) => runCompletion("uncomplete", itemId),
    completingItemId: complete.isPending ? (complete.variables ?? null) : null,
    uncompletingItemId: uncomplete.isPending
      ? (uncomplete.variables ?? null)
      : null,
    completionSaving,
    saving:
      create.isPending ||
      update.isPending ||
      remove.isPending ||
      completionSaving,
    error: error ? message(error) : null,
    resetError: () => {
      create.reset();
      update.reset();
      remove.reset();
      complete.reset();
      uncomplete.reset();
    },
  };
}
