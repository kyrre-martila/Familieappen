import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const shell = readFileSync("components/admin/AdminShell.tsx", "utf8");
const feedback = readFileSync("components/admin/AdminFeedbackClient.tsx", "utf8");
const api = readFileSync("lib/admin-api.ts", "utf8");

assert(shell.includes('href: "/admin/feedback"'));
assert(shell.indexOf('href: "/admin/users"') < shell.indexOf('href: "/admin/feedback"'));
assert(feedback.includes('BUG REPORTS'));
assert(feedback.includes('GENERAL FEEDBACK'));
assert(feedback.includes('No bug reports yet'));
assert(feedback.includes('No general feedback yet'));
assert(feedback.includes('Open submission'));
assert(feedback.includes('Browser / OS'));
assert(feedback.includes('item.status || "New"'));
assert(api.includes('getAdminFeedback()'));
assert(api.includes('/admin/feedback'));
console.log("admin feedback component tests passed");
