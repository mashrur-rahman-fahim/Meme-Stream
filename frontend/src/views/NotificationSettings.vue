<template>
  <div class="notification-settings">
    <div class="settings-header">
      <h1>Notification Settings</h1>
      <p>Manage how you receive notifications from MemeStream</p>
    </div>

    <div class="settings-container" v-if="!loading">
      <div class="settings-section">
        <h2>Notification Channels</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <h3>Email Notifications</h3>
            <p>Receive notifications via email</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.emailNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>Push Notifications</h3>
            <p>Receive browser push notifications</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.pushNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>In-App Notifications</h3>
            <p>Show notifications within the app</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.inAppNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h2>Notification Types</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <h3>Likes</h3>
            <p>When someone likes your post</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.likeNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>Comments</h3>
            <p>When someone comments on your post</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.commentNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>Follows</h3>
            <p>When someone follows you</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.followNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>Mentions</h3>
            <p>When someone mentions you</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.mentionNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>Shares</h3>
            <p>When someone shares your post</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.shareNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>Friend Requests</h3>
            <p>When someone sends you a friend request</p>
          </div>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="preferences.friendRequestNotifications"
              @change="updatePreferences"
            >
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h2>Quick Actions</h2>
        
        <div class="quick-actions">
          <button @click="enableAll" class="btn btn-primary">
            Enable All
          </button>
          <button @click="disableAll" class="btn btn-secondary">
            Disable All
          </button>
          <button @click="testNotification" class="btn btn-info">
            Send Test Notification
          </button>
        </div>
      </div>
    </div>

    <div v-else class="loading-container">
      <div class="spinner"></div>
      <p>Loading preferences...</p>
    </div>

    <div v-if="saveStatus" class="save-status" :class="saveStatus">
      {{ saveStatus === 'success' ? 'Settings saved!' : 'Failed to save settings' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useNotificationStore } from '@/stores/notificationStore';
import axios from 'axios';

const notificationStore = useNotificationStore();
const loading = ref(true);
const saveStatus = ref('');
const preferences = reactive({
  emailNotifications: true,
  pushNotifications: true,
  inAppNotifications: true,
  likeNotifications: true,
  commentNotifications: true,
  followNotifications: true,
  mentionNotifications: true,
  shareNotifications: true,
  friendRequestNotifications: true
});

const updatePreferences = async () => {
  const success = await notificationStore.updatePreferences(preferences);
  
  saveStatus.value = success ? 'success' : 'error';
  setTimeout(() => {
    saveStatus.value = '';
  }, 3000);
};

const enableAll = () => {
  Object.keys(preferences).forEach(key => {
    preferences[key] = true;
  });
  updatePreferences();
};

const disableAll = () => {
  Object.keys(preferences).forEach(key => {
    preferences[key] = false;
  });
  updatePreferences();
};

const testNotification = async () => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    await axios.post(
      `${API_URL}/api/notification/test`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    saveStatus.value = 'success';
    setTimeout(() => {
      saveStatus.value = '';
    }, 3000);
  } catch (error) {
    console.error('Error sending test notification:', error);
    saveStatus.value = 'error';
    setTimeout(() => {
      saveStatus.value = '';
    }, 3000);
  }
};

onMounted(async () => {
  await notificationStore.fetchPreferences();
  Object.assign(preferences, notificationStore.preferences);
  loading.value = false;
});
</script>

<style scoped>
.notification-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.settings-header {
  margin-bottom: 30px;
}

.settings-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.settings-header p {
  color: #6b7280;
  font-size: 16px;
}

.settings-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.settings-section {
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-section h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f3f4f6;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info h3 {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.setting-info p {
  font-size: 14px;
  color: #6b7280;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #3b82f6;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.quick-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.btn-info {
  background-color: #10b981;
  color: white;
}

.btn-info:hover {
  background-color: #059669;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: white;
  border-radius: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.save-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

.save-status.success {
  background-color: #10b981;
  color: white;
}

.save-status.error {
  background-color: #ef4444;
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .notification-settings {
    padding: 16px;
  }
  
  .settings-section {
    padding: 16px;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>