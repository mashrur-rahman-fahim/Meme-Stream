import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import api from '../src/utils/axios';
import { getWebSocketUrl } from '../src/utils/api-config';

// Enhanced notification context with robust connection management

// Initial state
const initialState = {
  notifications: [],
  unreadCount: 0,
  recentNotifications: [],
  isConnected: false,
  isLoading: false,
  isConnecting: false,
  error: null,
  connection: null,
  connectionState: 'Disconnected',
  lastHeartbeat: null,
  reconnectAttempts: 0,
  connectionStats: null
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_CONNECTING: 'SET_CONNECTING',
  SET_ERROR: 'SET_ERROR',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_UNREAD_COUNT: 'SET_UNREAD_COUNT',
  SET_RECENT_NOTIFICATIONS: 'SET_RECENT_NOTIFICATIONS',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  SET_CONNECTION: 'SET_CONNECTION',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  SET_CONNECTION_STATE: 'SET_CONNECTION_STATE',
  SET_LAST_HEARTBEAT: 'SET_LAST_HEARTBEAT',
  SET_RECONNECT_ATTEMPTS: 'SET_RECONNECT_ATTEMPTS',
  SET_CONNECTION_STATS: 'SET_CONNECTION_STATS',
  CLEAR_ALL: 'CLEAR_ALL'
};

// Enhanced reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case actionTypes.SET_CONNECTING:
      return { ...state, isConnecting: action.payload };

    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload };

    case actionTypes.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload.notifications || [],
        unreadCount: action.payload.unreadCount || 0
      };

    case actionTypes.ADD_NOTIFICATION:
      const newNotification = action.payload;
      const updatedNotifications = [newNotification, ...state.notifications];
      const updatedRecent = [newNotification, ...state.recentNotifications].slice(0, 5);

      return {
        ...state,
        notifications: updatedNotifications,
        recentNotifications: updatedRecent,
        unreadCount: !newNotification.isRead ? state.unreadCount + 1 : state.unreadCount
      };

    case actionTypes.UPDATE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload } : n
        ),
        recentNotifications: state.recentNotifications.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload } : n
        )
      };

    case actionTypes.REMOVE_NOTIFICATION:
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      const removedNotification = state.notifications.find(n => n.id === action.payload);

      return {
        ...state,
        notifications: filteredNotifications,
        recentNotifications: state.recentNotifications.filter(n => n.id !== action.payload),
        unreadCount: removedNotification && !removedNotification.isRead ?
          Math.max(0, state.unreadCount - 1) : state.unreadCount
      };

    case actionTypes.SET_UNREAD_COUNT:
      return { ...state, unreadCount: action.payload };

    case actionTypes.SET_RECENT_NOTIFICATIONS:
      return { ...state, recentNotifications: action.payload };

    case actionTypes.MARK_AS_READ:
      const notificationToRead = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
        recentNotifications: state.recentNotifications.map(n =>
          n.id === action.payload ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
        unreadCount: notificationToRead && !notificationToRead.isRead ?
          Math.max(0, state.unreadCount - 1) : state.unreadCount
      };

    case actionTypes.MARK_ALL_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString()
        })),
        recentNotifications: state.recentNotifications.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString()
        })),
        unreadCount: 0
      };

    case actionTypes.SET_CONNECTION:
      return { ...state, connection: action.payload };

    case actionTypes.SET_CONNECTION_STATUS:
      return { ...state, isConnected: action.payload };

    case actionTypes.SET_CONNECTION_STATE:
      return { ...state, connectionState: action.payload };

    case actionTypes.SET_LAST_HEARTBEAT:
      return { ...state, lastHeartbeat: action.payload };

    case actionTypes.SET_RECONNECT_ATTEMPTS:
      return { ...state, reconnectAttempts: action.payload };

    case actionTypes.SET_CONNECTION_STATS:
      return { ...state, connectionStats: action.payload };

    case actionTypes.CLEAR_ALL:
      return {
        ...state,
        notifications: [],
        recentNotifications: [],
        unreadCount: 0,
        error: null
      };

    default:
      return state;
  }
};

