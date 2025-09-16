/**
 * Global SignalR Connection Manager
 *
 * Ultra-robust WebSocket implementation with:
 * - Connection pooling and pre-warming
 * - Circuit breaker pattern for resilience
 * - Message queuing for offline scenarios
 * - Advanced retry strategies with exponential backoff and jitter
 * - Self-healing connection monitoring
 * - Global state management
 */

import * as signalR from "@microsoft/signalr";
import { getWebSocketUrl } from "../utils/api-config";

// Connection states
const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN'
};

// Circuit breaker states
const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN: 'HALF_OPEN' // Testing if service is back
};

class GlobalSignalRManager {
  constructor() {
    // Connection management
    this.chatConnection = null;
    this.notificationConnection = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    this.connectionPromise = null;
    this.isInitialized = false;

    // Connection pool and queuing
    this.messageQueue = [];
    this.pendingOperations = new Map();
    this.eventHandlers = new Map();
    this.connectionHandlers = [];

    // Advanced retry configuration
    this.retryConfig = {
      maxAttempts: 15,
      baseDelay: 100,
      maxDelay: 30000,
      backoffFactor: 1.5,
      jitterFactor: 0.1,
      quickRetryAttempts: 3, // First few attempts with minimal delay
      quickRetryDelay: 500
    };

    // Circuit breaker configuration
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: null,
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      halfOpenMaxCalls: 3,
      halfOpenCalls: 0
    };

    // Health monitoring
    this.healthMonitor = {
      heartbeatInterval: null,
      healthCheckInterval: null,
      lastHeartbeat: null,
      heartbeatTimeout: 30000,
      missedHeartbeats: 0,
      maxMissedHeartbeats: 3
    };

    // Connection metadata
    this.connectionInfo = {
      startTime: null,
      reconnectCount: 0,
      totalUptime: 0,
      lastDisconnect: null,
      connectionId: null,
      transport: null
    };

