import api from '../utils/axios';

const userService = {
  // Profile Management
  getProfile: async () => {
    try {
      const response = await api.get('/User/profile');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get profile',
      };
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/User/profile', profileData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.Error || error.response?.data || 'Failed to update profile',
      };
    }
  },

  updateProfileImage: async (imageUrl) => {
    try {
      const response = await api.patch('/User/profile/image', { imageUrl });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update profile image',
      };
    }
  },

  removeProfileImage: async () => {
    try {
      const response = await api.delete('/User/profile/image');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to remove profile image',
      };
    }
  },

  // Notification Preferences
  getNotificationPreferences: async () => {
    try {
      const response = await api.get('/Notification/preferences');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get notification preferences',
      };
    }
  },

  updateNotificationPreferences: async (preferences) => {
    try {
      const response = await api.put('/Notification/preferences', preferences);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update notification preferences',
      };
    }
  },

  // Account Security
  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await api.put('/User/change-password', {
        oldPassword,
        newPassword,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to change password',
      };
    }
  },

  // Privacy Settings
  getPrivacySettings: async () => {
    try {
      const response = await api.get('/User/privacy-settings');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get privacy settings',
      };
    }
  },

  updatePrivacySettings: async (settings) => {
    try {
      const response = await api.put('/User/privacy-settings', settings);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update privacy settings',
      };
    }
  },

  // Account Deletion
  deleteAccount: async () => {
    try {
      const response = await api.delete('/User/delete');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete account',
      };
    }
  },

  // Data Export
  exportUserData: async () => {
    try {
      const response = await api.get('/User/export-data', {
        responseType: 'blob'
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to export user data',
      };
    }
  },
};

export default userService;