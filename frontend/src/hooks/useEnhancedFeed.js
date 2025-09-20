import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import feedService from "../services/feedService";
import seenPostsManager from "../utils/seenPostsManager";

// Enhanced feed keys that include seen posts context
export const enhancedFeedKeys = {
  all: ["enhanced-feed"],
  lists: () => [...enhancedFeedKeys.all, "list"],
  list: (filters) => [...enhancedFeedKeys.lists(), { ...filters }],
};

export const useEnhancedFeed = (pageSize = 25) => {
  const queryClient = useQueryClient();
  const [lastSeenPosition, setLastSeenPosition] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);

  // Enhanced infinite query that tracks seen posts
  const infiniteQuery = useInfiniteQuery({
    queryKey: enhancedFeedKeys.list({ pageSize, refreshCount }),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await feedService.getFeed(pageParam, pageSize);

      if (result.success && result.data?.posts) {
        // Mark posts as seen when they're loaded
        const postIds = result.data.posts.map(post => post.id);

        // Only mark as seen if this is not a refresh (pageParam > 1 or refreshCount === 0)
        if (pageParam > 1 || refreshCount === 0) {
          seenPostsManager.markMultipleAsSeen(postIds);
        }
      }

      return result;
    },
    getNextPageParam: (lastPage, pages) => {
      const { posts = [] } = lastPage.data || {};
      return posts.length === pageSize ? pages.length + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Memoized posts with seen status and smart ordering
  const enhancedPosts = useMemo(() => {
    if (!infiniteQuery.data?.pages) return [];

    const allPosts = infiniteQuery.data.pages.flatMap(page => page.data?.posts || []);

    const postsWithSeenStatus = allPosts.map(post => ({
      ...post,
      isSeen: seenPostsManager.hasSeen(post.id),
    }));

    // Separate unseen and seen posts
    const unseenPosts = [];
    const seenPosts = [];

    postsWithSeenStatus.forEach(post => {
      if (post.isSeen) {
        seenPosts.push(post);
      } else {
        unseenPosts.push(post);
      }
    });

    // Return unseen posts first, then seen posts at the end
    return [...unseenPosts, ...seenPosts];
  }, [infiniteQuery.data]);

  // Separate unseen and seen posts for statistics
  const { unseenPosts, seenPosts } = useMemo(() => {
    const unseen = enhancedPosts.filter(post => !post.isSeen);
    const seen = enhancedPosts.filter(post => post.isSeen);

    return { unseenPosts: unseen, seenPosts: seen };
  }, [enhancedPosts]);

  // Smart refresh function that prioritizes unseen content
  const smartRefresh = useCallback(async () => {
    // Save current scroll position
    setLastSeenPosition(window.scrollY);

    // Increment refresh count to force new query
    setRefreshCount(prev => prev + 1);

    // Clear the current query cache and refetch
    queryClient.removeQueries({ queryKey: enhancedFeedKeys.list({ pageSize }) });

    // Wait a bit and then refetch
    setTimeout(() => {
      infiniteQuery.refetch();
    }, 100);
  }, [queryClient, pageSize, infiniteQuery]);

  // Mark posts as seen when they come into viewport
  const markPostAsSeen = useCallback((postId) => {
    seenPostsManager.markAsSeen(postId);
    // Optionally trigger a light re-render to update seen status
    queryClient.invalidateQueries({ queryKey: enhancedFeedKeys.list({ pageSize, refreshCount }) });
  }, [queryClient, pageSize, refreshCount]);

  // Get statistics
  const stats = useMemo(() => ({
    totalPosts: enhancedPosts.length,
    unseenCount: unseenPosts.length,
    seenCount: seenPosts.length,
    totalSeenInStorage: seenPostsManager.getSeenCount(),
  }), [enhancedPosts.length, unseenPosts.length, seenPosts.length]);

  // Restore scroll position after refresh (optional)
  useEffect(() => {
    if (refreshCount > 0 && lastSeenPosition > 0 && enhancedPosts.length > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: lastSeenPosition, behavior: 'smooth' });
        setLastSeenPosition(0);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [refreshCount, lastSeenPosition, enhancedPosts.length]);

  return {
    // Original query data
    data: infiniteQuery.data,
    fetchNextPage: infiniteQuery.fetchNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    refetch: infiniteQuery.refetch,

    // Enhanced functionality
    posts: enhancedPosts,
    unseenPosts,
    seenPosts,
    smartRefresh,
    markPostAsSeen,
    stats,

    // Utilities
    clearSeenPosts: () => seenPostsManager.clearSeenPosts(),
    isSmartRefreshAvailable: unseenPosts.length > 0,
  };
};