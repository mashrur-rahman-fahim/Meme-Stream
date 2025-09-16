import * as signalR from "@microsoft/signalr";
import { getWebSocketUrl } from "../utils/api-config";

class EnhancedSignalRService {
  constructor() {
    this.connection = null;
    this.connectionState = signalR.HubConnectionState.Disconnected;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.heartbeatInterval = null;
    this.healthCheckInterval = null;
    this.lastHeartbeat = null;
    this.heartbeatTimeout = 30000; // 30 seconds
    this.callbacks = new Map();
    this.isInitializing = false;
    this.connectionLock = false;

    // Enhanced retry delays with jitter
    this.retryDelays = [0, 1000, 2000, 5000, 10000, 15000, 30000, 60000];

    // Bind methods to maintain context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }

  // Get current connection state
  getConnectionState() {
    return this.connection ? this.connection.state : signalR.HubConnectionState.Disconnected;
  }

  // Check if connection is healthy
  isConnected() {
    return this.connection &&
           this.connection.state === signalR.HubConnectionState.Connected &&
           this.isConnectionHealthy();
  }

  // Enhanced connection health check
  isConnectionHealthy() {
    if (!this.lastHeartbeat) return true; // No heartbeat started yet
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
    return timeSinceLastHeartbeat < this.heartbeatTimeout;
  }

  // Add exponential backoff with jitter
  getRetryDelay(attempt) {
    const baseDelay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
    // Add jitter (0-25% of base delay)
    const jitter = Math.random() * baseDelay * 0.25;
    return baseDelay + jitter;
  }

  // Enhanced connection method with retry logic
  async connect(token, callbacks = {}) {
    // Prevent multiple concurrent connection attempts
    if (this.connectionLock || this.isInitializing) {
      console.log("Connection attempt already in progress, waiting...");
      return this.connectionPromise;
    }

    this.connectionLock = true;
    this.isInitializing = true;
    this.callbacks = new Map(Object.entries(callbacks));

    try {
      // Clean up existing connection
      await this.cleanup();

      const webSocketUrl = getWebSocketUrl();
      console.log('Enhanced SignalR: Connecting to chat hub at:', `${webSocketUrl}/chathub`);

      // Enhanced production detection
      const isProduction = this.detectProductionEnvironment(webSocketUrl);

      const connectionOptions = {
        accessTokenFactory: () => token,
        skipNegotiation: false, // Allow negotiation for better compatibility
        withCredentials: false
      };

      // Enhanced transport configuration
      if (isProduction) {
        console.log('Production environment detected - using optimized transports');
        connectionOptions.transport =
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling;
      } else {
        // For development, prefer WebSockets but allow fallback
        connectionOptions.transport =
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling;
      }

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${webSocketUrl}/chathub`, connectionOptions)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            const delay = this.getRetryDelay(retryContext.previousRetryCount);
            console.log(`Enhanced SignalR: Retry attempt ${retryContext.previousRetryCount + 1} in ${delay}ms`);
            return delay;
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Setup event handlers before connecting
      this.setupEventHandlers();
      this.setupConnectionStateHandlers();

      // Enhanced connection with timeout and retry
      this.connectionPromise = this.attemptConnection();
      await this.connectionPromise;

      // Start health monitoring
      this.startHealthMonitoring();

      console.log("Enhanced SignalR: Connected successfully");
      this.reconnectAttempts = 0;

      return this.connection;

    } catch (error) {
      console.error("Enhanced SignalR: Connection failed:", error);
      this.handleConnectionError(error);
      throw error;
    } finally {
      this.connectionLock = false;
      this.isInitializing = false;
    }
  }

  // Detect production environment more accurately
  detectProductionEnvironment(url) {
    const productionDomains = [
      'onrender.com', 'render.com', 'herokuapp.com',
      'vercel.app', 'netlify.app', 'azure.com'
    ];
    return productionDomains.some(domain => url.includes(domain)) ||
           window.location.hostname !== 'localhost';
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

  // Setup enhanced event handlers
  setupEventHandlers() {
    if (!this.connection) return;

    // Message handlers with enhanced error handling
    this.connection.on("ReceiveMessage", this.handleSafe("onPrivateMessage", (senderId, message, messageId, sentAt) => {
      console.log("Enhanced SignalR: Received private message:", { senderId, message, messageId, sentAt });
      this.invokeCallback("onPrivateMessage", senderId, message, messageId, sentAt);
      this.invokeCallback("onNotify", { type: "private", senderId, message });
    }));

    this.connection.on("ReceiveGroupMessage", this.handleSafe("onGroupMessage", (senderId, message, messageId, sentAt) => {
      console.log("Enhanced SignalR: Received group message:", { senderId, message, messageId, sentAt });
      this.invokeCallback("onGroupMessage", senderId, message, messageId, sentAt);
      this.invokeCallback("onNotify", { type: "group", senderId, message });
    }));

    this.connection.on("ReceiveTypingStatus", this.handleSafe("onTypingStatus", (senderId, isTyping) => {
      this.invokeCallback("onTypingStatus", senderId, isTyping);
    }));

    this.connection.on("ReceiveReaction", this.handleSafe("onReactionUpdate", (reactionData) => {
      console.log("Enhanced SignalR: Received reaction update:", reactionData);
      this.invokeCallback("onReactionUpdate", reactionData);
    }));

    this.connection.on("ReceiveMessageEdit", this.handleSafe("onMessageEdit", (messageId, newContent, editedAt) => {
      this.invokeCallback("onMessageEdit", messageId, newContent, editedAt);
    }));

    this.connection.on("ReceiveMessageDelete", this.handleSafe("onMessageDelete", (messageId) => {
      this.invokeCallback("onMessageDelete", messageId);
    }));

    this.connection.on("ReceiveReadReceipt", this.handleSafe("onReadReceipt", (messageId, userId) => {
      this.invokeCallback("onReadReceipt", messageId, userId);
    }));

    // Heartbeat handler
    this.connection.on("Pong", this.handleSafe("pong", () => {
      this.lastHeartbeat = Date.now();
      console.log("Enhanced SignalR: Heartbeat received");
    }));
  }

  // Setup enhanced connection state handlers
  setupConnectionStateHandlers() {
    if (!this.connection) return;

    this.connection.onclose((error) => {
      console.log("Enhanced SignalR: Connection closed:", error);
      this.connectionState = signalR.HubConnectionState.Disconnected;
      this.stopHealthMonitoring();
      this.invokeCallback("onConnectionStateChanged", "disconnected", error);
    });

    this.connection.onreconnecting((error) => {
      console.log("Enhanced SignalR: Reconnecting...", error);
      this.connectionState = signalR.HubConnectionState.Reconnecting;
      this.invokeCallback("onConnectionStateChanged", "reconnecting", error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log("Enhanced SignalR: Reconnected:", connectionId);
      this.connectionState = signalR.HubConnectionState.Connected;
      this.startHealthMonitoring();
      this.invokeCallback("onConnectionStateChanged", "connected", connectionId);
    });
  }

  // Safe event handler wrapper
  handleSafe(eventName, handler) {
    return (...args) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Enhanced SignalR: Error in ${eventName} handler:`, error);
      }
    };
  }

  // Invoke callback safely
  invokeCallback(callbackName, ...args) {
    try {
      const callback = this.callbacks.get(callbackName);
      if (callback && typeof callback === 'function') {
        callback(...args);
      }
    } catch (error) {
      console.error(`Enhanced SignalR: Error invoking ${callbackName}:`, error);
    }
  }

  // Start health monitoring with heartbeat
  startHealthMonitoring() {
    this.stopHealthMonitoring();

    // Send ping every 15 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
      }
    }, 15000);

    // Check connection health every 5 seconds
    this.healthCheckInterval = setInterval(() => {
      if (!this.isConnectionHealthy() && this.connection) {
        console.warn("Enhanced SignalR: Connection unhealthy, attempting reconnection");
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

  // Send ping for heartbeat
  async sendPing() {
    try {
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        await this.connection.invoke("Ping");
        console.log("Enhanced SignalR: Ping sent");
      }
    } catch (error) {
      console.error("Enhanced SignalR: Failed to send ping:", error);
    }
  }

  // Handle unhealthy connection
  async handleUnhealthyConnection() {
    try {
      if (this.connection) {
        await this.connection.stop();
        // Automatic reconnection will handle reconnecting
      }
    } catch (error) {
      console.error("Enhanced SignalR: Error handling unhealthy connection:", error);
    }
  }

  // Enhanced message sending with retry
  async sendMessage(method, ...args) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        if (!this.isConnected()) {
          throw new Error("Connection not ready");
        }

        await this.connection.invoke(method, ...args);
        return true;

      } catch (error) {
        attempt++;
        console.error(`Enhanced SignalR: Failed to send ${method} (attempt ${attempt}):`, error);

        if (attempt >= maxRetries) {
          throw new Error(`Failed to send ${method} after ${maxRetries} attempts: ${error.message}`);
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Try to reconnect if disconnected
        if (!this.isConnected() && this.connection) {
          try {
            await this.connection.start();
          } catch (reconnectError) {
            console.error("Enhanced SignalR: Reconnection failed:", reconnectError);
          }
        }
      }
    }
  }

  // Connection error handler
  handleConnectionError(error) {
    console.error("Enhanced SignalR: Connection error:", error);
    this.invokeCallback("onConnectionError", error);
  }

  // Clean up existing connection
  async cleanup() {
    this.stopHealthMonitoring();

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.error("Enhanced SignalR: Error stopping connection:", error);
      }
      this.connection = null;
    }

    this.connectionState = signalR.HubConnectionState.Disconnected;
    this.lastHeartbeat = null;
  }

  // Enhanced disconnect method
  async disconnect() {
    console.log("Enhanced SignalR: Disconnecting...");
    this.connectionLock = true;

    try {
      await this.cleanup();
      console.log("Enhanced SignalR: Disconnected successfully");
    } finally {
      this.connectionLock = false;
    }
  }

  // Convenience methods for common operations
  async sendPrivateMessage(receiverId, message) {
    return this.sendMessage("SendPrivateMessage", receiverId, message);
  }

  async sendGroupMessage(groupName, message) {
    return this.sendMessage("SendGroupMessage", groupName, message);
  }

  async joinGroup(groupName) {
    return this.sendMessage("JoinGroup", groupName);
  }

  async leaveGroup(groupName) {
    return this.sendMessage("LeaveGroup", groupName);
  }

  async sendTypingStatus(receiverId, isTyping) {
    return this.sendMessage("SendTypingStatus", receiverId, isTyping);
  }

  async reactToMessage(messageId, emoji) {
    return this.sendMessage("ReactToMessage", messageId, emoji);
  }

  async editMessage(messageId, newContent) {
    return this.sendMessage("EditMessage", messageId, newContent);
  }

  async deleteMessage(messageId) {
    return this.sendMessage("DeleteMessage", messageId);
  }

  async markMessageAsRead(messageId) {
    return this.sendMessage("MarkAsRead", messageId);
  }
}

