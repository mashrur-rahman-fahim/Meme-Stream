import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import api from '../src/utils/axios';

// Initial state
const initialState = {
  notifications: [],
  unreadCount: 0,
  recentNotifications: [],
  isConnected: false,
  isLoading: false,
  error: null,
  connection: null,
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
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
  CLEAR_ALL: 'CLEAR_ALL'
};

// Reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
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
const NotificationContext = createContext();

// Provider component
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Initialize SignalR connection
  const initializeSignalR = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Clean up existing connection
      if (state.connection) {
        await state.connection.stop();
      }

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/notificationhub`, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up event handlers
      connection.on('ReceiveNotification', (notification) => {
        console.log('Received real-time notification:', notification);
        dispatch({ type: actionTypes.ADD_NOTIFICATION, payload: notification });
        showBrowserNotification(notification);
      });

      connection.on('UpdateUnreadCount', (count) => {
        console.log('Received unread count update:', count);
        dispatch({ type: actionTypes.SET_UNREAD_COUNT, payload: count });
      });

      connection.on('NotificationRead', (notificationId) => {
        dispatch({ type: actionTypes.MARK_AS_READ, payload: notificationId });
      });

      connection.on('AllNotificationsRead', () => {
        dispatch({ type: actionTypes.MARK_ALL_AS_READ });
      });

      // Start connection
      await connection.start();
      dispatch({ type: actionTypes.SET_CONNECTION, payload: connection });
      dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: true });
      console.log('SignalR Connected for notifications');

    } catch (error) {
      console.error('SignalR Connection Error:', error);
      dispatch({ type: actionTypes.SET_ERROR, payload: 'Failed to connect to notification service' });
      dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: false });
    }
  }, [state.connection]);

  // Disconnect SignalR
  const disconnectSignalR = useCallback(async () => {
    if (state.connection) {
      try {
        await state.connection.stop();
        dispatch({ type: actionTypes.SET_CONNECTION, payload: null });
        dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: false });
        console.log('SignalR Disconnected');
      } catch (error) {
        console.error('Error disconnecting SignalR:', error);
      }
    }
  }, [state.connection]);

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
      console.error('Error fetching notifications:', error);
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
      console.error('Error fetching recent notifications:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/notification/${notificationId}/read`);
      dispatch({ type: actionTypes.MARK_AS_READ, payload: notificationId });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notification/read-all');
      dispatch({ type: actionTypes.MARK_ALL_AS_READ });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notification/${notificationId}`);
      dispatch({ type: actionTypes.REMOVE_NOTIFICATION, payload: notificationId });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification) => {
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
      console.log('Fetching unread count...');
      const response = await api.get('/notification/unread-count');
      console.log('Unread count response:', response.data);
      dispatch({ type: actionTypes.SET_UNREAD_COUNT, payload: response.data.unreadCount || 0 });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Initialize connection when component mounts
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      initializeSignalR();
      requestNotificationPermission();
      fetchUnreadCount(); // Fetch initial count
    }

    return () => {
      disconnectSignalR();
    };
  }, [initializeSignalR, requestNotificationPermission, fetchUnreadCount]);

  const value = {
    ...state,
    initializeSignalR,
    disconnectSignalR,
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
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook to use notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;