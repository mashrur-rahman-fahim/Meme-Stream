import api from "../utils/axios";

export const laughScoreService = {
  // Get user's LaughScore
  getUserScore: async (userId = null) => {
    try {
      const endpoint = userId ? `/LaughScore/user/${userId}` : `/LaughScore/user`;
      const response = await api.get(endpoint);
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
          "Failed to fetch laugh score",
      };
    }
  },

  // Get detailed LaughScore breakdown
  getDetailedScore: async (userId = null) => {
    try {
      const endpoint = userId ? `/LaughScore/user/${userId}/detailed` : `/LaughScore/user`;
      const response = await api.get(endpoint);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("LaughScore detailed fetch error:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch detailed laugh score",
      };
    }
  },

  // Get LaughScore leaderboard
  getLeaderboard: async (limit = 10) => {
    try {
      const response = await api.get(`/LaughScore/leaderboard?limit=${limit}`);
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
          "Failed to fetch leaderboard",
      };
    }
  },

  // Force recalculate user's LaughScore (admin/self only)
  recalculateScore: async (userId = null) => {
    try {
      const endpoint = userId ? `/LaughScore/recalculate/${userId}` : `/LaughScore/recalculate`;
      const response = await api.post(endpoint);
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
          "Failed to recalculate laugh score",
      };
    }
  },

};

export default laughScoreService;