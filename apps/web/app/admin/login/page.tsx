import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "../../../lib/admin-api";
import { AdminApiError } from "../../../lib/admin-shared";
import { AdminLoginForm } from "../../../components/admin/AdminLoginForm";

export default async function AdminLoginPage() {
  try {
    await getCurrentAdmin();
    redirect("/admin");
  } catch (error) {
    if (error instanceof AdminApiError && error.status !== 401) {
      // Keep login available when the admin API is temporarily unavailable.
    }
  }

  return (
    <main className="admin-login-page" aria-labelledby="admin-login-title">
      <section className="admin-login-card">
        <p className="admin-login-card__eyebrow">FamilieAppen Admin</p>
        <h1 id="admin-login-title">Administrator sign in</h1>
        <p className="admin-login-card__intro">Use your administrator credentials to manage FamilieAppen operations.</p>
        <Suspense fallback={<div className="admin-state admin-state--inline">Loading sign-in form…</div>}><AdminLoginForm /></Suspense>
      </section>
    </main>
  );
}
