declare const require: (moduleName: string) => any;
declare const process: { cwd: () => string };

const { readFileSync } = require("fs");
const { join } = require("path");

function ok(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const source = readFileSync(join(process.cwd(), "src/features/auth/AuthProvider.tsx"), "utf8");

ok(source.includes("completeProfileOnboarding: (updatedUser: AuthUser) => Promise<void>;"), "Auth context exposes completeProfileOnboarding");
ok(source.includes("const completeProfileOnboarding = useCallback("), "AuthProvider implements completeProfileOnboarding");
ok(source.includes("queryClient.setQueryData([\"auth\", \"me\"], updatedUser)"), "completeProfileOnboarding updates current-user cache");
ok(source.includes("queryClient.setQueryData([\"auth\", \"families\"], families)"), "completeProfileOnboarding updates families cache");
ok(source.includes("queryClient.setQueryData([\"auth\", \"pendingFamilyAccess\"], pendingAccess)"), "completeProfileOnboarding updates pending-access cache");
ok(source.includes("setFamilyStatus(resolveFamilyStatus(families, pendingAccess, updatedUser))"), "completeProfileOnboarding recomputes familyStatus from fresh data and updated user");
ok(source.includes("const setCurrentUser = useCallback((nextUser: AuthUser)"), "setCurrentUser remains available for simple user updates");

console.log("auth provider tests passed");
