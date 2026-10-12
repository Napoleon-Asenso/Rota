import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../src/services/api';

export interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  details: string;
  category: 'Shifts' | 'Swaps' | 'Changes';
  timeAgo?: string;
  createdAt: string;
  actorName?: string;
  badge?: {
    label: string;
    text: string;
    bg: string;
  };
}

export interface ActivityFeedResponse {
  items: ActivityFeedItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
  hasMore?: boolean;
}

/**
 * useActivityFeed
 * TanStack Infinite Query hook for O(1) cursor-paginated activity feed.
 */
export function useActivityFeed(category?: string) {
  return useInfiniteQuery<ActivityFeedResponse>({
    queryKey: ['activities', category ?? 'All'],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get('/api/activities', {
        params: {
          cursor: pageParam || undefined,
          limit: 20,
          type: category && category !== 'All' ? category : undefined
        }
      });
      return response.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5
  });
}
