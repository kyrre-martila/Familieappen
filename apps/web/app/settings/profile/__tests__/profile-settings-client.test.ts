import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

const source = readFileSync(resolve("app/settings/profile/ProfileSettingsClient.tsx"), "utf8");

test("profile settings does not persist profile state in localStorage", () => {
  assert.equal(source.includes("familieappen.profileSettings"), false);
  assert.equal(source.includes("window.localStorage"), false);
  assert.equal(source.includes("localStorage.setItem"), false);
  assert.equal(source.includes("localStorage.getItem"), false);
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