// Create singleton instance
const enhancedSignalRService = new EnhancedSignalRService();

// Export service instance and static methods for backward compatibility
export default enhancedSignalRService;

export const startSignalRConnection = (token, callbacks) => {
  return enhancedSignalRService.connect(token, callbacks);
};

export const getConnection = () => {
  return enhancedSignalRService.connection;
};

export const isConnected = () => {
  return enhancedSignalRService.isConnected();
};

export const sendPrivateMessage = (receiverId, message) => {
  return enhancedSignalRService.sendPrivateMessage(receiverId, message);
};

export const sendGroupMessage = (groupName, message) => {
  return enhancedSignalRService.sendGroupMessage(groupName, message);
};

export const joinGroup = (groupName) => {
  return enhancedSignalRService.joinGroup(groupName);
};

export const leaveGroup = (groupName) => {
  return enhancedSignalRService.leaveGroup(groupName);
};

export const sendTypingStatus = (receiverId, isTyping) => {
  return enhancedSignalRService.sendTypingStatus(receiverId, isTyping);
};

export const reactToMessage = (messageId, emoji) => {
  return enhancedSignalRService.reactToMessage(messageId, emoji);
};

export const editMessage = (messageId, newContent) => {
  return enhancedSignalRService.editMessage(messageId, newContent);
};

export const deleteMessage = (messageId) => {
  return enhancedSignalRService.deleteMessage(messageId);
};

export const markMessageAsRead = (messageId) => {
  return enhancedSignalRService.markMessageAsRead(messageId);
};

export const disconnect = () => {
  return enhancedSignalRService.disconnect();
};

export const reconnect = (token, callbacks) => {
  return enhancedSignalRService.connect(token, callbacks);
};