export type MutationRefreshOutcome = "refreshed" | "refresh-failed" | "stale";

/**
 * Commits a successful write before attempting the secondary read. This keeps
 * an append-only write from being presented (and retried) as failed merely
 * because the following refresh failed.
 */
export async function mutationThenRefresh<T, R>({
  mutation,
  isCurrent,
  commitMutation,
  refresh,
  commitRefresh,
}: {
  mutation: () => Promise<T>;
  isCurrent: () => boolean;
  commitMutation: (value: T) => void;
  refresh: () => Promise<R>;
  commitRefresh: (value: R) => void;
}): Promise<MutationRefreshOutcome> {
  const mutationResult = await mutation();
  if (!isCurrent()) return "stale";

  commitMutation(mutationResult);

  try {
    const refreshResult = await refresh();
    if (!isCurrent()) return "stale";
    commitRefresh(refreshResult);
    return "refreshed";
  } catch {
    return isCurrent() ? "refresh-failed" : "stale";
  }
}
