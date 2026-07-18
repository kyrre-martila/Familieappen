import type { HuskList, HuskListItem } from "@familieappen/shared";

export type HuskListForm = {
  title: string;
  icon: string;
  description: string;
  scope: "family" | "members";
  memberIds: string[];
};
export type HuskListPayload = {
  title: string;
  icon?: string;
  description?: string | null;
  scope: "family" | "members";
  memberIds?: string[];
};
export type HuskListItemForm = {
  title: string;
  description: string;
  assignedMemberIds: string[];
};
export type HuskListItemPayload = {
  title: string;
  description?: string | null;
  assignedMemberIds?: string[];
};
export type FormErrors = Partial<Record<"title" | "memberIds", string>>;

export function defaultHuskListForm(): HuskListForm {
  return {
    title: "",
    icon: "home",
    description: "",
    scope: "family",
    memberIds: [],
  };
}
export function huskListToForm(list: HuskList): HuskListForm {
  return {
    title: list.title,
    icon: list.icon || "home",
    description: list.description ?? "",
    scope: list.scope,
    memberIds: [...list.memberIds],
  };
}
export function normalizeHuskListForm(form: HuskListForm): HuskListForm {
  return {
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    memberIds: Array.from(new Set(form.memberIds)),
  };
}
export function validateHuskListForm(form: HuskListForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = "Skriv inn listenavn.";
  if (form.scope === "members" && form.memberIds.length === 0)
    errors.memberIds = "Velg minst én person, eller velg hele familien.";
  return errors;
}
export function huskListFormToCreatePayload(
  form: HuskListForm,
): HuskListPayload {
  const n = normalizeHuskListForm(form);
  return {
    title: n.title,
    icon: n.icon,
    description: n.description || null,
    scope: n.scope,
    memberIds: n.scope === "family" ? [] : n.memberIds,
  };
}
export function huskListFormToUpdatePayload(
  form: HuskListForm,
): HuskListPayload {
  return huskListFormToCreatePayload(form);
}

export function defaultHuskListItemForm(): HuskListItemForm {
  return { title: "", description: "", assignedMemberIds: [] };
}
export function huskListItemToForm(item: HuskListItem): HuskListItemForm {
  return {
    title: item.title,
    description: item.description ?? "",
    assignedMemberIds: item.assignedFamilyMemberId
      ? [item.assignedFamilyMemberId]
      : [],
  };
}
export function validateHuskListItemForm(form: HuskListItemForm): FormErrors {
  return form.title.trim() ? {} : { title: "Skriv inn element." };
}
export function huskListItemFormToPayload(
  form: HuskListItemForm,
): HuskListItemPayload {
  const title = form.title.trim();
  const description = form.description.trim();
  return {
    title,
    description: description || null,
    assignedMemberIds: Array.from(new Set(form.assignedMemberIds)),
  };
}
