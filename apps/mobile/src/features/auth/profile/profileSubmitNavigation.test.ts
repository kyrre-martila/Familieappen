declare const require: (moduleName: string) => any;
declare const process: { cwd: () => string };

const { readFileSync } = require("fs");
const { join } = require("path");

function ok(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const source = readFileSync(join(process.cwd(), "app/(onboarding)/profile.tsx"), "utf8");

ok(source.includes("completeProfileOnboarding"), "Profile submit uses central profile-completion API");
ok(!source.includes('router.push("/(onboarding)/family-start")'), "Profile submit does not push family-start directly");
ok(!source.includes("router.push('/(onboarding)/family-start')"), "Profile submit does not push family-start directly with single quotes");

const avatarUploadFailure = source.match(/catch \{[\s\S]*?setAvatarRetryOnly\(true\);[\s\S]*?return;[\s\S]*?\n        \}/)?.[0] ?? "";
ok(avatarUploadFailure.includes("setCurrentUser(finalUser)"), "Avatar retry failure keeps saved profile fields in user state");
ok(!avatarUploadFailure.includes("completeProfileOnboarding"), "Avatar retry failure does not mark profile onboarding complete");

console.log("profile submit navigation tests passed");
