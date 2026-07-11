import { strict as assert } from "node:assert";
import { hashAdminPassword, parseAdminCreateArgs, validateAdminEmail, validateAdminName, validateAdminPassword, validateAdminRole } from "../src/admin/admin-create";

async function main(): Promise<void> {
  assert.deepEqual(parseAdminCreateArgs(["--email", "Admin@Example.COM", "--name", "Administrator", "--password=secret-pass"]), {
    email: "Admin@Example.COM",
    name: "Administrator",
    password: "secret-pass"
  });
  assert.equal(parseAdminCreateArgs(["--email", "a@example.com", "--name", "A", "--role", "SUPPORT"]).role, "SUPPORT");
  assert.throws(() => parseAdminCreateArgs(["--unknown", "value"]), /Unknown option/);

  assert.equal(validateAdminEmail(" Admin@Example.COM "), "admin@example.com");
  assert.throws(() => validateAdminEmail("not-an-email"), /valid email/);
  assert.equal(validateAdminName(" Administrator "), "Administrator");
  assert.throws(() => validateAdminName(""), /between 1 and 100/);
  assert.equal(validateAdminRole("AD_MANAGER"), "AD_MANAGER");
  assert.throws(() => validateAdminRole("OWNER"), /--role must be one of/);
  assert.equal(validateAdminPassword("long-enough"), "long-enough");
  assert.throws(() => validateAdminPassword("short"), /between 8 and 1024/);

  const hash = await hashAdminPassword("long-enough");
  assert.match(hash, /^scrypt:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
  assert.notEqual(hash, "long-enough");

  console.log("admin create validation tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
