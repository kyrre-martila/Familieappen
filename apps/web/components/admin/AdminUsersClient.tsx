"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { fetchAdminUsers } from "../../lib/admin-client-api";
import { AdminApiError, type AdminUserListResponse, type UserStatusFilter, type UserSortOrder } from "../../lib/admin-shared";

const PAGE_SIZES = [20, 50, 100];

type Props = { initialData: AdminUserListResponse | null; initialError?: "forbidden" | "error"; initialQuery: { search: string; status: "all" | UserStatusFilter; sort: UserSortOrder; page: number; pageSize: number } };

export function AdminUsersClient({ initialData, initialError, initialQuery }: Props) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const [data, setData] = useState(initialData); const [error, setError] = useState<Props["initialError"]>(initialError); const [loading, setLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState(initialQuery.search); const [noticeMessage, setNoticeMessage] = useState<string | null>(null); const latest = useRef(0); const shownNotice = useRef<string | null>(null); const [, startTransition] = useTransition();
  const query = useMemo(() => parseUserQuery(params), [params]);

  useEffect(() => { setSearchDraft(query.search); }, [query.search]);
  useEffect(() => {
    const notice = params.get("notice");
    const message = adminUsersNoticeMessage(notice);
    if (message && shownNotice.current !== notice) { setNoticeMessage(message); shownNotice.current = notice; }
    if (notice !== null) { const next = new URLSearchParams(params.toString()); next.delete("notice"); router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }); }
  }, [params, pathname, router]);
  useEffect(() => {
    const requestId = ++latest.current; setLoading(true); setError(undefined);
    fetchAdminUsers(toApiQuery(query)).then((next) => { if (requestId === latest.current) setData(next); }).catch((err) => {
      if (requestId !== latest.current) return;
      if (err instanceof AdminApiError && err.status === 401) { router.replace("/admin/login"); return; }
      setError(err instanceof AdminApiError && err.status === 403 ? "forbidden" : "error");
    }).finally(() => { if (requestId === latest.current) setLoading(false); });
  }, [query.search, query.status, query.sort, query.page, query.pageSize, router]);

  function update(next: Partial<typeof query>) { const merged = { ...query, ...next }; const sp = new URLSearchParams(); if (merged.search) sp.set("search", merged.search); if (merged.status !== "all") sp.set("status", merged.status); if (merged.sort !== "desc") sp.set("sort", merged.sort === "asc" ? "oldest" : "newest"); if (merged.page > 1) sp.set("page", String(merged.page)); if (merged.pageSize !== 20) sp.set("pageSize", String(merged.pageSize)); startTransition(() => router.push(`${pathname}${sp.toString() ? `?${sp}` : ""}`)); }
  function submitSearch(e: React.FormEvent) { e.preventDefault(); update({ search: searchDraft.trim(), page: 1 }); }
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? query.pageSize)));
  const hasFilters = Boolean(query.search || query.status !== "all" || query.sort !== "desc" || query.pageSize !== 20);

  return <section className="admin-data-page" aria-labelledby="users-title">
    {noticeMessage ? <AdminUsersSuccessNotice message={noticeMessage} onDismiss={() => setNoticeMessage(null)} /> : null}
    <div className="admin-page-header"><p>User support</p><h1 id="users-title">Users</h1><span>Search and review support-relevant account information without exposing private family content.</span></div>
    <form className="admin-filters" onSubmit={submitSearch}>
      <label className="admin-field"><span>Search name or email</span><input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Name or email" /></label>
      <label className="admin-field"><span>Account status</span><select value={query.status} onChange={(e) => update({ status: e.target.value as typeof query.status, page: 1 })}><option value="all">All users</option><option value="active">Active users</option><option value="inactive">Inactive users</option></select></label>
      <label className="admin-field"><span>Registration date</span><select value={query.sort} onChange={(e) => update({ sort: e.target.value as UserSortOrder, page: 1 })}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
      <label className="admin-field"><span>Page size</span><select value={query.pageSize} onChange={(e) => update({ pageSize: Number(e.target.value), page: 1 })}>{PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
      <div className="admin-filter-actions"><button className="admin-button admin-button--primary" type="submit">Search</button>{hasFilters ? <button className="admin-button" type="button" onClick={() => update({ search: "", status: "all", sort: "desc", page: 1, pageSize: 20 })}>Clear filters</button> : null}</div>
    </form>
    {loading ? <div className="admin-state admin-state--inline" role="status">Loading users…</div> : null}
    {error === "forbidden" ? <AdminDenied /> : error ? <AdminRetry message="Users could not be loaded. Please try again." onRetry={() => update({})} /> : null}
    {!error && data ? data.items.length ? <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Family</th><th>Members</th><th>Registered</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.items.map((u) => <tr key={u.id}><td>{fallback(u.name)}</td><td>{fallback(u.email)}</td><td>{fallback(u.familyName)}</td><td>{u.familyMemberCount}</td><td>{formatDate(u.createdAt)}</td><td><Status active={u.active} /></td><td><Link className="admin-button" href={`/admin/users/${encodeURIComponent(u.id)}?from=${encodeURIComponent(`${pathname}${params.toString() ? `?${params}` : ""}`)}`}>Details</Link></td></tr>)}</tbody></table></div><div className="admin-card-list">{data.items.map((u) => <article className="admin-user-card" key={u.id}><h2>{fallback(u.name)}</h2><p>{fallback(u.email)}</p><dl><div><dt>Family</dt><dd>{fallback(u.familyName)}</dd></div><div><dt>Members</dt><dd>{u.familyMemberCount}</dd></div><div><dt>Registered</dt><dd>{formatDate(u.createdAt)}</dd></div><div><dt>Status</dt><dd><Status active={u.active} /></dd></div></dl><Link className="admin-button" href={`/admin/users/${encodeURIComponent(u.id)}?from=${encodeURIComponent(`${pathname}${params.toString() ? `?${params}` : ""}`)}`}>Details</Link></article>)}</div><Pagination page={data.page} total={data.total} totalPages={totalPages} onPage={(page) => update({ page })} /></> : <div className="admin-state admin-state--inline"><h2>{hasFilters ? "No users match these filters" : "No users yet"}</h2><p>{hasFilters ? "Try clearing the search, status, or sort filters." : "There are no registered user accounts in the system."}</p>{hasFilters ? <button className="admin-button" onClick={() => update({ search: "", status: "all", sort: "desc", page: 1, pageSize: 20 })}>Clear filters</button> : null}</div> : null}
  </section>;
}
function parseUserQuery(params: URLSearchParams) { const status = params.get("status"); const sortParam = params.get("sort"); const size = Number(params.get("pageSize")); return { search: (params.get("search") ?? "").trim(), status: status === "active" || status === "inactive" ? status : "all", sort: sortParam === "oldest" || sortParam === "asc" ? "asc" : "desc", page: Math.max(1, Number(params.get("page") ?? 1) || 1), pageSize: PAGE_SIZES.includes(size) ? size : 20 } as const; }
function adminUsersNoticeMessage(notice: string | null) { if (notice === "user-deleted") return "User deleted successfully."; if (notice === "family-deleted") return "Family deleted successfully."; return null; }
function toApiQuery(q: ReturnType<typeof parseUserQuery>) { return { search: q.search || undefined, status: q.status === "all" ? undefined : q.status, sort: q.sort, page: q.page, pageSize: q.pageSize }; }
function fallback(v?: string | null) { return v?.trim() || "Not provided"; }
function formatDate(v: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(v)); }
function Status({ active }: { active: boolean }) { return <span className={`admin-status admin-status--${active ? "active" : "inactive"}`}>{active ? "Active" : "Inactive"}</span>; }
function AdminUsersSuccessNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) { return <div className="admin-success admin-success--compact" role="status" aria-live="polite"><span>{message}</span><button className="admin-success__dismiss" type="button" onClick={onDismiss} aria-label="Dismiss success notice">×</button></div>; }
function AdminDenied(){ return <div className="admin-state admin-state--inline" role="alert"><h2>Access denied</h2><p>You do not have permission to view users.</p></div>; }
function AdminRetry({message,onRetry}:{message:string;onRetry:()=>void}){ return <div className="admin-alert" role="alert"><p>{message}</p><button className="admin-button" onClick={onRetry}>Retry</button></div>; }
function Pagination({ page, total, totalPages, onPage }: { page: number; total: number; totalPages: number; onPage: (page: number) => void }) { return <nav className="admin-pagination" aria-label="Users pagination"><span>Page {page} of {totalPages} · {total} results</span><button className="admin-button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous users page">Previous</button><button className="admin-button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next users page">Next</button></nav>; }
