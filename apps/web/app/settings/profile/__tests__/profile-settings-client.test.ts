import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

const source = readFileSync(resolve("app/settings/profile/ProfileSettingsClient.tsx"), "utf8");

test("profile settings does not persist profile state or passwords in localStorage", () => {
  assert.equal(source.includes("familieappen.profileSettings"), false);
  assert.equal(source.includes("window.localStorage"), false);
  assert.equal(source.includes("localStorage.setItem"), false);
  assert.equal(source.includes("localStorage.getItem"), false);
  assert.equal(source.includes("sessionStorage"), false);
});

test("profile save failure keeps the edit flow open", () => {
  const saveProfileIndex = source.indexOf("async function saveProfile");
  assert.notEqual(saveProfileIndex, -1);
  const catchIndex = source.indexOf("} catch (error) {", saveProfileIndex);
  assert.notEqual(catchIndex, -1);
  const finallyIndex = source.indexOf("} finally {", catchIndex);
  assert.notEqual(finallyIndex, -1);
  const catchBlock = source.slice(catchIndex, finallyIndex);

  assert.equal(catchBlock.includes("setEditingField(null)"), false);
  assert(catchBlock.includes("setSaveError"));
});

test("password dialog opens from the visible account action", () => {
  assert(source.includes('label="Endre passord"'));
  assert(source.includes("onClick={openPasswordSheet}"));
  assert(source.includes("<PasswordChangeSheet"));
  assert(source.includes("Nåværende passord"));
  assert(source.includes("Nytt passord"));
  assert(source.includes("Gjenta nytt passord"));
});

test("password submit shows disabled loading state while saving", () => {
  assert(source.includes('disabled={isSaving}'));
  assert(source.includes('isSaving ? "Oppdaterer…" : "Oppdater passord"'));
});

test("password mismatch and backend errors keep the dialog open", () => {
  const sheetIndex = source.indexOf("function PasswordChangeSheet");
  assert.notEqual(sheetIndex, -1);
  const mismatchIndex = source.indexOf('setLocalError("Passordene er ikke like.")', sheetIndex);
  assert.notEqual(mismatchIndex, -1);
  const mismatchBlock = source.slice(mismatchIndex, source.indexOf("setLocalError(\"\");", mismatchIndex));
  assert.equal(mismatchBlock.includes("onCancel"), false);

  const savePasswordIndex = source.indexOf("async function savePassword");
  assert.notEqual(savePasswordIndex, -1);
  const catchIndex = source.indexOf("} catch (error) {", savePasswordIndex);
  assert.notEqual(catchIndex, -1);
  const finallyIndex = source.indexOf("} finally {", catchIndex);
  assert.notEqual(finallyIndex, -1);
  const catchBlock = source.slice(catchIndex, finallyIndex);
  assert.equal(catchBlock.includes("setIsPasswordSheetOpen(false)"), false);
  assert(catchBlock.includes("setPasswordError"));
});

test("password success closes the dialog and shows calm feedback", () => {
  const savePasswordIndex = source.indexOf("async function savePassword");
  assert.notEqual(savePasswordIndex, -1);
  const tryIndex = source.indexOf("try {", savePasswordIndex);
  const catchIndex = source.indexOf("} catch (error) {", tryIndex);
  const tryBlock = source.slice(tryIndex, catchIndex);

  assert(tryBlock.includes("changeCurrentUserPassword(input)"));
  assert(tryBlock.includes("setIsPasswordSheetOpen(false)"));
  assert(tryBlock.includes("Passordet ble oppdatert"));
});
