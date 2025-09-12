import api from "../utils/axios";

export const feedService = {
  // Get the user's personalized feed
  getFeed: async (page = 1, pageSize = 20) => {
    try {
      const response = await api.get(
        `/Post/feed?page=${page}&pageSize=${pageSize}`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch feed",
      };
    }
  },

  // Get posts by a specific user
  getUserPosts: async () => {
    try {
      const response = await api.get("/Post/posts");
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch user posts",
      };
    }
  },

  // Create a new post
  createPost: async (postData) => {
    try {
      const response = await api.post("/Post/create", postData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to create post",
      };
    }
  },

  // Check if content is meme (before posting)
  checkMemeContent: async (content) => {
    try {
      const response = await api.post("/Post/check-meme", {
        content,
        image: "",
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to check meme content",
      };
    }
  },

  // Delete a post
  deletePost: async (postId) => {
    try {
      const response = await api.delete(`/Post/delete/${postId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to delete post",
      };
    }
  },

  // Get reactions for a post
  getPostReactions: async (postId) => {
    try {
      const response = await api.get(`/Reaction/get/${postId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to get reactions",
      };
    }
  },

  // Add reaction to a post
  addReaction: async (postId, reactionType) => {
    try {
      const response = await api.post("/Reaction/create", {
        postId,
        type: reactionType, // Using 'type' to match backend ReactionDto
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to add reaction",
      };
    }
  },

  // Get comments for a post
  getPostComments: async (postId) => {
    try {
      const response = await api.get(`/Comment/get/${postId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to get comments",
      };
    }
  },

  // Add comment to a post
  addComment: async (postId, content) => {
    try {
      const response = await api.post("/Comment/create", { postId, content });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to add comment",
      };
    }
  },

  // Add reply to a comment
  addReply: async (commentId, content) => {
    try {
      const response = await api.post("/Comment/reply", { commentId, content });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to add reply",
      };
    }
  },

  editComment: async (commentId, content) => {
    try {
      const response = await api.put(`/Comment/update/${commentId}`, { content });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update comment",
      };
    }
  },

  deleteComment: async (commentId) => {
    try {
      const response = await api.delete(`/Comment/delete/${commentId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to delete comment",
      };
    }
  },

  // Share a post
  sharePost: async (postId) => {
    try {
      const response = await api.post("/SharedPost/share", { postId });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to share post",
      };
    }
  },

  // Unshare a post
  unsharePost: async (postId) => {
    try {
      const response = await api.delete(`/SharedPost/unshare/${postId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to unshare post",
      };
    }
  },

  // Get user's shared posts
  getUserSharedPosts: async () => {
    try {
      const response = await api.get("/SharedPost/user-shares");
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch shared posts",
      };
    }
  },

  // Get a single post by ID
  getSinglePost: async (postId) => {
    try {
      const response = await api.get(`/Post/single/${postId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch post",
      };
    }
  },
};

export default feedService;
