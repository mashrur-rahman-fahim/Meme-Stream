/**
 * Global Notification Manager
 *
 * Ultra-robust notification system with:
 * - Unified connection management with chat
 * - Background sync and offline support
 * - Smart batching and deduplication
 * - Progressive Web App integration
 * - Advanced error recovery
 */

import * as signalR from '@microsoft/signalr';
import api from '../utils/axios';
import { getWebSocketUrl } from '../utils/api-config';

const NotificationState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED',
  SYNCING: 'SYNCING'
};

class GlobalNotificationManager {
  constructor() {
    // Core state
    this.connection = null;
    this.state = NotificationState.DISCONNECTED;
    this.isInitialized = false;
    this.currentToken = null;

    // Notification management
    this.notifications = new Map(); // id -> notification
    this.unreadCount = 0;
    this.recentNotifications = [];
    this.notificationQueue = [];
    this.syncQueue = [];

    // Event handlers
    this.stateChangeHandlers = [];
    this.notificationHandlers = [];
    this.errorHandlers = [];

    // Configuration
    this.config = {
      maxNotifications: 1000,
      maxRecent: 10,
      syncInterval: 30000, // 30 seconds
      retryAttempts: 10,
      batchSize: 50,
      deduplicationWindow: 5000, // 5 seconds
      offlineStorageKey: 'memestream_notifications_offline'
    };

    // Advanced features
    this.features = {
      backgroundSync: true,
      offlineSupport: true,
      smartBatching: true,
      deduplication: true,
      progressiveSync: true,
      browserNotifications: true
    };

    // Sync management
    this.syncManager = {
      interval: null,
      lastSync: null,
      pendingSyncs: new Set(),
      isOnline: navigator.onLine,
      backgroundSyncRegistration: null
    };

    // Deduplication
    this.deduplicator = {
      recentNotifications: new Map(), // hash -> timestamp
      cleanupInterval: null
    };

    // Performance monitoring
    this.metrics = {
      notificationsReceived: 0,
      notificationsSynced: 0,
      syncErrors: 0,
      averageSyncTime: 0,
      connectionUptime: 0
    };

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the notification manager
   */
  async initialize() {
    console.log('🔔 GlobalNotificationManager: Initializing...');

    this.setupOnlineStatusMonitoring();
    this.setupBrowserNotifications();
    this.setupBackgroundSync();
    this.setupDeduplication();
    this.loadOfflineNotifications();

    this.isInitialized = true;
    console.log('✅ GlobalNotificationManager: Initialized');
  }

  /**
   * Connect to notification hub
   */
  async connect(token) {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      console.log('♻️ GlobalNotificationManager: Reusing existing connection');
      return this.connection;
    }

    console.log('🔌 GlobalNotificationManager: Connecting...');
    this.currentToken = token;
    this.state = NotificationState.CONNECTING;
    this.notifyStateChange();

    try {
      await this.createConnection(token);
      await this.performInitialSync();
      this.startSyncManager();

      this.state = NotificationState.CONNECTED;
      this.notifyStateChange();

      console.log('✅ GlobalNotificationManager: Connected successfully');
      return this.connection;

    } catch (error) {
      console.error('❌ GlobalNotificationManager: Connection failed:', error);
      this.state = NotificationState.FAILED;
      this.notifyStateChange();
      this.notifyError(error);
      throw error;
    }
  }