// Context
const EnhancedNotificationContext = createContext();

// Enhanced service class for notification connection management
class NotificationConnectionManager {
  constructor(dispatch) {
    this.dispatch = dispatch;
    this.connection = null;
    this.heartbeatInterval = null;
    this.healthCheckInterval = null;
    this.lastHeartbeat = null;
    this.heartbeatTimeout = 30000; // 30 seconds
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.connectionLock = false;
    this.retryDelays = [0, 1000, 2000, 5000, 10000, 15000, 30000, 60000];
  }

  // Get retry delay with jitter
  getRetryDelay(attempt) {
    const baseDelay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
    const jitter = Math.random() * baseDelay * 0.25;
    return baseDelay + jitter;
  }

  // Detect production environment
  detectProductionEnvironment(url) {
    const productionDomains = [
      'onrender.com', 'render.com', 'herokuapp.com',
      'vercel.app', 'netlify.app', 'azure.com'
    ];
    return productionDomains.some(domain => url.includes(domain)) ||
           window.location.hostname !== 'localhost';
  }

  // Enhanced connection method
  async connect() {
    if (this.connectionLock || (this.connection && this.connection.state === signalR.HubConnectionState.Connected)) {
      console.log('Enhanced Notifications: Connection attempt already in progress or already connected');
      return this.connection;
    }

    this.connectionLock = true;
    this.dispatch({ type: actionTypes.SET_CONNECTING, payload: true });
    this.dispatch({ type: actionTypes.SET_ERROR, payload: null });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Clean up existing connection
      await this.cleanup();

      const webSocketUrl = getWebSocketUrl();
      console.log('Enhanced Notifications: Connecting to hub at:', `${webSocketUrl}/notificationhub`);

      const isProduction = this.detectProductionEnvironment(webSocketUrl);

      const connectionOptions = {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        withCredentials: false
      };

      if (isProduction) {
        console.log('Enhanced Notifications: Production environment - using optimized transports');
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
            const delay = this.getRetryDelay(retryContext.previousRetryCount);
            console.log(`Enhanced Notifications: Retry attempt ${retryContext.previousRetryCount + 1} in ${delay}ms`);
            this.dispatch({ type: actionTypes.SET_RECONNECT_ATTEMPTS, payload: retryContext.previousRetryCount + 1 });
            return delay;
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Setup event handlers
      this.setupEventHandlers();
      this.setupConnectionStateHandlers();

      // Connect with timeout
      await this.attemptConnection();

      // Start health monitoring
      this.startHealthMonitoring();

      this.dispatch({ type: actionTypes.SET_CONNECTION, payload: this.connection });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: true });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATE, payload: 'Connected' });
      this.dispatch({ type: actionTypes.SET_RECONNECT_ATTEMPTS, payload: 0 });

      console.log('Enhanced Notifications: Connected successfully');
      this.reconnectAttempts = 0;

      return this.connection;

    } catch (error) {
      console.error('Enhanced Notifications: Connection failed:', error);
      this.dispatch({ type: actionTypes.SET_ERROR, payload: 'Failed to connect to notification service' });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: false });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATE, payload: 'Disconnected' });
      throw error;
    } finally {
      this.connectionLock = false;
      this.dispatch({ type: actionTypes.SET_CONNECTING, payload: false });
    }
  }

  // Enhanced connection attempt with timeout
  async attemptConnection(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeoutMs);

      this.connection.start()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // Setup event handlers
  setupEventHandlers() {
    if (!this.connection) return;

    this.connection.on('ReceiveNotification', (notification) => {
      console.log('Enhanced Notifications: Received real-time notification:', notification);
      this.dispatch({ type: actionTypes.ADD_NOTIFICATION, payload: notification });
      this.showBrowserNotification(notification);
    });

    this.connection.on('UpdateUnreadCount', (count) => {
      console.log('Enhanced Notifications: Received unread count update:', count);
      this.dispatch({ type: actionTypes.SET_UNREAD_COUNT, payload: count });
    });

    this.connection.on('NotificationRead', (notificationId) => {
      this.dispatch({ type: actionTypes.MARK_AS_READ, payload: notificationId });
    });

    this.connection.on('AllNotificationsRead', () => {
      this.dispatch({ type: actionTypes.MARK_ALL_AS_READ });
    });

    // Heartbeat handler
    this.connection.on('Pong', (serverTime) => {
      this.lastHeartbeat = Date.now();
      this.dispatch({ type: actionTypes.SET_LAST_HEARTBEAT, payload: this.lastHeartbeat });
      console.log('Enhanced Notifications: Heartbeat received from server at:', serverTime);
    });

    // Connection confirmation
    this.connection.on('ConnectionConfirmed', (data) => {
      console.log('Enhanced Notifications: Connection confirmed:', data);
    });

    // Connection stats (for monitoring)
    this.connection.on('ConnectionStats', (stats) => {
      console.log('Enhanced Notifications: Connection stats:', stats);
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATS, payload: stats });
    });
  }

  // Setup connection state handlers
  setupConnectionStateHandlers() {
    if (!this.connection) return;

    this.connection.onclose((error) => {
      console.log('Enhanced Notifications: Connection closed:', error);
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: false });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATE, payload: 'Disconnected' });
      this.stopHealthMonitoring();
    });

    this.connection.onreconnecting((error) => {
      console.log('Enhanced Notifications: Reconnecting...', error);
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: false });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATE, payload: 'Reconnecting' });
    });

    this.connection.onreconnected((connectionId) => {
      console.log('Enhanced Notifications: Reconnected:', connectionId);
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: true });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATE, payload: 'Connected' });
      this.dispatch({ type: actionTypes.SET_RECONNECT_ATTEMPTS, payload: 0 });
      this.startHealthMonitoring();
    });
  }

  // Start health monitoring
  startHealthMonitoring() {
    this.stopHealthMonitoring();

    // Send ping every 15 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        this.sendPing();
      }
    }, 15000);

    // Check connection health every 5 seconds
    this.healthCheckInterval = setInterval(() => {
      if (!this.isConnectionHealthy() && this.connection) {
        console.warn('Enhanced Notifications: Connection unhealthy, attempting reconnection');
        this.handleUnhealthyConnection();
      }
    }, 5000);
  }

  // Stop health monitoring
  stopHealthMonitoring() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Send ping
  async sendPing() {
    try {
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        await this.connection.invoke('Ping');
        console.log('Enhanced Notifications: Ping sent');
      }
    } catch (error) {
      console.error('Enhanced Notifications: Failed to send ping:', error);
    }
  }

  // Check connection health
  isConnectionHealthy() {
    if (!this.lastHeartbeat) return true;
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
    return timeSinceLastHeartbeat < this.heartbeatTimeout;
  }

  // Handle unhealthy connection
  async handleUnhealthyConnection() {
    try {
      if (this.connection) {
        await this.connection.stop();
      }
    } catch (error) {
      console.error('Enhanced Notifications: Error handling unhealthy connection:', error);
    }
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const options = {
        body: notification.message,
        icon: '/favicon.ico',
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
  }

  // Clean up
  async cleanup() {
    this.stopHealthMonitoring();

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.error('Enhanced Notifications: Error stopping connection:', error);
      }
      this.connection = null;
    }

    this.lastHeartbeat = null;
  }

  // Disconnect
  async disconnect() {
    this.connectionLock = true;
    try {
      await this.cleanup();
      this.dispatch({ type: actionTypes.SET_CONNECTION, payload: null });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: false });
      this.dispatch({ type: actionTypes.SET_CONNECTION_STATE, payload: 'Disconnected' });
      console.log('Enhanced Notifications: Disconnected successfully');
    } finally {
      this.connectionLock = false;
    }
  }

  // Get connection stats
  async getConnectionStats() {
    try {
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        await this.connection.invoke('GetConnectionStats');
      }
    } catch (error) {
      console.error('Enhanced Notifications: Failed to get connection stats:', error);
    }
  }
}

