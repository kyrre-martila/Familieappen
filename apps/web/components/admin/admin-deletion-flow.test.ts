import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

const detailSource = readFileSync(resolve("components/admin/AdminUserDetailClient.tsx"), "utf8");
const usersSource = readFileSync(resolve("components/admin/AdminUsersClient.tsx"), "utf8");

test("successful user deletion redirects to users with a one-time notice and no refresh", () => {
  assert(detailSource.includes("onDone={()=>finishPermanentDeletion('user-deleted')}"));
  assert(detailSource.includes("router.replace(`/admin/users?notice=${notice}`)"));
  assert.equal(detailSource.includes("/admin/users?deleted=1"), false);

  const userDoneIndex = detailSource.indexOf("onDone={()=>finishPermanentDeletion('user-deleted')}");
  const nextDialogIndex = detailSource.indexOf("dialog?.type === \"delete-family\"", userDoneIndex);
  const userDoneBlock = detailSource.slice(userDoneIndex, nextDialogIndex);
  assert.equal(userDoneBlock.includes("router.refresh()"), false);
  assert.equal(userDoneBlock.includes("refreshUser()"), false);
});

test("successful family deletion redirects to users with a one-time notice and no deleted-resource refetch", () => {
  assert(detailSource.includes("onDone={()=>finishPermanentDeletion('family-deleted')}"));
  const familyDoneIndex = detailSource.indexOf("onDone={()=>finishPermanentDeletion('family-deleted')}");
  const familyDoneBlock = detailSource.slice(familyDoneIndex, detailSource.indexOf("</section>;", familyDoneIndex));
  assert.equal(familyDoneBlock.includes("refreshUser()"), false);
  assert.equal(familyDoneBlock.includes("router.refresh()"), false);
  assert(detailSource.includes("function DeleteFamilyDialog({ family, onClose, onAuth, onDone }: { family:Membership; onClose:()=>void; onAuth:()=>void; onDone:()=>void })"));
});

test("successful DELETE remains success while DELETE and impact 404s still show not-found errors", () => {
  const deleteUserSubmit = detailSource.slice(detailSource.indexOf("async function submit(e:React.FormEvent){e.preventDefault(); if(!valid){setField('Enter a support reason"));
  assert(deleteUserSubmit.includes("await deleteAdminUserPermanently"));
  assert(deleteUserSubmit.includes("onDone();"));
  assert(deleteUserSubmit.includes("setErr(deletionMessage(e)); setSubmitting(false)"));
  assert(detailSource.includes("fetchAdminUserDeletionImpact(user.id).then"));
  assert(detailSource.includes("fetchAdminFamilyDeletionImpact(family.familyId).then"));
  assert(detailSource.includes("if(e.status===404)return 'The user or family was not found. It may already have been deleted.'"));
});

test("permanent deletion unmounts dialogs and clears sensitive state", () => {
  assert(detailSource.includes("setDialog(null); setUser(null); setMessage(\"\"); router.replace"));
  assert(detailSource.includes("deletionRedirected.current"));
  assert(detailSource.includes("setImpact(null); setReason(''); setConfirm(''); setErr(null); setField(null);"));
});

test("known notices render fixed success messages once and are removed from the URL", () => {
  assert(usersSource.includes('if (notice === "user-deleted") return "User deleted successfully."'));
  assert(usersSource.includes('if (notice === "family-deleted") return "Family deleted successfully."'));
  assert(usersSource.includes("shownNotice.current !== notice"));
  assert(usersSource.includes('next.delete("notice")'));
  assert(usersSource.includes('router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false })'));
});

test("unknown notice query values do not render arbitrary text", () => {
  assert(usersSource.includes("function adminUsersNoticeMessage(notice: string | null)"));
  assert(usersSource.includes("return null;"));
  assert.equal(usersSource.includes("{params.get(\"notice\")}"), false);
  assert.equal(usersSource.includes("dangerouslySetInnerHTML"), false);
});
