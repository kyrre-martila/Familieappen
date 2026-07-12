import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const shell = readFileSync("components/admin/AdminShell.tsx", "utf8");
const feedback = readFileSync("components/admin/AdminFeedbackClient.tsx", "utf8");
const api = readFileSync("lib/admin-api.ts", "utf8");
const styles = readFileSync("app/globals.css", "utf8");

const feedbackCardSource = feedback.slice(feedback.indexOf("function FeedbackCard"), feedback.indexOf("export function AdminFeedbackDetail"));
const feedbackDetailSource = feedback.slice(feedback.indexOf("export function AdminFeedbackDetail"));

assert(shell.includes('href: "/admin/feedback"'));
assert(shell.indexOf('href: "/admin/users"') < shell.indexOf('href: "/admin/feedback"'));
assert(feedback.includes("BUG REPORTS"));
assert(feedback.includes("GENERAL FEEDBACK"));
assert(feedback.includes("No bug reports yet"));
assert(feedback.includes("No general feedback"));

assert(feedbackCardSource.includes("admin-feedback-row"));
assert(feedbackCardSource.includes("item.title"));
assert(feedbackCardSource.includes("item.userName?.trim()"));
assert(feedbackCardSource.includes("formatDate(item.createdAt)"));
assert(feedbackCardSource.includes('item.status || "New"'));
assert(feedbackCardSource.includes("/admin/feedback/${encodeURIComponent(item.id)}"));
assert(feedbackCardSource.includes("aria-label={`Open feedback submission: ${item.title}`}"));
assert(!feedbackCardSource.includes("item.email"));
assert(!feedbackCardSource.includes("item.familyName"));
assert(!feedbackCardSource.includes("item.appVersion"));
assert(!feedbackCardSource.includes("item.message"));
assert(!feedbackCardSource.includes("item.userAgent"));
assert(!feedbackCardSource.includes("item.familyId"));
assert(!feedbackCardSource.includes("item.userId"));

assert(feedbackDetailSource.includes('Meta label="Type"'));
assert(feedbackDetailSource.includes('Meta label="Title"'));
assert(feedbackDetailSource.includes('Meta label="Submitted"'));
assert(feedbackDetailSource.includes('Meta label="User"'));
assert(feedbackDetailSource.includes('Meta label="Email"'));
assert(feedbackDetailSource.includes('Meta label="Family"'));
assert(feedbackDetailSource.includes('Meta label="App version"'));
assert(feedbackDetailSource.includes('Meta label="Browser / OS"'));
assert(feedbackDetailSource.includes('Meta label="Status"'));
assert(feedbackDetailSource.includes("item.message"));

assert(api.includes("getAdminFeedback()"));
assert(api.includes("/admin/feedback"));
assert(styles.includes(".admin-feedback-list { display: grid"));
assert(styles.includes(".admin-feedback-row:focus-visible"));
assert(styles.includes("overflow-wrap: anywhere"));
assert(styles.includes("@media (max-width: 560px)"));
console.log("admin feedback component tests passed");
