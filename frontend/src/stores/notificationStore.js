import { defineStore } from 'pinia';
import axios from 'axios';
import * as signalR from '@microsoft/signalr';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    recentNotifications: [],
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      inAppNotifications: true,
      likeNotifications: true,
      commentNotifications: true,
      followNotifications: true,
      mentionNotifications: true,
      shareNotifications: true,
      friendRequestNotifications: true
    },
    connection: null,
    isConnected: false,
    isLoading: false,
    error: null,
    page: 1,
    pageSize: 20,
    hasMore: true
  }),

  getters: {
    sortedNotifications: (state) => {
      return [...state.notifications].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    },
    
    unreadNotifications: (state) => {
      return state.notifications.filter(n => !n.isRead);
    },
    
    groupedNotifications: (state) => {
      const groups = {};
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      state.notifications.forEach(notification => {
        const date = new Date(notification.createdAt);
        let key;
        
        if (date.toDateString() === today.toDateString()) {
          key = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
          key = 'Yesterday';
        } else {
          key = date.toLocaleDateString();
        }
        
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(notification);
      });
      
      return groups;
    }
  },

  actions: {
    async initializeSignalR(token) {
      try {
        if (this.connection) {
          await this.connection.stop();
        }

        this.connection = new signalR.HubConnectionBuilder()
          .withUrl(`${API_URL}/hubs/notification`, {
            accessTokenFactory: () => token
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Set up event handlers
        this.connection.on('ReceiveNotification', (notification) => {
          this.handleNewNotification(notification);
        });

        this.connection.on('UpdateUnreadCount', (count) => {
          this.unreadCount = count;
        });

        this.connection.on('ReceiveRecentNotifications', (notifications) => {
          this.recentNotifications = notifications;
        });

        this.connection.on('NotificationRead', (notificationId) => {
          const notification = this.notifications.find(n => n.id === notificationId);
          if (notification) {
            notification.isRead = true;
          }
        });

        this.connection.on('AllNotificationsRead', () => {
          this.notifications.forEach(n => {
            n.isRead = true;
            n.readAt = new Date().toISOString();
          });
          this.unreadCount = 0;
        });

        this.connection.on('IncrementUnreadCount', () => {
          this.unreadCount++;
        });

        // Start the connection
        await this.connection.start();
        this.isConnected = true;
        console.log('SignalR Connected for notifications');
      } catch (error) {
        console.error('SignalR Connection Error:', error);
        this.error = 'Failed to connect to notification service';
        this.isConnected = false;
      }
    },

    async disconnectSignalR() {
      if (this.connection) {
        try {
          await this.connection.stop();
          this.isConnected = false;
          console.log('SignalR Disconnected');
        } catch (error) {
          console.error('Error disconnecting SignalR:', error);
        }
      }
    },

    handleNewNotification(notification) {
      // Add to beginning of array
      this.notifications.unshift(notification);
      this.recentNotifications.unshift(notification);
      
      // Keep only last 5 recent notifications
      if (this.recentNotifications.length > 5) {
        this.recentNotifications.pop();
      }
      
      // Increment unread count if not read
      if (!notification.isRead) {
        this.unreadCount++;
      }
      
      // Show browser notification if permitted
      this.showBrowserNotification(notification);
      
      // Play sound if enabled
      this.playNotificationSound();
    },

    async fetchNotifications(unreadOnly = false, reset = false) {
      if (reset) {
        this.page = 1;
        this.hasMore = true;
        this.notifications = [];
      }
      
      if (!this.hasMore && !reset) return;
      
      this.isLoading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`${API_URL}/api/notification`, {
          params: {
            page: this.page,
            pageSize: this.pageSize,
            unreadOnly
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const { notifications, unreadCount } = response.data;
        
        if (reset) {
          this.notifications = notifications;
        } else {
          this.notifications.push(...notifications);
        }
        
        this.unreadCount = unreadCount;
        this.hasMore = notifications.length === this.pageSize;
        this.page++;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        this.error = 'Failed to load notifications';
      } finally {
        this.isLoading = false;
      }
    },

    async fetchRecentNotifications() {
      try {
        const response = await axios.get(`${API_URL}/api/notification/recent`, {
          params: { count: 5 },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        this.recentNotifications = response.data;
      } catch (error) {
        console.error('Error fetching recent notifications:', error);
      }
    },

    async markAsRead(notificationId) {
      try {
        await axios.put(
          `${API_URL}/api/notification/${notificationId}/read`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },

    async markAllAsRead() {
      try {
        await axios.put(
          `${API_URL}/api/notification/read-all`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        this.notifications.forEach(n => {
          n.isRead = true;
          n.readAt = new Date().toISOString();
        });
        this.unreadCount = 0;
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    },

    async deleteNotification(notificationId) {
      try {
        await axios.delete(`${API_URL}/api/notification/${notificationId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          const notification = this.notifications[index];
          if (!notification.isRead) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
          this.notifications.splice(index, 1);
        }
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    },

    async deleteAllNotifications() {
      try {
        await axios.delete(`${API_URL}/api/notification`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        this.notifications = [];
        this.recentNotifications = [];
        this.unreadCount = 0;
      } catch (error) {
        console.error('Error deleting all notifications:', error);
      }
    },

    async fetchPreferences() {
      try {
        const response = await axios.get(`${API_URL}/api/notification/preferences`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        this.preferences = response.data;
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    },

    async updatePreferences(preferences) {
      try {
        const response = await axios.put(
          `${API_URL}/api/notification/preferences`,
          preferences,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        this.preferences = response.data;
        return true;
      } catch (error) {
        console.error('Error updating preferences:', error);
        return false;
      }
    },

    showBrowserNotification(notification) {
      if (!('Notification' in window)) return;
      
      if (Notification.permission === 'granted' && this.preferences.pushNotifications) {
        const options = {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: `notification-${notification.id}`,
          requireInteraction: false,
          silent: false
        };
        
        const browserNotification = new Notification(
          notification.title || 'MemeStream Notification',
          options
        );
        
        browserNotification.onclick = () => {
          window.focus();
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
          browserNotification.close();
        };
        
        setTimeout(() => browserNotification.close(), 5000);
      }
    },

    async requestNotificationPermission() {
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
      }
      
      if (Notification.permission === 'granted') {
        return true;
      }
      
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      
      return false;
    },

    playNotificationSound() {
      if (this.preferences.inAppNotifications) {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Could not play notification sound:', e));
      }
    },

    clearAll() {
      this.notifications = [];
      this.recentNotifications = [];
      this.unreadCount = 0;
      this.page = 1;
      this.hasMore = true;
      this.error = null;
    }
  }
});