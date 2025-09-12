<template>
  <div class="notification-bell-container">
    <button 
      @click="toggleDropdown" 
      class="notification-bell"
      :class="{ 'has-unread': unreadCount > 0 }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="bell-icon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <span v-if="unreadCount > 0" class="notification-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <transition name="dropdown">
      <div v-if="showDropdown" class="notification-dropdown" ref="dropdown">
        <div class="dropdown-header">
          <h3>Notifications</h3>
          <div class="header-actions">
            <button @click="markAllAsRead" v-if="unreadCount > 0" class="mark-all-read">
              Mark all as read
            </button>
            <router-link to="/notifications" class="see-all">
              See all
            </router-link>
          </div>
        </div>

        <div class="notifications-list" v-if="recentNotifications.length > 0">
          <div 
            v-for="notification in recentNotifications" 
            :key="notification.id"
            class="notification-item"
            :class="{ 'unread': !notification.isRead }"
            @click="handleNotificationClick(notification)"
          >
            <div class="notification-icon">
              <component :is="getNotificationIcon(notification.type)" />
            </div>
            
            <div class="notification-content">
              <p class="notification-message">{{ notification.message }}</p>
              <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
            </div>
            
            <button 
              @click.stop="deleteNotification(notification.id)" 
              class="delete-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="delete-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div v-else class="no-notifications">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="empty-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>No new notifications</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useNotificationStore } from '@/stores/notificationStore';
import { useRouter } from 'vue-router';
import { formatDistanceToNow } from 'date-fns';

const notificationStore = useNotificationStore();
const router = useRouter();
const showDropdown = ref(false);
const dropdown = ref(null);

const unreadCount = computed(() => notificationStore.unreadCount);
const recentNotifications = computed(() => notificationStore.recentNotifications);

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    notificationStore.fetchRecentNotifications();
  }
};

const handleNotificationClick = async (notification) => {
  if (!notification.isRead) {
    await notificationStore.markAsRead(notification.id);
  }
  
  if (notification.actionUrl) {
    router.push(notification.actionUrl);
    showDropdown.value = false;
  }
};

const markAllAsRead = async () => {
  await notificationStore.markAllAsRead();
};

const deleteNotification = async (id) => {
  await notificationStore.deleteNotification(id);
};

const formatTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

const getNotificationIcon = (type) => {
  const icons = {
    like: 'HeartIcon',
    comment: 'ChatIcon',
    follow: 'UserAddIcon',
    mention: 'AtSymbolIcon',
    share: 'ShareIcon',
    friend_request: 'UsersIcon'
  };
  return icons[type] || 'BellIcon';
};

const handleClickOutside = (event) => {
  if (dropdown.value && !dropdown.value.contains(event.target) && 
      !event.target.closest('.notification-bell')) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  notificationStore.requestNotificationPermission();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.notification-bell-container {
  position: relative;
}

.notification-bell {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.notification-bell:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.bell-icon {
  width: 24px;
  height: 24px;
  color: #333;
}

.notification-bell.has-unread .bell-icon {
  animation: bell-ring 1s ease-in-out;
}

@keyframes bell-ring {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.notification-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  max-height: 480px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mark-all-read {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.mark-all-read:hover {
  text-decoration: underline;
}

.see-all {
  color: #6b7280;
  text-decoration: none;
  font-size: 14px;
}

.see-all:hover {
  color: #3b82f6;
}

.notifications-list {
  flex: 1;
  overflow-y: auto;
  max-height: 380px;
}

.notification-item {
  display: flex;
  align-items: start;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.notification-item:hover {
  background-color: #f9fafb;
}

.notification-item.unread {
  background-color: #eff6ff;
}

.notification-item.unread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: #3b82f6;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-message {
  margin: 0;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
  word-wrap: break-word;
}

.notification-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
  display: inline-block;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.notification-item:hover .delete-btn {
  opacity: 1;
}

.delete-icon {
  width: 16px;
  height: 16px;
  color: #9ca3af;
}

.delete-btn:hover .delete-icon {
  color: #ef4444;
}

.no-notifications {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: #d1d5db;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 640px) {
  .notification-dropdown {
    width: calc(100vw - 32px);
    right: -8px;
  }
}
</style>