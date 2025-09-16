/**
 * Centralized Connection Manager Service
 *
 * This service orchestrates all WebSocket connections when user enters the website:
 * - Chat connections via GlobalSignalRManager
 * - Notification connections via GlobalNotificationManager
 * - Automatic initialization on user authentication
 * - Connection health monitoring and coordination
 * - Unified connection state management
 */

import globalSignalRManager from './GlobalSignalRManager';
import globalNotificationManager from './GlobalNotificationManager';

const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  INITIALIZING: 'INITIALIZING',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  FAILED: 'FAILED',
  RECONNECTING: 'RECONNECTING'
};

class ConnectionManagerService {
  constructor() {
    // Overall connection state
    this.state = ConnectionState.DISCONNECTED;
    this.isInitialized = false;
    this.currentToken = null;
    this.currentUserId = null;

    // Connection status tracking
    this.chatConnected = false;
    this.notificationConnected = false;
    this.connectionPromise = null;

    // Event handlers
    this.stateChangeHandlers = [];
    this.errorHandlers = [];
    this.connectionHandlers = [];

    // Configuration
    this.config = {
      autoConnect: true,
      enableNotifications: true,
      enableChat: true,
      initializeOnAuth: true,
      reconnectOnTokenChange: true,
      healthCheckInterval: 30000 // 30 seconds
    };

    // Health monitoring
    this.healthInterval = null;
    this.lastHealthCheck = null;
    this.connectionMetrics = {
      totalConnections: 0,
      failedConnections: 0,
      lastConnectionTime: null,
      averageConnectionTime: 0
    };

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);

