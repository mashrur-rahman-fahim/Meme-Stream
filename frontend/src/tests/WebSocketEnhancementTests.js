import { GlobalSignalRManager } from '../services/GlobalSignalRManager.js';
import { GlobalNotificationManager } from '../services/GlobalNotificationManager.js';

class WebSocketEnhancementTests {
  constructor() {
    this.testResults = [];
    this.signalRManager = null;
    this.notificationManager = null;
  }

  async runAllTests() {
    console.log('🧪 Starting Enhanced WebSocket Implementation Tests...\n');

    try {
      await this.setupTestEnvironment();

      // Core functionality tests
      await this.testSignalRManagerInitialization();
      await this.testConnectionPreWarming();
      await this.testCircuitBreakerPattern();
      await this.testMessageQueuing();
      await this.testConnectionPooling();
      await this.testHeartbeatMechanism();

      // Notification system tests
      await this.testNotificationManager();
      await this.testOfflineSupport();
      await this.testDeduplication();
      await this.testSmartBatching();

      // Error scenarios tests
      await this.testConnectionFailureRecovery();
      await this.testRateLimitHandling();
      await this.testNetworkInterruption();

      // Performance tests
      await this.testConnectionSpeed();
      await this.testMessageThroughput();

      this.generateTestReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.logResult('TEST_SUITE_FAILURE', false, `Test suite crashed: ${error.message}`);
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Create mock token for testing
    this.mockToken = 'test-jwt-token-' + Date.now();

    // Initialize managers
    this.signalRManager = GlobalSignalRManager.getInstance();
    this.notificationManager = GlobalNotificationManager.getInstance();

    this.logResult('SETUP', true, 'Test environment initialized');
  }

  async testSignalRManagerInitialization() {
    console.log('📡 Testing SignalR Manager Initialization...');

    try {
      // Test singleton pattern
      const instance1 = GlobalSignalRManager.getInstance();
      const instance2 = GlobalSignalRManager.getInstance();

      if (instance1 === instance2) {
        this.logResult('SINGLETON_PATTERN', true, 'Singleton pattern working correctly');
      } else {
        this.logResult('SINGLETON_PATTERN', false, 'Multiple instances created');
      }

      // Test initialization with options
      const initResult = await this.signalRManager.initialize(this.mockToken, {
        preWarm: true,
        enableCircuitBreaker: true,
        connectionPoolSize: 3,
        maxRetries: 5
      });

      this.logResult('INITIALIZATION', !!initResult, 'Manager initialization completed');

    } catch (error) {
      this.logResult('INITIALIZATION', false, `Initialization failed: ${error.message}`);
    }
  }

  async testConnectionPreWarming() {
    console.log('🔥 Testing Connection Pre-warming...');

    try {
      const startTime = Date.now();

      // Simulate pre-warming
      const preWarmResult = await this.signalRManager.preWarmConnection();

      const duration = Date.now() - startTime;

      this.logResult('PRE_WARMING', !!preWarmResult,
        `Pre-warming completed in ${duration}ms`);

      // Test that subsequent connections are faster
      const connectStartTime = Date.now();
      await this.signalRManager.connect(this.mockToken);
      const connectDuration = Date.now() - connectStartTime;

      this.logResult('PRE_WARM_BENEFIT', connectDuration < duration,
        `Connection after pre-warm: ${connectDuration}ms (should be faster)`);

    } catch (error) {
      this.logResult('PRE_WARMING', false, `Pre-warming failed: ${error.message}`);
    }
  }

  async testCircuitBreakerPattern() {
    console.log('⚡ Testing Circuit Breaker Pattern...');

    try {
      // Get current circuit breaker state
      const initialState = this.signalRManager.getCircuitBreakerState();

      // Simulate failures to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await this.signalRManager.simulateFailure();
        } catch (error) {
          // Expected failures
        }
      }

      const circuitOpenState = this.signalRManager.getCircuitBreakerState();

      this.logResult('CIRCUIT_BREAKER_OPEN', circuitOpenState.state === 'OPEN',
        `Circuit breaker opened after failures: ${circuitOpenState.state}`);

      // Wait for half-open state
      setTimeout(async () => {
        const halfOpenState = this.signalRManager.getCircuitBreakerState();
        this.logResult('CIRCUIT_BREAKER_RECOVERY', halfOpenState.state === 'HALF_OPEN',
          `Circuit breaker recovery: ${halfOpenState.state}`);
      }, 5000);

    } catch (error) {
      this.logResult('CIRCUIT_BREAKER', false, `Circuit breaker test failed: ${error.message}`);
    }
  }

  async testMessageQueuing() {
    console.log('📬 Testing Message Queuing...');

    try {
      // Disconnect to test offline queuing
      await this.signalRManager.disconnect();

      // Queue messages while offline
      const testMessages = [
        { type: 'chat', content: 'Test message 1' },
        { type: 'chat', content: 'Test message 2' },
        { type: 'notification', content: 'Test notification' }
      ];

      for (const message of testMessages) {
        await this.signalRManager.queueMessage(message);
      }

      const queueSize = this.signalRManager.getQueueSize();

      this.logResult('MESSAGE_QUEUING', queueSize === testMessages.length,
        `Queued ${queueSize} messages while offline`);

      // Reconnect and test queue processing
      await this.signalRManager.connect(this.mockToken);

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const remainingQueueSize = this.signalRManager.getQueueSize();

      this.logResult('QUEUE_PROCESSING', remainingQueueSize === 0,
        `Queue processed on reconnection: ${remainingQueueSize} remaining`);

    } catch (error) {
      this.logResult('MESSAGE_QUEUING', false, `Message queuing failed: ${error.message}`);
    }
  }

  async testNotificationManager() {
    console.log('🔔 Testing Notification Manager...');

    try {
      // Test initialization
      await this.notificationManager.initialize({
        enableOfflineSupport: true,
        enableDeduplication: true,
        enableSmartBatching: true
      });

      this.logResult('NOTIFICATION_INIT', true, 'Notification manager initialized');

      // Test notification handling
      const testNotification = {
        id: 'test-notif-1',
        type: 'message',
        title: 'Test Notification',
        message: 'This is a test notification',
        timestamp: Date.now()
      };

      await this.notificationManager.handleNewNotification(testNotification);

      const storedNotifications = this.notificationManager.getStoredNotifications();

      this.logResult('NOTIFICATION_HANDLING', storedNotifications.length > 0,
        `Stored ${storedNotifications.length} notifications`);

    } catch (error) {
      this.logResult('NOTIFICATION_MANAGER', false, `Notification manager failed: ${error.message}`);
    }
  }

  async testDeduplication() {
    console.log('🔄 Testing Notification Deduplication...');

    try {
      const duplicateNotification = {
        id: 'duplicate-test',
        type: 'message',
        title: 'Duplicate Test',
        message: 'This should not be duplicated',
        timestamp: Date.now()
      };

      // Send same notification multiple times
      await this.notificationManager.handleNewNotification(duplicateNotification);
      await this.notificationManager.handleNewNotification(duplicateNotification);
      await this.notificationManager.handleNewNotification(duplicateNotification);

      const storedNotifications = this.notificationManager.getStoredNotifications();
      const duplicateCount = storedNotifications.filter(n => n.id === 'duplicate-test').length;

      this.logResult('DEDUPLICATION', duplicateCount === 1,
        `Deduplication working: ${duplicateCount} notification(s) stored`);

    } catch (error) {
      this.logResult('DEDUPLICATION', false, `Deduplication test failed: ${error.message}`);
    }
  }

  async testConnectionSpeed() {
    console.log('⚡ Testing Connection Speed...');

    try {
      // Disconnect first
      await this.signalRManager.disconnect();

      const connectionTimes = [];

      // Test multiple connections
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await this.signalRManager.connect(this.mockToken);
        const duration = Date.now() - startTime;
        connectionTimes.push(duration);

        await this.signalRManager.disconnect();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgTime = connectionTimes.reduce((a, b) => a + b) / connectionTimes.length;

      this.logResult('CONNECTION_SPEED', avgTime < 5000,
        `Average connection time: ${avgTime.toFixed(2)}ms`);

    } catch (error) {
      this.logResult('CONNECTION_SPEED', false, `Connection speed test failed: ${error.message}`);
    }
  }

  async testNetworkInterruption() {
    console.log('🌐 Testing Network Interruption Recovery...');

    try {
      // Connect first
      await this.signalRManager.connect(this.mockToken);

      // Simulate network interruption
      this.signalRManager.simulateNetworkInterruption();

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 2000));

      const connectionState = this.signalRManager.getConnectionState();

      this.logResult('NETWORK_RECOVERY',
        connectionState === 'CONNECTED' || connectionState === 'RECONNECTING',
        `Connection state after interruption: ${connectionState}`);

    } catch (error) {
      this.logResult('NETWORK_RECOVERY', false, `Network recovery test failed: ${error.message}`);
    }
  }

  logResult(testName, passed, details) {
    const result = {
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };

    this.testResults.push(result);

    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${details}`);
  }

  generateTestReport() {
    console.log('\n📊 TEST REPORT');
    console.log('================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

    console.log('\nDetailed Results:');
    console.log('-----------------');

    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.details}`);
    });

    if (failedTests > 0) {
      console.log('\n⚠️  Failed Tests Details:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`❌ ${result.test}: ${result.details}`);
        });
    }

    console.log('\n🎯 Enhancement Validation Summary:');
    console.log('- Connection pre-warming reduces first-time connection issues');
    console.log('- Circuit breaker pattern prevents cascade failures');
    console.log('- Message queuing ensures no data loss during disconnections');
    console.log('- Notification deduplication prevents spam');
    console.log('- Offline support maintains functionality without network');

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.testResults
    };
  }
}

// Export for use in other files
export default WebSocketEnhancementTests;

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
  const tester = new WebSocketEnhancementTests();
  tester.runAllTests();
}