// Provider component
export const EnhancedNotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const connectionManagerRef = useRef(null);

  // Initialize connection manager
  useEffect(() => {
    connectionManagerRef.current = new NotificationConnectionManager(dispatch);
    return () => {
      if (connectionManagerRef.current) {
        connectionManagerRef.current.disconnect();
      }
    };
  }, []);

  // Initialize SignalR connection
  const initializeSignalR = useCallback(async () => {
    try {
      if (connectionManagerRef.current) {
        await connectionManagerRef.current.connect();
      }
    } catch (error) {
      console.error('Enhanced Notifications: Failed to initialize SignalR:', error);
    }
  }, []);

  // Disconnect SignalR
  const disconnectSignalR = useCallback(async () => {
    if (connectionManagerRef.current) {
      await connectionManagerRef.current.disconnect();
    }
  }, []);

  // Get connection stats
  const getConnectionStats = useCallback(async () => {
    if (connectionManagerRef.current) {
      await connectionManagerRef.current.getConnectionStats();
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async (page = 1, pageSize = 20, unreadOnly = false) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: true });
    dispatch({ type: actionTypes.SET_ERROR, payload: null });

    try {
      const response = await api.get('/notification', {
        params: { page, pageSize, unreadOnly }
      });

      const { notifications, unreadCount } = response.data;
      dispatch({
        type: actionTypes.SET_NOTIFICATIONS,
        payload: { notifications, unreadCount }
      });

    } catch (error) {
      console.error('Enhanced Notifications: Error fetching notifications:', error);
      dispatch({ type: actionTypes.SET_ERROR, payload: 'Failed to load notifications' });
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  }, []);

  // Fetch recent notifications
  const fetchRecentNotifications = useCallback(async (count = 5) => {
    try {
      const response = await api.get('/notification/recent', {
        params: { count }
      });

      dispatch({ type: actionTypes.SET_RECENT_NOTIFICATIONS, payload: response.data });
    } catch (error) {
      console.error('Enhanced Notifications: Error fetching recent notifications:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/notification/${notificationId}/read`);
      dispatch({ type: actionTypes.MARK_AS_READ, payload: notificationId });
    } catch (error) {
      console.error('Enhanced Notifications: Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notification/read-all');
      dispatch({ type: actionTypes.MARK_ALL_AS_READ });
    } catch (error) {
      console.error('Enhanced Notifications: Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notification/${notificationId}`);
      dispatch({ type: actionTypes.REMOVE_NOTIFICATION, payload: notificationId });
    } catch (error) {
      console.error('Enhanced Notifications: Error deleting notification:', error);
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
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
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    dispatch({ type: actionTypes.CLEAR_ALL });
  }, []);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      console.log('Enhanced Notifications: Fetching unread count...');
      const response = await api.get('/notification/unread-count');
      console.log('Enhanced Notifications: Unread count response:', response.data);
      dispatch({ type: actionTypes.SET_UNREAD_COUNT, payload: response.data.unreadCount || 0 });
    } catch (error) {
      console.error('Enhanced Notifications: Error fetching unread count:', error);
    }
  }, []);

  // Initialize connection when component mounts
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      initializeSignalR();
      requestNotificationPermission();
      fetchUnreadCount();
    }

    return () => {
      disconnectSignalR();
    };
  }, [initializeSignalR, requestNotificationPermission, fetchUnreadCount, disconnectSignalR]);

  const value = {
    ...state,
    initializeSignalR,
    disconnectSignalR,
    getConnectionStats,
    fetchNotifications,
    fetchRecentNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestNotificationPermission,
    clearAll
  };

  return (
    <EnhancedNotificationContext.Provider value={value}>
      {children}
    </EnhancedNotificationContext.Provider>
  );
};

// Hook to use enhanced notification context
export const useEnhancedNotifications = () => {
  const context = useContext(EnhancedNotificationContext);
  if (!context) {
    throw new Error('useEnhancedNotifications must be used within an EnhancedNotificationProvider');
  }
  return context;
};

export default EnhancedNotificationContext;