    // Setup automatic connection management
    this.setupTokenWatcher();
    this.setupConnectionMonitoring();
  }

  /**
   * Initialize all connections when user is authenticated
   */
  async initialize(token, userId = null, options = {}) {
    if (this.isInitialized && this.currentToken === token) {
      console.log('🔄 ConnectionManager: Already initialized with same token');
      return this.getConnectionPromise();
    }

    console.log('🚀 ConnectionManager: Initializing all connections...');

    // Update configuration
    this.config = { ...this.config, ...options };
    this.currentToken = token;
    this.currentUserId = userId;
    this.isInitialized = true;

    // Set initial state
    this.setState(ConnectionState.INITIALIZING);

    try {
      // Initialize connections based on configuration
      const initPromises = [];

      if (this.config.enableChat) {
        console.log('🔌 ConnectionManager: Initializing chat connection...');
        initPromises.push(
          globalSignalRManager.initialize(token, {
            preWarm: true,
            enableCircuitBreaker: true,
            enableHealthMonitoring: true,
            enableMessageQueuing: true
          })
        );
      }

      if (this.config.enableNotifications) {
        console.log('🔔 ConnectionManager: Initializing notification connection...');
        initPromises.push(
          globalNotificationManager.initialize(token, {
            enableBatching: true,
            enableOfflineSupport: true,
            syncOnConnect: true
          })
        );
      }

      // Wait for all connections to initialize
      this.connectionPromise = Promise.allSettled(initPromises);
      const results = await this.connectionPromise;

      // Process results
      let hasFailures = false;
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          hasFailures = true;
          const service = index === 0 ? 'Chat' : 'Notification';
          console.error(`❌ ConnectionManager: ${service} initialization failed:`, result.reason);
          this.notifyError(new Error(`${service} connection failed: ${result.reason.message}`));
        } else {
          const service = index === 0 ? 'Chat' : 'Notification';
          console.log(`✅ ConnectionManager: ${service} initialized successfully`);
        }
      });

      // Update connection states
      this.updateConnectionStates();

      // Start health monitoring
      this.startHealthMonitoring();

      // Update metrics
      this.connectionMetrics.totalConnections++;
      this.connectionMetrics.lastConnectionTime = Date.now();

      if (hasFailures && results.every(r => r.status === 'rejected')) {
        this.setState(ConnectionState.FAILED);
        throw new Error('All connections failed to initialize');
      } else if (hasFailures) {
        this.setState(ConnectionState.CONNECTED); // Partial success
        console.warn('⚠️ ConnectionManager: Initialized with partial failures');
      } else {
        this.setState(ConnectionState.CONNECTED);
        console.log('✅ ConnectionManager: All connections initialized successfully');
      }

      return {
        chatConnection: this.config.enableChat ? globalSignalRManager.getConnectionPromise() : null,
        notificationManager: this.config.enableNotifications ? globalNotificationManager : null,
        state: this.state
      };

    } catch (error) {
      this.connectionMetrics.failedConnections++;
      this.setState(ConnectionState.FAILED);
      console.error('❌ ConnectionManager: Initialization failed:', error);
      this.notifyError(error);
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Connect all services (legacy method for backward compatibility)
   */
  async connect(token, userId = null) {
    return this.initialize(token, userId);
  }

  /**
   * Update individual connection states
   */
  updateConnectionStates() {
    if (this.config.enableChat) {
      const chatStatus = globalSignalRManager.getStatus();
      this.chatConnected = chatStatus.isReady;
    }

    if (this.config.enableNotifications) {
      const notificationStatus = globalNotificationManager.getStatus();
      this.notificationConnected = notificationStatus.isConnected;
    }

    // Update overall state based on individual connections
    if (this.chatConnected || this.notificationConnected) {
      if (this.state !== ConnectionState.CONNECTED) {
        this.setState(ConnectionState.CONNECTED);
      }
    }
  }

  /**
   * Start comprehensive health monitoring
   */
  startHealthMonitoring() {
    this.stopHealthMonitoring();

    this.healthInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log('💓 ConnectionManager: Health monitoring started');
  }

  /**
   * Perform health check on all connections
   */
  performHealthCheck() {
    this.lastHealthCheck = Date.now();

    try {
      const chatStatus = this.config.enableChat ? globalSignalRManager.getStatus() : { isReady: true };
      const notificationStatus = this.config.enableNotifications ? globalNotificationManager.getStatus() : { isConnected: true };

      const previousChatState = this.chatConnected;
      const previousNotificationState = this.notificationConnected;

      this.chatConnected = chatStatus.isReady;
      this.notificationConnected = notificationStatus.isConnected;

      // Detect state changes
      if (previousChatState !== this.chatConnected) {
        console.log(`🔄 ConnectionManager: Chat connection ${this.chatConnected ? 'restored' : 'lost'}`);
        this.notifyConnectionChange('chat', this.chatConnected);
      }

      if (previousNotificationState !== this.notificationConnected) {
        console.log(`🔄 ConnectionManager: Notification connection ${this.notificationConnected ? 'restored' : 'lost'}`);
        this.notifyConnectionChange('notification', this.notificationConnected);
      }

      // Update overall state
      const previousState = this.state;
      if (!this.chatConnected && !this.notificationConnected) {
        this.setState(ConnectionState.DISCONNECTED);
      } else if (this.state !== ConnectionState.CONNECTED) {
        this.setState(ConnectionState.CONNECTED);
      }

      // Log health status periodically
      if (Date.now() % (5 * 60 * 1000) < this.config.healthCheckInterval) { // Every 5 minutes
        this.logHealthStatus();
      }

    } catch (error) {
      console.error('❌ ConnectionManager: Health check failed:', error);
    }
  }

  /**
   * Log comprehensive health status
   */
  logHealthStatus() {
    const status = this.getComprehensiveStatus();
    console.log('💓 ConnectionManager Health Report:', {
      overallState: status.state,
      chatConnected: status.chat.connected,
      notificationConnected: status.notifications.connected,
      uptime: status.uptime,
      metrics: status.metrics
    });
  }

  /**
   * Setup token change watcher for automatic reconnection
   */
  setupTokenWatcher() {
    // Watch for token changes in localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      if (key === 'token' && this.config.reconnectOnTokenChange) {
        if (value !== this.currentToken) {
          console.log('🔑 ConnectionManager: Token changed, reinitializing connections...');
          this.handleTokenChange(value);
        }
      }
      originalSetItem.call(localStorage, key, value);
    };

    // Also watch for token removal
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = (key) => {
      if (key === 'token' && this.currentToken) {
        console.log('🔑 ConnectionManager: Token removed, disconnecting...');
        this.handleTokenChange(null);
      }
      originalRemoveItem.call(localStorage, key);
    };
  }

  /**
   * Handle token changes with graceful reconnection
   */
  async handleTokenChange(newToken) {
    if (!newToken) {
      // Token removed - disconnect all
      await this.disconnect();
      return;
    }

    if (newToken === this.currentToken) {
      return; // No change
    }

    try {
      // Gracefully disconnect existing connections
      await this.disconnect();

      // Wait a brief moment for cleanup
      await this.sleep(500);

      // Initialize with new token
      await this.initialize(newToken);

      console.log('✅ ConnectionManager: Successfully reconnected with new token');
    } catch (error) {
      console.error('❌ ConnectionManager: Token change reconnection failed:', error);
      this.notifyError(error);
    }
  }

  /**
   * Setup connection monitoring and coordination
   */
  setupConnectionMonitoring() {
    // Monitor chat connection state changes
    if (globalSignalRManager.addConnectionStateHandler) {
      globalSignalRManager.addConnectionStateHandler((state, data) => {
        console.log('🔄 ConnectionManager: Chat state changed to:', state);
        this.updateConnectionStates();
      });
    }

    // Monitor notification connection state changes
    if (globalNotificationManager.addStateChangeHandler) {
      globalNotificationManager.addStateChangeHandler((state, data) => {
        console.log('🔄 ConnectionManager: Notification state changed to:', state);
        this.updateConnectionStates();
      });
    }
  }

  /**
   * Disconnect all connections gracefully
   */
  async disconnect() {
    console.log('🔌 ConnectionManager: Disconnecting all connections...');

    this.setState(ConnectionState.DISCONNECTED);
    this.stopHealthMonitoring();

    const disconnectPromises = [];

    if (this.config.enableChat && globalSignalRManager.isConnectionReady()) {
      disconnectPromises.push(
        globalSignalRManager.disconnect().catch(error => {
          console.error('Error disconnecting chat:', error);
        })
      );
    }

    if (this.config.enableNotifications && globalNotificationManager.isConnected()) {
      disconnectPromises.push(
        globalNotificationManager.disconnect().catch(error => {
          console.error('Error disconnecting notifications:', error);
        })
      );
    }

    await Promise.allSettled(disconnectPromises);

    // Reset state
    this.isInitialized = false;
    this.currentToken = null;
    this.currentUserId = null;
    this.chatConnected = false;
    this.notificationConnected = false;

    console.log('✅ ConnectionManager: All connections disconnected');
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }

  /**
   * Get comprehensive status of all connections
   */
  getComprehensiveStatus() {
    const chatStatus = this.config.enableChat ? globalSignalRManager.getStatus() : { isReady: false, metrics: {} };
    const notificationStatus = this.config.enableNotifications ? globalNotificationManager.getStatus() : { isConnected: false };

    return {
      state: this.state,
      isInitialized: this.isInitialized,
      uptime: this.connectionMetrics.lastConnectionTime ? Date.now() - this.connectionMetrics.lastConnectionTime : 0,
      chat: {
        enabled: this.config.enableChat,
        connected: this.chatConnected,
        status: chatStatus,
        manager: globalSignalRManager
      },
      notifications: {
        enabled: this.config.enableNotifications,
        connected: this.notificationConnected,
        status: notificationStatus,
        manager: globalNotificationManager
      },
      metrics: this.connectionMetrics,
      lastHealthCheck: this.lastHealthCheck
    };
  }

  /**
   * Get connection promise for backward compatibility
   */
  getConnectionPromise() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isInitialized && this.state === ConnectionState.CONNECTED) {
      return Promise.resolve({
        chatConnection: this.config.enableChat ? globalSignalRManager.getConnectionPromise() : null,
        notificationManager: this.config.enableNotifications ? globalNotificationManager : null,
        state: this.state
      });
    }

    if (this.currentToken) {
      return this.initialize(this.currentToken, this.currentUserId);
    }

    return Promise.reject(new Error('No token available for connection'));
  }

  /**
   * Event handler management
   */
  addStateChangeHandler(handler) {
    const id = this.generateId();
    this.stateChangeHandlers.push({ id, handler });
    return id;
  }

  removeStateChangeHandler(id) {
    this.stateChangeHandlers = this.stateChangeHandlers.filter(h => h.id !== id);
  }

  addErrorHandler(handler) {
    const id = this.generateId();
    this.errorHandlers.push({ id, handler });
    return id;
  }

  removeErrorHandler(id) {
    this.errorHandlers = this.errorHandlers.filter(h => h.id !== id);
  }

  addConnectionChangeHandler(handler) {
    const id = this.generateId();
    this.connectionHandlers.push({ id, handler });
    return id;
  }

  removeConnectionChangeHandler(id) {
    this.connectionHandlers = this.connectionHandlers.filter(h => h.id !== id);
  }

  /**
   * Notification methods
   */
  setState(newState) {
    if (this.state !== newState) {
      const previousState = this.state;
      this.state = newState;
      console.log(`🔄 ConnectionManager: State changed from ${previousState} to ${newState}`);
      this.notifyStateChange(newState, previousState);
    }
  }

  notifyStateChange(newState, previousState) {
    this.stateChangeHandlers.forEach(({ handler }) => {
      try {
        handler(newState, previousState);
      } catch (error) {
        console.error('❌ ConnectionManager: Error in state change handler:', error);
      }
    });
  }

  notifyError(error) {
    this.errorHandlers.forEach(({ handler }) => {
      try {
        handler(error);
      } catch (err) {
        console.error('❌ ConnectionManager: Error in error handler:', err);
      }
    });
  }

  notifyConnectionChange(service, isConnected) {
    this.connectionHandlers.forEach(({ handler }) => {
      try {
        handler(service, isConnected);
      } catch (error) {
        console.error('❌ ConnectionManager: Error in connection change handler:', error);
      }
    });
  }

  /**
   * Utility methods
   */
  generateId() {
    return `cm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Public API for external access
   */
  getChatManager() {
    return globalSignalRManager;
  }

  getNotificationManager() {
    return globalNotificationManager;
  }

  isConnected() {
    return this.state === ConnectionState.CONNECTED;
  }

  isChatConnected() {
    return this.chatConnected;
  }

  isNotificationConnected() {
    return this.notificationConnected;
  }
}

// Create singleton instance
const connectionManager = new ConnectionManagerService();

export default connectionManager;

// Export state constants
export { ConnectionState };

// Legacy compatibility exports
export const initializeConnections = (token, userId, options) => connectionManager.initialize(token, userId, options);
export const disconnectAll = () => connectionManager.disconnect();
export const getConnectionStatus = () => connectionManager.getComprehensiveStatus();
export const isAllConnected = () => connectionManager.isConnected();