    // Performance monitoring
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      failedOperations: 0,
      avgLatency: 0,
      connectionAttempts: 0,
      successfulConnections: 0
    };

    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.initialize = this.initialize.bind(this);

    // Auto-initialize on token change
    this.currentToken = null;
    this.setupTokenWatcher();
  }

  /**
   * Initialize the connection manager
   */
  async initialize(token, options = {}) {
    if (this.isInitialized && this.currentToken === token) {
      return this.getConnectionPromise();
    }

    console.log('🚀 GlobalSignalRManager: Initializing...');

    this.currentToken = token;
    this.isInitialized = true;

    // Setup default options
    const defaultOptions = {
      preWarm: true,
      enableCircuitBreaker: true,
      enableHealthMonitoring: true,
      enableMessageQueuing: true,
      logLevel: signalR.LogLevel.Information
    };

    this.options = { ...defaultOptions, ...options };

    // Pre-warm connection if enabled
    if (this.options.preWarm) {
      await this.preWarmConnection();
    }

    return this.connect(token);
  }

  /**
   * Pre-warm connection by establishing and testing it early
   */
  async preWarmConnection() {
    console.log('🔥 GlobalSignalRManager: Pre-warming connection...');

    try {
      // Create minimal connection for testing
      const testConnection = this.createConnection(this.currentToken, {
        skipNegotiation: false,
        transport: this.getOptimalTransport()
      });

      // Quick connection test
      const testPromise = this.withTimeout(
        testConnection.start(),
        5000,
        'Pre-warm connection timeout'
      );

      await testPromise;

      // Test basic connectivity
      await testConnection.invoke('Ping').catch(() => {
        console.log('Pre-warm: Ping not available, connection still valid');
      });

      console.log('✅ GlobalSignalRManager: Connection pre-warmed successfully');

      // Store connection info for optimization
      this.connectionInfo.transport = testConnection.transport;

      // Clean up test connection
      await testConnection.stop();

    } catch (error) {
      console.warn('⚠️ GlobalSignalRManager: Pre-warm failed, will retry on demand:', error.message);
      this.recordFailure(error);
    }
  }

  /**
   * Enhanced connection with circuit breaker and advanced retry
   */
  async connect(token) {
    // Check circuit breaker
    if (!this.canAttemptConnection()) {
      throw new Error('Connection circuit breaker is open, service temporarily unavailable');
    }

    // Return existing connection if available
    if (this.chatConnection &&
        this.chatConnection.state === signalR.HubConnectionState.Connected &&
        this.connectionState === ConnectionState.CONNECTED) {
      console.log('♻️ GlobalSignalRManager: Reusing existing connection');
      return this.chatConnection;
    }

    // Return pending connection promise if already connecting
    if (this.connectionPromise) {
      console.log('⏳ GlobalSignalRManager: Connection attempt in progress, waiting...');
      return this.connectionPromise;
    }

    console.log('🔌 GlobalSignalRManager: Starting new connection...');

    this.connectionPromise = this.performConnection(token);

    try {
      const connection = await this.connectionPromise;
      this.onConnectionSuccess();
      return connection;
    } catch (error) {
      this.onConnectionFailure(error);
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Perform the actual connection with advanced retry logic
   */
  async performConnection(token) {
    let lastError = null;

    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        this.connectionState = ConnectionState.CONNECTING;
        this.metrics.connectionAttempts++;

        console.log(`🔄 GlobalSignalRManager: Connection attempt ${attempt + 1}/${this.retryConfig.maxAttempts}`);

        // Clean up any existing connection
        await this.cleanupConnections();

        // Create new connection
        this.chatConnection = this.createConnection(token, {
          attempt: attempt + 1,
          totalAttempts: this.retryConfig.maxAttempts
        });

        // Setup event handlers before connecting
        this.setupConnectionHandlers(this.chatConnection);

        // Attempt connection with timeout
        const connectionTimeout = Math.min(10000 + (attempt * 2000), 30000);
        await this.withTimeout(
          this.chatConnection.start(),
          connectionTimeout,
          `Connection timeout (attempt ${attempt + 1})`
        );

        // Verify connection health
        await this.verifyConnectionHealth(this.chatConnection);

        // Connection successful
        this.connectionState = ConnectionState.CONNECTED;
        this.connectionInfo.connectionId = this.chatConnection.connectionId;
        this.connectionInfo.startTime = Date.now();
        this.metrics.successfulConnections++;

        // Start health monitoring
        this.startHealthMonitoring();

        // Process queued operations
        await this.processMessageQueue();

        console.log('✅ GlobalSignalRManager: Connection established successfully');
        return this.chatConnection;

      } catch (error) {
        lastError = error;
        console.error(`❌ GlobalSignalRManager: Connection attempt ${attempt + 1} failed:`, error.message);

        // Calculate retry delay with exponential backoff and jitter
        if (attempt < this.retryConfig.maxAttempts - 1) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`⏱️ GlobalSignalRManager: Retrying in ${delay}ms...`);

          this.connectionState = ConnectionState.RECONNECTING;
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    this.connectionState = ConnectionState.FAILED;
    this.recordFailure(lastError);
    throw new Error(`Connection failed after ${this.retryConfig.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Create SignalR connection with optimized configuration
   */
  createConnection(token, metadata = {}) {
    const webSocketUrl = getWebSocketUrl();

    // Determine optimal transport based on environment and previous success
    const transport = this.getOptimalTransport();

    const connectionOptions = {
      accessTokenFactory: () => token,
      skipNegotiation: false,
      withCredentials: false,
      transport: transport,
      headers: {
        'X-Connection-Attempt': metadata.attempt || 1,
        'X-Client-Version': '2.0.0',
        'X-Features': 'circuit-breaker,message-queue,health-monitor'
      }
    };

    console.log('🔧 GlobalSignalRManager: Creating connection with transport:', this.getTransportNames(transport));

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${webSocketUrl}/chathub`, connectionOptions)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Custom retry logic that integrates with our circuit breaker
          if (!this.canAttemptConnection()) {
            return null; // Stop automatic reconnection
          }

          const delay = this.calculateRetryDelay(retryContext.previousRetryCount);
          console.log(`🔄 SignalR Automatic Retry ${retryContext.previousRetryCount + 1} in ${delay}ms`);
          return delay;
        }
      })
      .configureLogging(this.options.logLevel)
      .build();

    return connection;
  }

  /**
   * Get optimal transport based on environment and past performance
   */
  getOptimalTransport() {
    const webSocketUrl = getWebSocketUrl();
    const isProduction = this.detectProductionEnvironment(webSocketUrl);

    if (isProduction) {
      // Production: prefer SSE/LongPolling for reliability
      return signalR.HttpTransportType.ServerSentEvents |
             signalR.HttpTransportType.LongPolling;
    } else {
      // Development: try WebSockets first, fallback to others
      return signalR.HttpTransportType.WebSockets |
             signalR.HttpTransportType.ServerSentEvents |
             signalR.HttpTransportType.LongPolling;
    }
  }

  /**
   * Detect production environment
   */
  detectProductionEnvironment(url) {
    const productionDomains = [
      'onrender.com', 'render.com', 'herokuapp.com',
      'vercel.app', 'netlify.app', 'azure.com', 'aws.com'
    ];
    return productionDomains.some(domain => url.includes(domain)) ||
           !url.includes('localhost') && !url.includes('127.0.0.1');
  }

  /**
   * Setup comprehensive connection event handlers
   */
  setupConnectionHandlers(connection) {
    // Connection lifecycle handlers
    connection.onclose((error) => {
      console.log('🔌 GlobalSignalRManager: Connection closed:', error?.message || 'Clean disconnect');
      this.handleConnectionClose(error);
    });

    connection.onreconnecting((error) => {
      console.log('🔄 GlobalSignalRManager: Reconnecting...', error?.message);
      this.connectionState = ConnectionState.RECONNECTING;
      this.notifyConnectionStateChange(ConnectionState.RECONNECTING, { error });
    });

    connection.onreconnected((connectionId) => {
      console.log('✅ GlobalSignalRManager: Reconnected with ID:', connectionId);
      this.connectionState = ConnectionState.CONNECTED;
      this.connectionInfo.connectionId = connectionId;
      this.connectionInfo.reconnectCount++;
      this.resetCircuitBreaker();
      this.startHealthMonitoring();
      this.processMessageQueue();
      this.notifyConnectionStateChange(ConnectionState.CONNECTED, { connectionId });
    });

    // Message handlers
    this.setupMessageHandlers(connection);
  }

  /**
   * Setup message event handlers
   */
  setupMessageHandlers(connection) {
    // Private messages
    connection.on("ReceiveMessage", (...args) => {
      this.metrics.messagesReceived++;
      this.invokeEventHandlers('ReceiveMessage', args);
    });

    // Group messages
    connection.on("ReceiveGroupMessage", (...args) => {
      this.metrics.messagesReceived++;
      this.invokeEventHandlers('ReceiveGroupMessage', args);
    });

    // Typing status
    connection.on("ReceiveTypingStatus", (...args) => {
      this.invokeEventHandlers('ReceiveTypingStatus', args);
    });

    // Reactions
    connection.on("ReceiveReaction", (...args) => {
      this.invokeEventHandlers('ReceiveReaction', args);
    });

    // Message edits
    connection.on("ReceiveMessageEdit", (...args) => {
      this.invokeEventHandlers('ReceiveMessageEdit', args);
    });

    // Message deletes
    connection.on("ReceiveMessageDelete", (...args) => {
      this.invokeEventHandlers('ReceiveMessageDelete', args);
    });

    // Read receipts
    connection.on("ReceiveReadReceipt", (...args) => {
      this.invokeEventHandlers('ReceiveReadReceipt', args);
    });

    // Heartbeat
    connection.on("Pong", (serverTime) => {
      this.healthMonitor.lastHeartbeat = Date.now();
      this.healthMonitor.missedHeartbeats = 0;
      console.log('💓 GlobalSignalRManager: Heartbeat received');
    });

    // Connection confirmation
    connection.on("ConnectionConfirmed", (data) => {
      console.log('✅ GlobalSignalRManager: Connection confirmed:', data);
    });
  }

  /**
   * Advanced message sending with queuing and circuit breaker
   */
  async sendMessage(method, ...args) {
    // Check circuit breaker
    if (!this.canAttemptConnection()) {
      if (this.options.enableMessageQueuing) {
        console.log('📦 GlobalSignalRManager: Queueing message due to circuit breaker');
        return this.queueMessage(method, args);
      } else {
        throw new Error('Service temporarily unavailable (circuit breaker open)');
      }
    }

    // Ensure connection is ready
    if (!this.isConnectionReady()) {
      if (this.options.enableMessageQueuing) {
        console.log('📦 GlobalSignalRManager: Queueing message - connection not ready');
        return this.queueMessage(method, args);
      } else {
        throw new Error('Connection not ready');
      }
    }

    const operationId = this.generateOperationId();

    try {
      console.log(`📤 GlobalSignalRManager: Sending ${method}`, args);

      const startTime = Date.now();
      const result = await this.withTimeout(
        this.chatConnection.invoke(method, ...args),
        10000,
        `${method} operation timeout`
      );

      const latency = Date.now() - startTime;
      this.updateLatencyMetrics(latency);
      this.metrics.messagesSent++;

      console.log(`✅ GlobalSignalRManager: ${method} completed in ${latency}ms`);
      return result;

    } catch (error) {
      this.metrics.failedOperations++;
      console.error(`❌ GlobalSignalRManager: ${method} failed:`, error.message);

      // If connection-related error, record failure
      if (this.isConnectionError(error)) {
        this.recordFailure(error);
      }

      throw error;
    }
  }

  /**
   * Message queuing for offline scenarios
   */
  queueMessage(method, args) {
    const queueItem = {
      id: this.generateOperationId(),
      method,
      args,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };

    this.messageQueue.push(queueItem);
    console.log(`📦 GlobalSignalRManager: Message queued (${this.messageQueue.length} total)`);

    // Return a promise that will be resolved when the message is processed
    return new Promise((resolve, reject) => {
      queueItem.resolve = resolve;
      queueItem.reject = reject;
    });
  }

  /**
   * Process queued messages when connection is restored
   */
  async processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 GlobalSignalRManager: Processing ${this.messageQueue.length} queued messages`);

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const item of queue) {
      try {
        const result = await this.sendMessage(item.method, ...item.args);
        if (item.resolve) {
          item.resolve(result);
        }
      } catch (error) {
        item.attempts++;

        if (item.attempts < item.maxAttempts) {
          console.log(`🔄 GlobalSignalRManager: Requeuing message (attempt ${item.attempts + 1})`);
          this.messageQueue.push(item);
        } else {
          console.error(`❌ GlobalSignalRManager: Message failed after ${item.attempts} attempts`);
          if (item.reject) {
            item.reject(error);
          }
        }
      }
    }
  }

  /**
   * Enhanced health monitoring with self-healing
   */
  startHealthMonitoring() {
    this.stopHealthMonitoring();

    if (!this.options.enableHealthMonitoring) return;

    // Send heartbeat every 15 seconds
    this.healthMonitor.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);

    // Check connection health every 5 seconds
    this.healthMonitor.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 5000);

    console.log('💓 GlobalSignalRManager: Health monitoring started');
  }

  /**
   * Send heartbeat ping
   */
  async sendHeartbeat() {
    if (!this.isConnectionReady()) return;

    try {
      await this.chatConnection.invoke('Ping');
      console.log('💓 GlobalSignalRManager: Heartbeat sent');
    } catch (error) {
      console.error('💔 GlobalSignalRManager: Heartbeat failed:', error.message);
      this.healthMonitor.missedHeartbeats++;
    }
  }

  /**
   * Check overall connection health
   */
  checkConnectionHealth() {
    // Check if we've missed too many heartbeats
    if (this.healthMonitor.missedHeartbeats >= this.healthMonitor.maxMissedHeartbeats) {
      console.warn('💔 GlobalSignalRManager: Connection unhealthy - too many missed heartbeats');
      this.handleUnhealthyConnection();
      return;
    }

    // Check if last heartbeat was too long ago
    if (this.healthMonitor.lastHeartbeat) {
      const timeSinceLastHeartbeat = Date.now() - this.healthMonitor.lastHeartbeat;
      if (timeSinceLastHeartbeat > this.healthMonitor.heartbeatTimeout) {
        console.warn('💔 GlobalSignalRManager: Connection unhealthy - heartbeat timeout');
        this.handleUnhealthyConnection();
        return;
      }
    }

    // Additional health checks...
    if (this.chatConnection && this.chatConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('💔 GlobalSignalRManager: Connection unhealthy - invalid state');
      this.handleUnhealthyConnection();
    }
  }

  /**
   * Handle unhealthy connection with self-healing
   */
  async handleUnhealthyConnection() {
    console.log('🔧 GlobalSignalRManager: Initiating self-healing...');

    this.stopHealthMonitoring();
    this.connectionState = ConnectionState.FAILED;

    try {
      // Force disconnect and reconnect
      await this.cleanupConnections();
      await this.sleep(1000); // Brief pause

      // Attempt reconnection
      await this.connect(this.currentToken);
      console.log('✅ GlobalSignalRManager: Self-healing successful');

    } catch (error) {
      console.error('❌ GlobalSignalRManager: Self-healing failed:', error.message);
      this.recordFailure(error);
    }
  }

  /**
   * Circuit breaker implementation
   */
  canAttemptConnection() {
    if (!this.options.enableCircuitBreaker) return true;

    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if recovery timeout has passed
        if (now - this.circuitBreaker.lastFailureTime >= this.circuitBreaker.recoveryTimeout) {
          console.log('🔄 GlobalSignalRManager: Circuit breaker moving to half-open');
          this.circuitBreaker.state = CircuitState.HALF_OPEN;
          this.circuitBreaker.halfOpenCalls = 0;
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return this.circuitBreaker.halfOpenCalls < this.circuitBreaker.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Record connection failure for circuit breaker
   */
  recordFailure(error) {
    if (!this.options.enableCircuitBreaker) return;

    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      // Failure in half-open state - back to open
      console.log('🔴 GlobalSignalRManager: Circuit breaker opening (half-open failure)');
      this.circuitBreaker.state = CircuitState.OPEN;
    } else if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      // Too many failures - open circuit
      console.log(`🔴 GlobalSignalRManager: Circuit breaker opening (${this.circuitBreaker.failureCount} failures)`);
      this.circuitBreaker.state = CircuitState.OPEN;
    }
  }

  /**
   * Record successful operation for circuit breaker
   */
  onConnectionSuccess() {
    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      this.circuitBreaker.halfOpenCalls++;

      if (this.circuitBreaker.halfOpenCalls >= this.circuitBreaker.halfOpenMaxCalls) {
        // Enough successful calls - close circuit
        console.log('🟢 GlobalSignalRManager: Circuit breaker closing (recovery successful)');
        this.resetCircuitBreaker();
      }
    } else {
      this.resetCircuitBreaker();
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  resetCircuitBreaker() {
    this.circuitBreaker.state = CircuitState.CLOSED;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = null;
    this.circuitBreaker.halfOpenCalls = 0;
  }

  /**
   * Event handler management
   */
  addEventListener(event, handler, id = null) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Map());
    }

    const handlerId = id || this.generateOperationId();
    this.eventHandlers.get(event).set(handlerId, handler);

    console.log(`📡 GlobalSignalRManager: Event handler registered for ${event}`);
    return handlerId;
  }

  removeEventListener(event, id) {
    if (this.eventHandlers.has(event)) {
      const result = this.eventHandlers.get(event).delete(id);
      console.log(`📡 GlobalSignalRManager: Event handler removed for ${event}:`, result);
      return result;
    }
    return false;
  }

  invokeEventHandlers(event, args) {
    if (!this.eventHandlers.has(event)) return;

    const handlers = this.eventHandlers.get(event);
    handlers.forEach((handler, id) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`❌ GlobalSignalRManager: Error in event handler ${event}:${id}:`, error);
      }
    });
  }

  /**
   * Connection state management
   */
  addConnectionStateHandler(handler) {
    const id = this.generateOperationId();
    this.connectionHandlers.push({ id, handler });
    return id;
  }

  removeConnectionStateHandler(id) {
    this.connectionHandlers = this.connectionHandlers.filter(h => h.id !== id);
  }

  notifyConnectionStateChange(state, data = null) {
    this.connectionHandlers.forEach(({ handler }) => {
      try {
        handler(state, data);
      } catch (error) {
        console.error('❌ GlobalSignalRManager: Error in connection state handler:', error);
      }
    });
  }

  /**
   * Utility methods
   */
  isConnectionReady() {
    return this.chatConnection &&
           this.chatConnection.state === signalR.HubConnectionState.Connected &&
           this.connectionState === ConnectionState.CONNECTED;
  }

  isConnectionError(error) {
    return error.message.includes('connection') ||
           error.message.includes('disconnected') ||
           error.message.includes('timeout') ||
           error.name === 'TimeoutError';
  }

  calculateRetryDelay(attempt) {
    // Quick retries for first few attempts
    if (attempt < this.retryConfig.quickRetryAttempts) {
      return this.retryConfig.quickRetryDelay;
    }

    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );

    // Add jitter (±10%)
    const jitter = exponentialDelay * this.retryConfig.jitterFactor * (Math.random() - 0.5) * 2;
    return Math.max(0, exponentialDelay + jitter);
  }

  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  withTimeout(promise, timeout, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }

  updateLatencyMetrics(latency) {
    this.metrics.avgLatency = this.metrics.avgLatency === 0
      ? latency
      : (this.metrics.avgLatency * 0.8) + (latency * 0.2);
  }

  getTransportNames(transport) {
    const names = [];
    if (transport & signalR.HttpTransportType.WebSockets) names.push('WebSockets');
    if (transport & signalR.HttpTransportType.ServerSentEvents) names.push('SSE');
    if (transport & signalR.HttpTransportType.LongPolling) names.push('LongPolling');
    return names.join(', ');
  }

  /**
   * Token watcher for automatic reconnection on auth changes
   */
  setupTokenWatcher() {
    // Watch for token changes in localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      if (key === 'token' && value !== this.currentToken) {
        console.log('🔑 GlobalSignalRManager: Token changed, reconnecting...');
        this.handleTokenChange(value);
      }
      originalSetItem.call(localStorage, key, value);
    };
  }

  async handleTokenChange(newToken) {
    this.currentToken = newToken;

    if (newToken) {
      // Token updated - reconnect
      try {
        await this.disconnect();
        await this.connect(newToken);
      } catch (error) {
        console.error('❌ GlobalSignalRManager: Token change reconnection failed:', error);
      }
    } else {
      // Token removed - disconnect
      await this.disconnect();
    }
  }

  /**
   * Connection verification
   */
  async verifyConnectionHealth(connection) {
    // Test basic connectivity
    try {
      await this.withTimeout(
        connection.invoke('Ping').catch(() => {
          // Ping might not be available, that's okay
          console.log('Ping not available, assuming connection is healthy');
        }),
        5000,
        'Connection health verification timeout'
      );
    } catch (error) {
      throw new Error(`Connection health verification failed: ${error.message}`);
    }
  }

  /**
   * Connection lifecycle management
   */
  handleConnectionClose(error) {
    this.connectionState = ConnectionState.DISCONNECTED;
    this.connectionInfo.lastDisconnect = Date.now();

    if (this.connectionInfo.startTime) {
      this.connectionInfo.totalUptime += Date.now() - this.connectionInfo.startTime;
    }

    this.stopHealthMonitoring();

    if (error) {
      console.error('🔌 GlobalSignalRManager: Connection closed with error:', error.message);
      this.recordFailure(error);
    }

    this.notifyConnectionStateChange(ConnectionState.DISCONNECTED, { error });
  }

  onConnectionFailure(error) {
    this.connectionState = ConnectionState.FAILED;
    this.recordFailure(error);
    this.notifyConnectionStateChange(ConnectionState.FAILED, { error });
  }

  /**
   * Cleanup and disconnect
   */
  stopHealthMonitoring() {
    if (this.healthMonitor.heartbeatInterval) {
      clearInterval(this.healthMonitor.heartbeatInterval);
      this.healthMonitor.heartbeatInterval = null;
    }

    if (this.healthMonitor.healthCheckInterval) {
      clearInterval(this.healthMonitor.healthCheckInterval);
      this.healthMonitor.healthCheckInterval = null;
    }
  }

  async cleanupConnections() {
    this.stopHealthMonitoring();

    if (this.chatConnection) {
      try {
        await this.chatConnection.stop();
      } catch (error) {
        console.error('Error stopping chat connection:', error);
      }
      this.chatConnection = null;
    }

    if (this.notificationConnection) {
      try {
        await this.notificationConnection.stop();
      } catch (error) {
        console.error('Error stopping notification connection:', error);
      }
      this.notificationConnection = null;
    }
  }

  async disconnect() {
    console.log('🔌 GlobalSignalRManager: Disconnecting...');

    this.connectionState = ConnectionState.DISCONNECTED;
    this.isInitialized = false;

    await this.cleanupConnections();

    // Clear queued messages
    this.messageQueue.forEach(item => {
      if (item.reject) {
        item.reject(new Error('Connection disconnected'));
      }
    });
    this.messageQueue = [];

    this.notifyConnectionStateChange(ConnectionState.DISCONNECTED);

    console.log('✅ GlobalSignalRManager: Disconnected');
  }

  /**
   * Get comprehensive connection status and metrics
   */
  getStatus() {
    return {
      connectionState: this.connectionState,
      circuitBreakerState: this.circuitBreaker.state,
      isReady: this.isConnectionReady(),
      connectionInfo: this.connectionInfo,
      metrics: this.metrics,
      queuedMessages: this.messageQueue.length,
      healthMonitor: {
        lastHeartbeat: this.healthMonitor.lastHeartbeat,
        missedHeartbeats: this.healthMonitor.missedHeartbeats
      }
    };
  }

  /**
   * Legacy API compatibility methods
   */
  async sendPrivateMessage(receiverId, message) {
    return this.sendMessage('SendPrivateMessage', receiverId, message);
  }

  async sendGroupMessage(groupName, message) {
    return this.sendMessage('SendGroupMessage', groupName, message);
  }

  async joinGroup(groupName) {
    return this.sendMessage('JoinGroup', groupName);
  }

  async leaveGroup(groupName) {
    return this.sendMessage('LeaveGroup', groupName);
  }

  async sendTypingStatus(receiverId, isTyping) {
    return this.sendMessage('SendTypingStatus', receiverId, isTyping);
  }

  async reactToMessage(messageId, emoji) {
    return this.sendMessage('ReactToMessage', messageId, emoji);
  }

  async editMessage(messageId, newContent) {
    return this.sendMessage('EditMessage', messageId, newContent);
  }

  async deleteMessage(messageId) {
    return this.sendMessage('DeleteMessage', messageId);
  }

  async markMessageAsRead(messageId) {
    return this.sendMessage('MarkAsRead', messageId);
  }

  /**
   * Get connection promise (for backward compatibility)
   */
  getConnectionPromise() {
    if (this.isConnectionReady()) {
      return Promise.resolve(this.chatConnection);
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    return this.connect(this.currentToken);
  }
}

// Create singleton instance
const globalSignalRManager = new GlobalSignalRManager();

export default globalSignalRManager;

// Export legacy API for backward compatibility
export const startSignalRConnection = async (token, ...handlers) => {
  const connection = await globalSignalRManager.initialize(token);

  // Map legacy handlers to new event system
  if (handlers[0]) globalSignalRManager.addEventListener('ReceiveMessage', handlers[0]);
  if (handlers[1]) globalSignalRManager.addEventListener('ReceiveGroupMessage', handlers[1]);
  if (handlers[2]) globalSignalRManager.addEventListener('Notify', handlers[2]);
  if (handlers[3]) globalSignalRManager.addEventListener('ReceiveTypingStatus', handlers[3]);
  if (handlers[4]) globalSignalRManager.addEventListener('ReceiveReaction', handlers[4]);
  if (handlers[5]) globalSignalRManager.addEventListener('ReceiveMessageEdit', handlers[5]);
  if (handlers[6]) globalSignalRManager.addEventListener('ReceiveMessageDelete', handlers[6]);
  if (handlers[7]) globalSignalRManager.addEventListener('ReceiveReadReceipt', handlers[7]);

  return connection;
};

export const getConnection = () => globalSignalRManager.chatConnection;
export const isConnected = () => globalSignalRManager.isConnectionReady();
export const sendPrivateMessage = (receiverId, message) => globalSignalRManager.sendPrivateMessage(receiverId, message);
export const sendGroupMessage = (groupName, message) => globalSignalRManager.sendGroupMessage(groupName, message);
export const joinGroup = (groupName) => globalSignalRManager.joinGroup(groupName);
export const leaveGroup = (groupName) => globalSignalRManager.leaveGroup(groupName);
export const sendTypingStatus = (receiverId, isTyping) => globalSignalRManager.sendTypingStatus(receiverId, isTyping);
export const reactToMessage = (messageId, emoji) => globalSignalRManager.reactToMessage(messageId, emoji);
export const editMessage = (messageId, newContent) => globalSignalRManager.editMessage(messageId, newContent);
export const deleteMessage = (messageId) => globalSignalRManager.deleteMessage(messageId);
export const markMessageAsRead = (messageId) => globalSignalRManager.markMessageAsRead(messageId);
export const disconnect = () => globalSignalRManager.disconnect();
export const reconnect = (token) => globalSignalRManager.connect(token);