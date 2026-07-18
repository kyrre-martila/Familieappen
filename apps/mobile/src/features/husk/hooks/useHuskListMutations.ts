import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import {
  createHuskList,
  createHuskListItem,
  deleteHuskListItem,
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
  const error = create.error || update.error || remove.error;
  return {
    createItem: create.mutateAsync,
    updateItem: update.mutateAsync,
    deleteItem: remove.mutateAsync,
    saving: create.isPending || update.isPending || remove.isPending,
    error: error ? message(error) : null,
    resetError: () => {
      create.reset();
      update.reset();
      remove.reset();
    },
  };
}
