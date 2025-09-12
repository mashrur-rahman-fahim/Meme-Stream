import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import feedService from "../services/feedService";
import toast from "react-hot-toast";

// Query key factory
export const feedKeys = {
  all: ["feed"],
  lists: () => [...feedKeys.all, "list"],
  list: (filters) => [...feedKeys.lists(), { ...filters }],
  details: () => [...feedKeys.all, "detail"],
  detail: (id) => [...feedKeys.details(), id],
  reactions: (postId) => ["reactions", postId],
  comments: (postId) => ["comments", postId],
};

// Optimized infinite feed query
export const useFeedQuery = (pageSize = 20) => {
  return useInfiniteQuery({
    queryKey: feedKeys.list({ pageSize }),
    queryFn: ({ pageParam = 1 }) => feedService.getFeed(pageParam, pageSize),
    getNextPageParam: (lastPage, pages) => {
      const { posts = [] } = lastPage.data || {};
      return posts.length === pageSize ? pages.length + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for feed
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });
};

// Optimized post reactions query
export const usePostReactions = (postId) => {
  return useQuery({
    queryKey: feedKeys.reactions(postId),
    queryFn: () => feedService.getPostReactions(postId),
    staleTime: 30 * 1000, // 30 seconds for reactions
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    enabled: !!postId,
    retry: false,
  });
};

// Optimized post comments query
export const usePostComments = (postId) => {
  return useQuery({
    queryKey: feedKeys.comments(postId),
    queryFn: () => feedService.getPostComments(postId),
    staleTime: 1 * 60 * 1000, // 1 minute for comments
    gcTime: 3 * 60 * 1000, // 3 minutes cache
    enabled: !!postId,
    retry: false,
  });
};

// Optimized mutations with cache updates
export const useReactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, reactionType }) => feedService.addReaction(postId, reactionType),
    onMutate: async ({ postId, reactionType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedKeys.reactions(postId) });
      
      // Snapshot the previous value
      const previousReactions = queryClient.getQueryData(feedKeys.reactions(postId));
      
      // Optimistically update
      queryClient.setQueryData(feedKeys.reactions(postId), (old) => {
        if (!old?.data?.reactions) return old;
        
        const currentUser = queryClient.getQueryData(["currentUser"]);
        const userId = currentUser?.id;
        
        const existingReaction = old.data.reactions.find(r => r.userId === userId);
        
        if (existingReaction) {
          // Remove existing reaction
          return {
            ...old,
            data: {
              ...old.data,
              reactions: old.data.reactions.filter(r => r.userId !== userId),
              userReaction: null,
            }
          };
        } else {
          // Add new reaction
          const newReaction = {
            id: Date.now(),
            userId,
            user: currentUser,
            type: reactionType,
            createdAt: new Date().toISOString(),
          };
          
          return {
            ...old,
            data: {
              ...old.data,
              reactions: [...old.data.reactions, newReaction],
              userReaction: newReaction,
            }
          };
        }
      });
      
      return { previousReactions };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(feedKeys.reactions(variables.postId), context.previousReactions);
      toast.error("Failed to update reaction");
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: feedKeys.reactions(variables.postId) });
    },
  });
};

export const useCommentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }) => feedService.addComment(postId, content),
    onMutate: async ({ postId, content }) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.comments(postId) });
      
      const previousComments = queryClient.getQueryData(feedKeys.comments(postId));
      
      queryClient.setQueryData(feedKeys.comments(postId), (old) => {
        if (!old?.data) return old;
        
        const currentUser = queryClient.getQueryData(["currentUser"]);
        const optimisticComment = {
          id: `temp-${Date.now()}`,
          content,
          user: currentUser,
          createdAt: new Date().toISOString(),
          replies: [],
          isOptimistic: true,
        };
        
        return {
          ...old,
          data: [...old.data, optimisticComment],
        };
      });
      
      return { previousComments };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(feedKeys.comments(variables.postId), context.previousComments);
      toast.error("Failed to add comment");
    },
    onSuccess: (data, variables) => {
      toast.success("Comment added!");
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) });
    },
  });
};

export const useDeletePostMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => feedService.deletePost(postId),
    onSuccess: (data) => {
      toast.success(data.data?.message || "Post deleted successfully!");
      // Invalidate and refetch feed data
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete post");
    },
  });
};

export const useSharePostMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => feedService.sharePost(postId),
    onSuccess: () => {
      toast.success("Post shared successfully!");
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to share post");
    },
  });
};