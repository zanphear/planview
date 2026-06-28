import { useInfiniteQuery } from '@tanstack/react-query';
import { activityApi, type Activity } from '../activity';

const PAGE_SIZE = 50;

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one feed or everything:
//   activityKeys.all                 -> ['activity']
//   activityKeys.feeds()             -> ['activity', 'feed']
//   activityKeys.feed(wsId)          -> ['activity', 'feed', wsId]
// The activity fetcher takes only limit/offset (no entity/user filters), so the
// feed is keyed on workspace alone; offset is the infinite-query pageParam, not
// part of the key.
export const activityKeys = {
  all: ['activity'] as const,
  feeds: () => [...activityKeys.all, 'feed'] as const,
  feed: (workspaceId: string) => [...activityKeys.feeds(), workspaceId] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Paginated workspace activity feed. Infinite query: each page is an offset
 * fetch of PAGE_SIZE rows; the next page exists only while a full page came
 * back. Consumers flatten `data.pages`.
 */
export function useActivityFeed(workspaceId: string | undefined) {
  return useInfiniteQuery({
    queryKey: activityKeys.feed(workspaceId ?? ''),
    queryFn: async ({ pageParam }): Promise<Activity[]> =>
      (await activityApi.list(workspaceId!, { limit: PAGE_SIZE, offset: pageParam })).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: !!workspaceId,
  });
}
