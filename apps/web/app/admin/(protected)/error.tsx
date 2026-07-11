"use client";
export default function AdminError({ reset }: { error: Error; reset: () => void }) { return <div className="admin-state" role="alert"><h1>Admin page unavailable</h1><p>Something went wrong. Please try again.</p><button className="admin-button" type="button" onClick={reset}>Retry</button></div>; }