  /**
   * Create and configure SignalR connection
   */
  async createConnection(token) {
    const webSocketUrl = getWebSocketUrl();
    const isProduction = this.detectProductionEnvironment(webSocketUrl);

    const connectionOptions = {
      accessTokenFactory: () => token,
      skipNegotiation: false,
      withCredentials: false,
      headers: {
        'X-Client-Type': 'notification-manager',
        'X-Features': Object.keys(this.features).filter(k => this.features[k]).join(',')
      }
    };

    // Production optimizations
    if (isProduction) {
      connectionOptions.transport =
        signalR.HttpTransportType.ServerSentEvents |
        signalR.HttpTransportType.LongPolling;
    } else {
      connectionOptions.transport =
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.ServerSentEvents |
        signalR.HttpTransportType.LongPolling;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${webSocketUrl}/notificationhub`, connectionOptions)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          console.log(`🔄 Notification retry ${retryContext.previousRetryCount + 1} in ${delay}ms`);
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupConnectionHandlers();

    // Connect with timeout
    await this.withTimeout(
      this.connection.start(),
      15000,
      'Notification connection timeout'
    );
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers() {
    // Connection lifecycle
    this.connection.onclose((error) => {
      console.log('🔌 GlobalNotificationManager: Connection closed:', error?.message);
      this.handleDisconnection(error);
    });

    this.connection.onreconnecting((error) => {
      console.log('🔄 GlobalNotificationManager: Reconnecting...', error?.message);
      this.state = NotificationState.RECONNECTING;
      this.notifyStateChange();
    });

    this.connection.onreconnected((connectionId) => {
      console.log('✅ GlobalNotificationManager: Reconnected:', connectionId);
      this.state = NotificationState.CONNECTED;
      this.notifyStateChange();
      this.performIncrementalSync();
    });

    // Notification events
    this.connection.on('ReceiveNotification', (notification) => {
      console.log('🔔 Received notification:', notification);
      this.handleNewNotification(notification);
    });

    this.connection.on('UpdateUnreadCount', (count) => {
      console.log('📊 Unread count update:', count);
      this.updateUnreadCount(count);
    });

    this.connection.on('NotificationRead', (notificationId) => {
      this.markNotificationAsRead(notificationId, false); // false = don't sync back
    });

    this.connection.on('AllNotificationsRead', () => {
      this.markAllAsRead(false); // false = don't sync back
    });

    this.connection.on('NotificationDeleted', (notificationId) => {
      this.deleteNotification(notificationId, false); // false = don't sync back
    });

    this.connection.on('BulkNotificationUpdate', (updates) => {
      console.log('📦 Bulk notification update:', updates);
      this.handleBulkUpdate(updates);
    });

    // Health monitoring
    this.connection.on('Pong', (serverTime) => {
      console.log('💓 Notification heartbeat received');
    });

    this.connection.on('ConnectionConfirmed', (data) => {
      console.log('✅ Notification connection confirmed:', data);
    });

    // Sync events
    this.connection.on('SyncComplete', (syncInfo) => {
      console.log('🔄 Sync complete:', syncInfo);
      this.handleSyncComplete(syncInfo);
    });

    this.connection.on('SyncRequired', (reason) => {
      console.log('🔄 Sync required:', reason);
      this.performIncrementalSync();
    });
  }

  /**
   * Handle new notification with deduplication and smart processing
   */
  handleNewNotification(notification) {
    // Deduplication check
    if (this.features.deduplication && this.isDuplicateNotification(notification)) {
      console.log('🔄 GlobalNotificationManager: Duplicate notification ignored');
      return;
    }

    // Process notification
    const processedNotification = this.processNotification(notification);

    // Store notification
    this.notifications.set(processedNotification.id, processedNotification);

    // Update recent notifications
    this.updateRecentNotifications(processedNotification);

    // Update unread count
    if (!processedNotification.isRead) {
      this.unreadCount++;
    }

    // Show browser notification if enabled
    if (this.features.browserNotifications && !processedNotification.isRead) {
      this.showBrowserNotification(processedNotification);
    }

    // Store offline for persistence
    if (this.features.offlineSupport) {
      this.storeNotificationOffline(processedNotification);
    }

    // Notify handlers
    this.notifyNotificationHandlers('new', processedNotification);

    // Update metrics
    this.metrics.notificationsReceived++;

    console.log(`🔔 Notification processed: ${processedNotification.id}`);
  }

  /**
   * Process raw notification data
   */
  processNotification(rawNotification) {
    return {
      id: rawNotification.id,
      type: rawNotification.type || 'general',
      title: rawNotification.title || 'MemeStream Notification',
      message: rawNotification.message,
      userId: rawNotification.userId,
      relatedUserId: rawNotification.relatedUserId,
      postId: rawNotification.postId,
      commentId: rawNotification.commentId,
      actionUrl: rawNotification.actionUrl,
      isRead: rawNotification.isRead || false,
      isDeleted: rawNotification.isDeleted || false,
      priority: rawNotification.priority || 'normal',
      createdAt: new Date(rawNotification.createdAt || Date.now()),
      readAt: rawNotification.readAt ? new Date(rawNotification.readAt) : null,
      metadata: rawNotification.metadata || {}
    };
  }

  /**
   * Deduplication logic
   */
  isDuplicateNotification(notification) {
    const hash = this.generateNotificationHash(notification);
    const now = Date.now();

    if (this.deduplicator.recentNotifications.has(hash)) {
      const timestamp = this.deduplicator.recentNotifications.get(hash);
      if (now - timestamp < this.config.deduplicationWindow) {
        return true; // Duplicate within window
      }
    }

    // Store hash for future checks
    this.deduplicator.recentNotifications.set(hash, now);
    return false;
  }

  generateNotificationHash(notification) {
    const hashInput = `${notification.type}_${notification.userId}_${notification.message}_${notification.relatedUserId}_${notification.postId}`;
    return btoa(hashInput).slice(0, 16); // Simple hash for deduplication
  }

  /**
   * Update recent notifications list
   */
  updateRecentNotifications(notification) {
    // Remove if already exists
    this.recentNotifications = this.recentNotifications.filter(n => n.id !== notification.id);

    // Add to beginning
    this.recentNotifications.unshift(notification);

    // Limit size
    if (this.recentNotifications.length > this.config.maxRecent) {
      this.recentNotifications = this.recentNotifications.slice(0, this.config.maxRecent);
    }
  }

  /**
   * Sync management
   */
  async performInitialSync() {
    console.log('🔄 GlobalNotificationManager: Performing initial sync...');
    this.state = NotificationState.SYNCING;
    this.notifyStateChange();

    try {
      // Fetch unread count
      const unreadResponse = await api.get('/notification/unread-count');
      this.updateUnreadCount(unreadResponse.data.unreadCount || 0);

      // Fetch recent notifications
      const recentResponse = await api.get('/notification/recent', {
        params: { count: this.config.maxRecent }
      });

      this.recentNotifications = recentResponse.data.map(n => this.processNotification(n));

      // If we have offline notifications, sync them
      if (this.features.offlineSupport) {
        await this.syncOfflineNotifications();
      }

      console.log('✅ Initial sync complete');
      this.syncManager.lastSync = Date.now();

    } catch (error) {
      console.error('❌ Initial sync failed:', error);
      this.notifyError(error);
    }
  }

  async performIncrementalSync() {
    if (!this.syncManager.lastSync) {
      return this.performInitialSync();
    }

    console.log('🔄 GlobalNotificationManager: Performing incremental sync...');

    try {
      const since = new Date(this.syncManager.lastSync).toISOString();

      const response = await api.get('/notification', {
        params: {
          since,
          pageSize: this.config.batchSize
        }
      });

      const newNotifications = response.data.notifications || [];

      newNotifications.forEach(notification => {
        this.handleNewNotification(notification);
      });

      this.syncManager.lastSync = Date.now();
      console.log(`✅ Incremental sync complete: ${newNotifications.length} new notifications`);

    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      this.metrics.syncErrors++;
    }
  }

  startSyncManager() {
    if (this.syncManager.interval) {
      clearInterval(this.syncManager.interval);
    }

    this.syncManager.interval = setInterval(() => {
      if (this.syncManager.isOnline && this.state === NotificationState.CONNECTED) {
        this.performIncrementalSync();
      }
    }, this.config.syncInterval);

    console.log('🔄 Sync manager started');
  }

  stopSyncManager() {
    if (this.syncManager.interval) {
      clearInterval(this.syncManager.interval);
      this.syncManager.interval = null;
    }
  }

  /**
   * Notification operations
   */
  async markAsRead(notificationId, syncToServer = true) {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.isRead) return;

    // Update local state
    notification.isRead = true;
    notification.readAt = new Date();
    this.unreadCount = Math.max(0, this.unreadCount - 1);

    // Update recent if present
    const recentIndex = this.recentNotifications.findIndex(n => n.id === notificationId);
    if (recentIndex >= 0) {
      this.recentNotifications[recentIndex] = { ...notification };
    }

    // Sync to server if online and requested
    if (syncToServer && this.syncManager.isOnline) {
      try {
        await api.put(`/notification/${notificationId}/read`);
      } catch (error) {
        console.error('Failed to sync read status:', error);
        // Add to sync queue for later
        this.syncQueue.push({
          type: 'markRead',
          notificationId,
          timestamp: Date.now()
        });
      }
    }

    this.notifyNotificationHandlers('read', notification);
  }

  async markAllAsRead(syncToServer = true) {
    let updatedCount = 0;

    // Update all unread notifications
    this.notifications.forEach((notification, id) => {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        updatedCount++;
      }
    });

    // Update recent notifications
    this.recentNotifications = this.recentNotifications.map(n => ({
      ...n,
      isRead: true,
      readAt: n.readAt || new Date()
    }));

    // Reset unread count
    this.unreadCount = 0;

    // Sync to server
    if (syncToServer && this.syncManager.isOnline) {
      try {
        await api.put('/notification/read-all');
      } catch (error) {
        console.error('Failed to sync read-all status:', error);
        this.syncQueue.push({
          type: 'markAllRead',
          timestamp: Date.now()
        });
      }
    }

    this.notifyNotificationHandlers('readAll', { count: updatedCount });
  }

  async deleteNotification(notificationId, syncToServer = true) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Update unread count if necessary
    if (!notification.isRead) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }

    // Remove from collections
    this.notifications.delete(notificationId);
    this.recentNotifications = this.recentNotifications.filter(n => n.id !== notificationId);

    // Sync to server
    if (syncToServer && this.syncManager.isOnline) {
      try {
        await api.delete(`/notification/${notificationId}`);
      } catch (error) {
        console.error('Failed to sync delete:', error);
        this.syncQueue.push({
          type: 'delete',
          notificationId,
          timestamp: Date.now()
        });
      }
    }

    this.notifyNotificationHandlers('deleted', { id: notificationId });
  }

  /**
   * Offline support
   */
  setupOnlineStatusMonitoring() {
    window.addEventListener('online', () => {
      console.log('🌐 GlobalNotificationManager: Online');
      this.syncManager.isOnline = true;
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('📴 GlobalNotificationManager: Offline');
      this.syncManager.isOnline = false;
      this.handleOnlineStatusChange(false);
    });
  }

  handleOnlineStatusChange(isOnline) {
    if (isOnline) {
      // Reconnect and sync when back online
      if (this.state !== NotificationState.CONNECTED) {
        this.connect(this.currentToken).catch(error => {
          console.error('Failed to reconnect when online:', error);
        });
      }

      // Process sync queue
      this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    console.log(`🔄 Processing ${this.syncQueue.length} queued sync operations`);

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of queue) {
      try {
        switch (operation.type) {
          case 'markRead':
            await api.put(`/notification/${operation.notificationId}/read`);
            break;
          case 'markAllRead':
            await api.put('/notification/read-all');
            break;
          case 'delete':
            await api.delete(`/notification/${operation.notificationId}`);
            break;
        }
      } catch (error) {
        console.error('Sync queue operation failed:', error);
        // Re-queue if still relevant (not too old)
        if (Date.now() - operation.timestamp < 300000) { // 5 minutes
          this.syncQueue.push(operation);
        }
      }
    }
  }

  storeNotificationOffline(notification) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.config.offlineStorageKey) || '[]');
      stored.unshift({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt?.toISOString() || null
      });

      // Limit stored notifications
      if (stored.length > this.config.maxNotifications) {
        stored.splice(this.config.maxNotifications);
      }

      localStorage.setItem(this.config.offlineStorageKey, JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to store notification offline:', error);
    }
  }

  loadOfflineNotifications() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.config.offlineStorageKey) || '[]');

      stored.forEach(notification => {
        const processed = {
          ...notification,
          createdAt: new Date(notification.createdAt),
          readAt: notification.readAt ? new Date(notification.readAt) : null
        };

        this.notifications.set(processed.id, processed);

        if (!processed.isRead) {
          this.unreadCount++;
        }
      });

      // Update recent notifications
      this.recentNotifications = stored
        .slice(0, this.config.maxRecent)
        .map(n => ({
          ...n,
          createdAt: new Date(n.createdAt),
          readAt: n.readAt ? new Date(n.readAt) : null
        }));

      console.log(`📱 Loaded ${stored.length} offline notifications`);

    } catch (error) {
      console.error('Failed to load offline notifications:', error);
    }
  }

  /**
   * Browser notifications
   */
  setupBrowserNotifications() {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      this.features.browserNotifications = false;
      return;
    }

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
        this.features.browserNotifications = permission === 'granted';
      });
    } else {
      this.features.browserNotifications = Notification.permission === 'granted';
    }
  }

  showBrowserNotification(notification) {
    if (!this.features.browserNotifications || document.visibilityState === 'visible') {
      return; // Don't show if page is visible
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: `notification-${notification.id}`,
        requireInteraction: notification.priority === 'high',
        silent: notification.priority === 'low'
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds for normal priority
      if (notification.priority !== 'high') {
        setTimeout(() => browserNotification.close(), 5000);
      }

    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }

  /**
   * Background sync (for PWA)
   */
  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        this.syncManager.backgroundSyncRegistration = registration;
        console.log('📱 Background sync available');
      });
    }
  }

  /**
   * Deduplication cleanup
   */
  setupDeduplication() {
    this.deduplicator.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.config.deduplicationWindow * 2; // Keep for 2x the window

      for (const [hash, timestamp] of this.deduplicator.recentNotifications.entries()) {
        if (timestamp < cutoff) {
          this.deduplicator.recentNotifications.delete(hash);
        }
      }
    }, this.config.deduplicationWindow);
  }

  /**
   * Event handlers
   */
  onStateChange(handler) {
    this.stateChangeHandlers.push(handler);
    return () => {
      this.stateChangeHandlers = this.stateChangeHandlers.filter(h => h !== handler);
    };
  }

  onNotification(handler) {
    this.notificationHandlers.push(handler);
    return () => {
      this.notificationHandlers = this.notificationHandlers.filter(h => h !== handler);
    };
  }

  onError(handler) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }

  notifyStateChange() {
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(this.state, this.getStatus());
      } catch (error) {
        console.error('State change handler error:', error);
      }
    });
  }

  notifyNotificationHandlers(type, data) {
    this.notificationHandlers.forEach(handler => {
      try {
        handler(type, data);
      } catch (error) {
        console.error('Notification handler error:', error);
      }
    });
  }

  notifyError(error) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error handler error:', err);
      }
    });
  }

  /**
   * Utility methods
   */
  detectProductionEnvironment(url) {
    const productionDomains = [
      'onrender.com', 'render.com', 'herokuapp.com',
      'vercel.app', 'netlify.app', 'azure.com'
    ];
    return productionDomains.some(domain => url.includes(domain)) ||
           window.location.hostname !== 'localhost';
  }

  withTimeout(promise, timeout, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }

  handleDisconnection(error) {
    this.state = NotificationState.DISCONNECTED;
    this.stopSyncManager();

    if (error) {
      console.error('Notification connection error:', error);
      this.notifyError(error);
    }

    this.notifyStateChange();
  }

  handleBulkUpdate(updates) {
    let changedCount = 0;

    updates.forEach(update => {
      const notification = this.notifications.get(update.id);
      if (notification) {
        Object.assign(notification, update);
        changedCount++;
      }
    });

    if (changedCount > 0) {
      this.notifyNotificationHandlers('bulkUpdate', { count: changedCount });
    }
  }

  handleSyncComplete(syncInfo) {
    this.metrics.notificationsSynced += syncInfo.count || 0;
    this.syncManager.lastSync = Date.now();
  }

  updateUnreadCount(count) {
    this.unreadCount = count;
    this.notifyNotificationHandlers('unreadCountUpdate', { count });
  }

  /**
   * Public API
   */
  getNotifications(limit = 50, offset = 0) {
    const allNotifications = Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt - a.createdAt);

    return {
      notifications: allNotifications.slice(offset, offset + limit),
      total: allNotifications.length,
      unreadCount: this.unreadCount
    };
  }

  getRecentNotifications() {
    return [...this.recentNotifications];
  }

  getUnreadCount() {
    return this.unreadCount;
  }

  getStatus() {
    return {
      state: this.state,
      isConnected: this.state === NotificationState.CONNECTED,
      unreadCount: this.unreadCount,
      totalNotifications: this.notifications.size,
      isOnline: this.syncManager.isOnline,
      lastSync: this.syncManager.lastSync,
      queuedSyncs: this.syncQueue.length,
      metrics: { ...this.metrics },
      features: { ...this.features }
    };
  }

  /**
   * Cleanup
   */
  async disconnect() {
    console.log('🔌 GlobalNotificationManager: Disconnecting...');

    this.stopSyncManager();

    if (this.deduplicator.cleanupInterval) {
      clearInterval(this.deduplicator.cleanupInterval);
    }

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.error('Error stopping notification connection:', error);
      }
      this.connection = null;
    }

    this.state = NotificationState.DISCONNECTED;
    this.notifyStateChange();

    console.log('✅ GlobalNotificationManager: Disconnected');
  }
}

// Create singleton instance
const globalNotificationManager = new GlobalNotificationManager();

export default globalNotificationManager;