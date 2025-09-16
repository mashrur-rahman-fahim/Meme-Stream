/**
 * WebSocket Connection Reliability Tester
 *
 * This utility helps test and monitor WebSocket connection reliability
 * for both the enhanced and original SignalR services.
 */

import enhancedSignalRService from '../services/enhancedSignalRService';
import * as originalSignalRService from '../services/signalRService';

class WebSocketTester {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
    this.currentTest = null;
    this.testStartTime = null;
  }

  /**
   * Run comprehensive WebSocket reliability tests
   */
  async runReliabilityTests(token, options = {}) {
    const defaultOptions = {
      useEnhanced: true,
      testDuration: 60000, // 1 minute
      connectionAttempts: 5,
      messageCount: 10,
      disconnectTestCount: 3,
      logToConsole: true
    };

    const config = { ...defaultOptions, ...options };

    this.isRunning = true;
    this.testResults = [];
    this.testStartTime = Date.now();

    const log = (message, data = null) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        data
      };

      this.testResults.push(logEntry);

      if (config.logToConsole) {
        console.log(`[WebSocket Test] ${message}`, data || '');
      }
    };

    try {
      log('🚀 Starting WebSocket reliability tests', config);

      // Test 1: Basic connection reliability
      await this.testConnectionReliability(token, config, log);

      // Test 2: Message sending reliability
      await this.testMessageReliability(token, config, log);

      // Test 3: Reconnection behavior
      await this.testReconnectionBehavior(token, config, log);

      // Test 4: Heartbeat functionality (enhanced only)
      if (config.useEnhanced) {
        await this.testHeartbeatFunctionality(token, config, log);
      }

      // Test 5: Error handling
      await this.testErrorHandling(token, config, log);

      log('✅ All WebSocket reliability tests completed');

      return this.generateTestReport();

    } catch (error) {
      log('❌ WebSocket reliability tests failed', error.message);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test basic connection reliability
   */
  async testConnectionReliability(token, config, log) {
    log('🔍 Testing connection reliability...');

    const service = config.useEnhanced ? enhancedSignalRService : originalSignalRService;
    const successes = [];
    const failures = [];

    for (let i = 0; i < config.connectionAttempts; i++) {
      const startTime = Date.now();

      try {
        log(`Attempt ${i + 1}/${config.connectionAttempts}: Connecting...`);

        if (config.useEnhanced) {
          await service.connect(token, {
            onConnectionStateChanged: (state, data) => {
              log(`Connection state changed: ${state}`, data);
            }
          });
        } else {
          await service.startSignalRConnection(token,
            () => {}, // onPrivateMessage
            () => {}, // onGroupMessage
            () => {}, // onNotify
            () => {}, // onTypingStatus
            () => {}, // onReactionUpdate
            () => {}, // onMessageEdit
            () => {}, // onMessageDelete
            () => {}  // onReadReceipt
          );
        }

        const connectTime = Date.now() - startTime;
        successes.push(connectTime);

        log(`✅ Connection ${i + 1} successful (${connectTime}ms)`);

        // Disconnect for next attempt
        await service.disconnect();

        // Wait between attempts
        if (i < config.connectionAttempts - 1) {
          await this.wait(1000);
        }

      } catch (error) {
        const connectTime = Date.now() - startTime;
        failures.push({ attempt: i + 1, error: error.message, time: connectTime });

        log(`❌ Connection ${i + 1} failed (${connectTime}ms)`, error.message);
      }
    }

    const successRate = (successes.length / config.connectionAttempts) * 100;
    const avgConnectionTime = successes.length > 0
      ? successes.reduce((a, b) => a + b, 0) / successes.length
      : 0;

    log('📊 Connection reliability results', {
      successRate: `${successRate}%`,
      avgConnectionTime: `${avgConnectionTime.toFixed(2)}ms`,
      successes: successes.length,
      failures: failures.length,
      failureDetails: failures
    });

    return { successRate, avgConnectionTime, successes, failures };
  }

  /**
   * Test message sending reliability
   */
  async testMessageReliability(token, config, log) {
    log('🔍 Testing message reliability...');

    const service = config.useEnhanced ? enhancedSignalRService : originalSignalRService;
    let receivedMessages = [];

    try {
      // Connect with message handlers
      if (config.useEnhanced) {
        await service.connect(token, {
          onPrivateMessage: (senderId, message, messageId, sentAt) => {
            receivedMessages.push({ senderId, message, messageId, sentAt, type: 'private' });
            log('📨 Received private message', { senderId, message, messageId });
          }
        });
      } else {
        await service.startSignalRConnection(token,
          (senderId, message, messageId, sentAt) => {
            receivedMessages.push({ senderId, message, messageId, sentAt, type: 'private' });
            log('📨 Received private message', { senderId, message, messageId });
          },
          () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}
        );
      }

      // Wait for connection to stabilize
      await this.wait(2000);

      // Send test messages (to self for testing)
      const testMessages = [];
      const currentUserId = this.extractUserIdFromToken(token);

      for (let i = 0; i < config.messageCount; i++) {
        const testMessage = `Test message ${i + 1} - ${Date.now()}`;
        const startTime = Date.now();

        try {
          if (config.useEnhanced) {
            await service.sendPrivateMessage(currentUserId.toString(), testMessage);
          } else {
            await service.sendPrivateMessage(currentUserId.toString(), testMessage);
          }

          testMessages.push({
            id: i + 1,
            message: testMessage,
            sentAt: startTime,
            sent: true
          });

          log(`📤 Sent message ${i + 1}`);

        } catch (error) {
          testMessages.push({
            id: i + 1,
            message: testMessage,
            sentAt: startTime,
            sent: false,
            error: error.message
          });

          log(`❌ Failed to send message ${i + 1}`, error.message);
        }

        // Small delay between messages
        await this.wait(100);
      }

      // Wait for messages to be processed
      await this.wait(3000);

      const deliveryRate = (receivedMessages.length / testMessages.filter(m => m.sent).length) * 100;

      log('📊 Message reliability results', {
        deliveryRate: `${deliveryRate}%`,
        sentMessages: testMessages.filter(m => m.sent).length,
        receivedMessages: receivedMessages.length,
        failedMessages: testMessages.filter(m => !m.sent).length
      });

      return { deliveryRate, testMessages, receivedMessages };

    } finally {
      await service.disconnect();
    }
  }

  /**
   * Test reconnection behavior
   */
  async testReconnectionBehavior(token, config, log) {
    log('🔍 Testing reconnection behavior...');

    const service = config.useEnhanced ? enhancedSignalRService : originalSignalRService;
    const reconnectionEvents = [];

    try {
      // Connect with state tracking
      if (config.useEnhanced) {
        await service.connect(token, {
          onConnectionStateChanged: (state, data) => {
            reconnectionEvents.push({
              timestamp: Date.now(),
              state,
              data
            });
            log(`Reconnection event: ${state}`, data);
          }
        });
      } else {
        await service.startSignalRConnection(token,
          () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}
        );
      }

      // Wait for stable connection
      await this.wait(2000);

      for (let i = 0; i < config.disconnectTestCount; i++) {
        log(`Disconnect test ${i + 1}/${config.disconnectTestCount}`);

        // Force disconnect
        await service.disconnect();

        // Wait a bit
        await this.wait(1000);

        // Reconnect
        const reconnectStartTime = Date.now();

        try {
          if (config.useEnhanced) {
            await service.connect(token, {
              onConnectionStateChanged: (state, data) => {
                reconnectionEvents.push({
                  timestamp: Date.now(),
                  state,
                  data
                });
              }
            });
          } else {
            await service.startSignalRConnection(token,
              () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}
            );
          }

          const reconnectTime = Date.now() - reconnectStartTime;
          log(`✅ Reconnect ${i + 1} successful (${reconnectTime}ms)`);

        } catch (error) {
          log(`❌ Reconnect ${i + 1} failed`, error.message);
        }

        // Wait between tests
        if (i < config.disconnectTestCount - 1) {
          await this.wait(2000);
        }
      }

      log('📊 Reconnection behavior results', {
        totalEvents: reconnectionEvents.length,
        events: reconnectionEvents
      });

      return { reconnectionEvents };

    } finally {
      await service.disconnect();
    }
  }

  /**
   * Test heartbeat functionality (enhanced service only)
   */
  async testHeartbeatFunctionality(token, config, log) {
    log('🔍 Testing heartbeat functionality...');

    if (!config.useEnhanced) {
      log('⚠️ Skipping heartbeat test (not using enhanced service)');
      return { skipped: true };
    }

    let heartbeatCount = 0;
    const heartbeats = [];

    try {
      await enhancedSignalRService.connect(token, {
        onConnectionStateChanged: (state) => {
          log(`Heartbeat test connection state: ${state}`);
        }
      });

      // Monitor heartbeats for test duration
      const heartbeatMonitor = setInterval(() => {
        const connectionState = enhancedSignalRService.getConnectionState();
        const isHealthy = enhancedSignalRService.isConnected();

        heartbeats.push({
          timestamp: Date.now(),
          connectionState,
          isHealthy
        });

        if (isHealthy) {
          heartbeatCount++;
        }
      }, 1000);

      // Wait for test duration
      await this.wait(Math.min(config.testDuration, 30000)); // Max 30 seconds for heartbeat test

      clearInterval(heartbeatMonitor);

      log('📊 Heartbeat functionality results', {
        heartbeatCount,
        totalChecks: heartbeats.length,
        healthyPercentage: `${((heartbeatCount / heartbeats.length) * 100).toFixed(2)}%`,
        heartbeats
      });

      return { heartbeatCount, totalChecks: heartbeats.length, heartbeats };

    } finally {
      await enhancedSignalRService.disconnect();
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling(token, config, log) {
    log('🔍 Testing error handling...');

    const service = config.useEnhanced ? enhancedSignalRService : originalSignalRService;
    const errorTests = [];

    // Test 1: Invalid token
    try {
      log('Testing with invalid token...');

      if (config.useEnhanced) {
        await service.connect('invalid-token');
      } else {
        await service.startSignalRConnection('invalid-token',
          () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}
        );
      }

      errorTests.push({ test: 'invalid-token', result: 'unexpected-success' });
      log('⚠️ Invalid token test: Unexpected success');

    } catch (error) {
      errorTests.push({ test: 'invalid-token', result: 'expected-failure', error: error.message });
      log('✅ Invalid token test: Expected failure', error.message);
    }

    // Test 2: Connection to invalid URL (if possible to configure)
    // This would require modifying the service configuration

    log('📊 Error handling results', { errorTests });

    return { errorTests };
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.testStartTime;

    const report = {
      startTime: new Date(this.testStartTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
      testResults: this.testResults,
      summary: {
        totalTests: this.testResults.length,
        successfulTests: this.testResults.filter(r => r.message.includes('✅')).length,
        failedTests: this.testResults.filter(r => r.message.includes('❌')).length,
        warningTests: this.testResults.filter(r => r.message.includes('⚠️')).length
      }
    };

    console.log('📋 WebSocket Test Report:', report);

    return report;
  }

  /**
   * Compare enhanced vs original service performance
   */
  async compareServices(token, options = {}) {
    console.log('🔄 Comparing Enhanced vs Original SignalR Services...');

    const enhancedResults = await this.runReliabilityTests(token, {
      ...options,
      useEnhanced: true,
      logToConsole: false
    });

    await this.wait(5000); // Wait between tests

    const originalResults = await this.runReliabilityTests(token, {
      ...options,
      useEnhanced: false,
      logToConsole: false
    });

    const comparison = {
      enhanced: enhancedResults,
      original: originalResults,
      comparison: {
        connectionReliability: {
          enhancedBetter: enhancedResults.summary.successfulTests > originalResults.summary.successfulTests,
          difference: enhancedResults.summary.successfulTests - originalResults.summary.successfulTests
        }
      }
    };

    console.log('📊 Service Comparison Results:', comparison);

    return comparison;
  }

  /**
   * Utility methods
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  extractUserIdFromToken(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.nameid || payload.userId || '1'; // Fallback to '1' for testing
    } catch {
      return '1'; // Fallback for testing
    }
  }

  /**
   * Start continuous monitoring
   */
  startContinuousMonitoring(token, interval = 60000) {
    if (this.isRunning) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    console.log('🔄 Starting continuous WebSocket monitoring...');

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runReliabilityTests(token, {
          useEnhanced: true,
          testDuration: 10000,
          connectionAttempts: 1,
          messageCount: 3,
          disconnectTestCount: 1,
          logToConsole: false
        });
      } catch (error) {
        console.error('❌ Monitoring cycle failed:', error);
      }
    }, interval);
  }

  /**
   * Stop continuous monitoring
   */
  stopContinuousMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Stopped continuous WebSocket monitoring');
    }
  }
}

// Create singleton instance
const webSocketTester = new WebSocketTester();

export default webSocketTester;

// Usage examples:
/*
// Basic test
const results = await webSocketTester.runReliabilityTests(token);

// Compare services
const comparison = await webSocketTester.compareServices(token);

// Continuous monitoring
webSocketTester.startContinuousMonitoring(token, 30000); // Every 30 seconds
webSocketTester.stopContinuousMonitoring();
*/