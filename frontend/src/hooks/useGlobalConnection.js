/**
 * Global Connection Hook
 *
 * A React hook to manage centralized WebSocket connections
 * Provides easy access to chat and notification connections
 * with automatic state management and cleanup
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import connectionManager from '../services/ConnectionManagerService';

export const useGlobalConnection = (options = {}) => {
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [isConnected, setIsConnected] = useState(false);
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [isNotificationConnected, setIsNotificationConnected] = useState(false);
  const [error, setError] = useState(null);

  const stateHandlerIdRef = useRef(null);
  const errorHandlerIdRef = useRef(null);
  const connectionHandlerIdRef = useRef(null);

  // Configuration
  const config = {
    enableChat: true,
    enableNotifications: true,
    monitorState: true,
    autoReconnect: true,
    ...options
  };

  // Update connection states
  const updateStates = useCallback(() => {
    const status = connectionManager.getComprehensiveStatus();
    setConnectionState(status.state);
    setIsConnected(status.state === 'CONNECTED');
    setIsChatConnected(status.chat.connected);
    setIsNotificationConnected(status.notifications.connected);
  }, []);

  // Initialize connection monitoring
  useEffect(() => {
    if (!config.monitorState) return;

    // Add state change handler
    stateHandlerIdRef.current = connectionManager.addStateChangeHandler((newState) => {
      setConnectionState(newState);
      setIsConnected(newState === 'CONNECTED');
      updateStates();
    });

    // Add error handler
    errorHandlerIdRef.current = connectionManager.addErrorHandler((error) => {
      setError(error);
      console.error('Connection error:', error);
    });

    // Add connection change handler
    connectionHandlerIdRef.current = connectionManager.addConnectionChangeHandler((service, connected) => {
      if (service === 'chat') {
        setIsChatConnected(connected);
      } else if (service === 'notification') {
        setIsNotificationConnected(connected);
      }
    });

    // Initial state update
    updateStates();

    // Cleanup on unmount
    return () => {
      if (stateHandlerIdRef.current) {
        connectionManager.removeStateChangeHandler(stateHandlerIdRef.current);
      }
      if (errorHandlerIdRef.current) {
        connectionManager.removeErrorHandler(errorHandlerIdRef.current);
      }
      if (connectionHandlerIdRef.current) {
        connectionManager.removeConnectionChangeHandler(connectionHandlerIdRef.current);
      }
    };
  }, [config.monitorState, updateStates]);

  // Get chat manager
  const getChatManager = useCallback(() => {
    return connectionManager.getChatManager();
  }, []);

  // Get notification manager
  const getNotificationManager = useCallback(() => {
    return connectionManager.getNotificationManager();
  }, []);

  // Get connection promise (useful for components that need to wait for connection)
  const getConnectionPromise = useCallback(() => {
    return connectionManager.getConnectionPromise();
  }, []);

  // Get comprehensive status
  const getStatus = useCallback(() => {
    return connectionManager.getComprehensiveStatus();
  }, []);

  // Manual initialization (usually handled automatically by VerifyProvider)
  const initialize = useCallback(async (token, userId) => {
    try {
      setError(null);
      await connectionManager.initialize(token, userId, {
        enableChat: config.enableChat,
        enableNotifications: config.enableNotifications
      });
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [config.enableChat, config.enableNotifications]);

  // Manual disconnect
  const disconnect = useCallback(async () => {
    try {
      await connectionManager.disconnect();
      setError(null);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Connection states
    connectionState,
    isConnected,
    isChatConnected,
    isNotificationConnected,
    error,

    // Managers
    getChatManager,
    getNotificationManager,

    // Utilities
    getConnectionPromise,
    getStatus,
    initialize,
    disconnect,
    clearError,

    // Direct access to connection manager
    connectionManager
  };
};

/**
 * Hook specifically for chat connections
 * Provides chat-specific functionality and event handlers
 */
export const useChatConnection = (options = {}) => {
  const globalConnection = useGlobalConnection(options);
  const [chatConnection, setChatConnection] = useState(null);

  // Get chat connection when available
  useEffect(() => {
    if (globalConnection.isChatConnected) {
      const manager = globalConnection.getChatManager();
      if (manager && manager.chatConnection) {
        setChatConnection(manager.chatConnection);
      }
    } else {
      setChatConnection(null);
    }
  }, [globalConnection.isChatConnected, globalConnection]);

  // Chat-specific methods
  const sendPrivateMessage = useCallback(async (receiverId, message) => {
    const manager = globalConnection.getChatManager();
    return manager.sendPrivateMessage(receiverId, message);
  }, [globalConnection]);

  const sendGroupMessage = useCallback(async (groupName, message) => {
    const manager = globalConnection.getChatManager();
    return manager.sendGroupMessage(groupName, message);
  }, [globalConnection]);

  const joinGroup = useCallback(async (groupName) => {
    const manager = globalConnection.getChatManager();
    return manager.joinGroup(groupName);
  }, [globalConnection]);

  const sendTypingStatus = useCallback(async (receiverId, isTyping) => {
    const manager = globalConnection.getChatManager();
    return manager.sendTypingStatus(receiverId, isTyping);
  }, [globalConnection]);

  const reactToMessage = useCallback(async (messageId, emoji) => {
    const manager = globalConnection.getChatManager();
    return manager.reactToMessage(messageId, emoji);
  }, [globalConnection]);

  const editMessage = useCallback(async (messageId, newContent) => {
    const manager = globalConnection.getChatManager();
    return manager.editMessage(messageId, newContent);
  }, [globalConnection]);

  const deleteMessage = useCallback(async (messageId) => {
    const manager = globalConnection.getChatManager();
    return manager.deleteMessage(messageId);
  }, [globalConnection]);

  // Event handler registration
  const addEventListener = useCallback((event, handler, id) => {
    const manager = globalConnection.getChatManager();
    return manager.addEventListener(event, handler, id);
  }, [globalConnection]);

  const removeEventListener = useCallback((event, id) => {
    const manager = globalConnection.getChatManager();
    return manager.removeEventListener(event, id);
  }, [globalConnection]);

  return {
    ...globalConnection,
    chatConnection,

    // Chat methods
    sendPrivateMessage,
    sendGroupMessage,
    joinGroup,
    sendTypingStatus,
    reactToMessage,
    editMessage,
    deleteMessage,

    // Event management
    addEventListener,
    removeEventListener
  };
};

/**
 * Hook specifically for notification connections
 */
export const useNotificationConnection = (options = {}) => {
  const globalConnection = useGlobalConnection(options);

  // Notification-specific methods would go here
  const getNotifications = useCallback(() => {
    const manager = globalConnection.getNotificationManager();
    return manager.getNotifications ? manager.getNotifications() : [];
  }, [globalConnection]);

  const markAsRead = useCallback((notificationId) => {
    const manager = globalConnection.getNotificationManager();
    return manager.markAsRead ? manager.markAsRead(notificationId) : Promise.resolve();
  }, [globalConnection]);

  return {
    ...globalConnection,
    getNotifications,
    markAsRead
  };
};

export default useGlobalConnection;