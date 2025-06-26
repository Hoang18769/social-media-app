import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { getAuthToken, isTokenValid, onTokenRefresh, clearSession } from "./axios";
import api from "./axios";

// Singleton STOMP Client
class StompClientSingleton {
  constructor() {
    this.client = null;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.subscribers = new Map(); // Track all subscriptions
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.tokenRefreshPromise = null;
    this.tokenRefreshListeners = [];
    
    // Configuration
    this.config = {
      url: process.env.NEXT_PUBLIC_SOCKET_ENDPOINT || "http://localhost/ws",
      reconnectDelay: 5000,
      maxReconnectAttempts: 5,
    };

    // Listen for token refresh events
    this.setupTokenRefreshListener();
  }

  // Initialize the STOMP client
  initializeClient() {
    if (this.client) {
      return this.client;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(this.config.url),
      connectHeaders: {
        Authorization: "Bearer " + (getAuthToken() || ""),
      },
      debug: (str) => console.log("[STOMP DEBUG]", str),
      reconnectDelay: this.config.reconnectDelay,
      
      onConnect: (frame) => {
        console.log("✅ STOMP connected", frame);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        // Resubscribe to all previous subscriptions
        this.resubscribeAll();
      },
      
      onDisconnect: () => {
        console.warn("⚠️ STOMP disconnected");
        this.isConnecting = false;
      },
      
      onWebSocketClose: (event) => {
        console.warn("⚠️ WebSocket closed:", event);
        this.isConnecting = false;
      },
      
      onWebSocketError: (event) => {
        console.error("❌ WebSocket error:", event);
        this.isConnecting = false;
      },
      
      onStompError: (frame) => {
        console.error("❌ STOMP error:", frame.headers["message"] || frame.body);
        this.isConnecting = false;
        
        if (this.isAuthenticationError(frame)) {
          console.log("🔄 Authentication error detected. Attempting token refresh...");
          this.handleAuthError();
        }
      },
      
      beforeConnect: async () => {
        console.log("🔌 STOMP preparing to connect...");
        try {
          const token = await this.ensureValidToken();
          this.client.connectHeaders = {
            Authorization: "Bearer " + (token || ""),
          };
          console.log("✅ STOMP headers updated with valid token");
        } catch (error) {
          console.error("❌ Failed to get valid token for STOMP:", error);
        }
      }
    });

    return this.client;
  }

  // Get or create the singleton instance
  async getInstance() {
    if (!this.client) {
      this.initializeClient();
    }

    if (!this.client.connected && !this.isConnecting) {
      return await this.connect();
    }

    if (this.isConnecting) {
      return await this.connectionPromise;
    }

    return this.client;
  }

  // Connect to STOMP server
  async connect() {
    if (this.client?.connected) {
      return this.client;
    }

    if (this.isConnecting) {
      return await this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      const client = this.initializeClient();
      
      const onConnected = () => {
        client.onConnect = this.client.onConnect; // Restore original handler
        resolve(client);
      };
      
      const onError = (error) => {
        this.isConnecting = false;
        reject(error);
      };

      // Temporary handlers for this connection attempt
      const originalOnConnect = client.onConnect;
      client.onConnect = (frame) => {
        originalOnConnect(frame);
        onConnected();
      };

      const originalOnStompError = client.onStompError;
      client.onStompError = (frame) => {
        originalOnStompError(frame);
        onError(new Error(`STOMP Error: ${frame.headers["message"] || frame.body}`));
      };

      client.activate();
      
      // Timeout fallback
      setTimeout(() => {
        if (this.isConnecting) {
          onError(new Error("Connection timeout"));
        }
      }, 10000);
    });

    try {
      return await this.connectionPromise;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  // Disconnect from STOMP server
  async disconnect() {
    if (this.client?.active) {
      console.log("🔌 Disconnecting STOMP client...");
      await this.client.deactivate();
    }
    
    this.subscribers.clear();
    this.isConnecting = false;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
  }

  // Send message with automatic connection handling
  async sendMessage(destination, message, headers = {}) {
    try {
      const client = await this.getInstance();
      
      if (!client.connected) {
        console.error("❌ Unable to establish connection. Cannot send message.");
        return false;
      }

      const token = await this.ensureValidToken();
      
      client.publish({
        destination,
        body: JSON.stringify(message),
        headers: {
          'content-type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...headers,
        },
      });
      
      console.log("✅ Message sent successfully to", destination);
      return true;
    } catch (error) {
      console.error("❌ Error sending message:", error);
      return false;
    }
  }

  // Subscribe to channel with automatic connection handling
  async subscribe(destination, callback, headers = {}) {
    try {
      const client = await this.getInstance();
      
      if (!client.connected) {
        console.error("❌ Client not connected. Cannot subscribe.");
        return null;
      }

      const subscription = client.subscribe(destination, callback, headers);
      
      // Store subscription info for resubscription after reconnect
      this.subscribers.set(destination, {
        callback,
        headers,
        subscription
      });
      
      console.log("✅ Subscribed to", destination);
      return subscription;
    } catch (error) {
      console.error("❌ Error subscribing to channel:", error);
      return null;
    }
  }

  // Unsubscribe from channel
  unsubscribe(destination) {
    const subscriberInfo = this.subscribers.get(destination);
    if (subscriberInfo?.subscription) {
      subscriberInfo.subscription.unsubscribe();
      this.subscribers.delete(destination);
      console.log("✅ Unsubscribed from", destination);
    }
  }

  // Resubscribe to all channels after reconnection
  resubscribeAll() {
    console.log("🔄 Resubscribing to all channels...");
    
    for (const [destination, subscriberInfo] of this.subscribers) {
      try {
        const subscription = this.client.subscribe(
          destination,
          subscriberInfo.callback,
          subscriberInfo.headers
        );
        
        subscriberInfo.subscription = subscription;
        console.log("✅ Resubscribed to", destination);
      } catch (error) {
        console.error("❌ Error resubscribing to", destination, error);
      }
    }
  }

  // Handle authentication errors
  async handleAuthError() {
    try {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        console.error("❌ Max reconnection attempts reached. Clearing session...");
        clearSession();
        return;
      }

      const token = await this.ensureValidToken();
      
      if (token) {
        console.log("🔄 Got refreshed token, reconnecting STOMP...");
        this.client.connectHeaders = {
          Authorization: "Bearer " + token,
        };
        
        await this.disconnect();
        setTimeout(() => {
          this.connect();
        }, 1000);
      } else {
        console.error("❌ Unable to get valid token. Clearing session...");
        clearSession();
      }
    } catch (error) {
      console.error("❌ Error handling STOMP auth error:", error);
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        clearSession();
      }
    }
  }

  // Setup token refresh listener
  setupTokenRefreshListener() {
    const unsubscribe = onTokenRefresh((newToken) => {
      if (newToken && this.client?.connected) {
        console.log("🔄 Token refreshed, updating STOMP headers...");
        this.client.connectHeaders = {
          Authorization: "Bearer " + newToken,
        };
      } else if (!newToken) {
        console.log("🚪 Token cleared, disconnecting STOMP...");
        this.disconnect();
      }
    });

    this.tokenRefreshListeners.push(unsubscribe);
  }

  // Check if error is authentication related
  isAuthenticationError(frame) {
    const message = frame.headers["message"] || frame.body || "";
    return (
      message.includes("403") ||
      message.includes("401") ||
      message.includes("Unauthorized") ||
      message.includes("Access Denied") ||
      message.includes("Authentication")
    );
  }

  // Ensure valid token (same as original)
  async ensureValidToken(timeout = 5000) {
    const currentToken = getAuthToken();
    if (currentToken && isTokenValid()) {
      return currentToken;
    }

    if (this.tokenRefreshPromise) {
      console.log("🔄 Token refresh already in progress, waiting...");
      try {
        return await this.tokenRefreshPromise;
      } catch (error) {
        console.error("❌ Failed to wait for token refresh:", error);
        this.tokenRefreshPromise = null;
      }
    }

    console.log("🔄 Starting token refresh for STOMP...");
    
    this.tokenRefreshPromise = Promise.race([
      new Promise((resolve, reject) => {
        const unsubscribe = onTokenRefresh((newToken) => {
          unsubscribe();
          if (newToken && isTokenValid()) {
            resolve(newToken);
          } else {
            reject(new Error("Invalid token received"));
          }
        });

        this.triggerTokenRefresh().catch(() => {});

        setTimeout(() => {
          unsubscribe();
          reject(new Error("Token refresh timeout"));
        }, timeout);
      }),

      (async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return await this.forceTokenRefresh();
      })()
    ]);

    try {
      const token = await this.tokenRefreshPromise;
      console.log("✅ Token refresh successful for STOMP");
      return token;
    } catch (error) {
      console.error("❌ Token refresh failed for STOMP:", error);
      throw error;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  // Trigger token refresh
  async triggerTokenRefresh() {
    try {
      await api.get('/v1/auth/me');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("🔄 401 response received, token refresh should be triggered");
      }
      throw error;
    }
  }

  // Force token refresh
  async forceTokenRefresh() {
    try {
      const response = await api.post('/v1/auth/refresh', {}, {
        skipAuth: true,
        withCredentials: true
      });

      const newToken = response.data.body?.token;
      if (!newToken) {
        throw new Error("No token in refresh response");
      }

      const { setAuthToken, getUserId, getUserName } = await import('./axios');
      setAuthToken(newToken, getUserId(), getUserName());

      return newToken;
    } catch (error) {
      console.error("❌ Direct token refresh failed:", error);
      throw error;
    }
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.client) {
      this.client.reconnectDelay = this.config.reconnectDelay;
    }
  }

  // Get connection status
  isConnected() {
    return this.client?.connected || false;
  }

  // Get subscriber count
  getSubscriberCount() {
    return this.subscribers.size;
  }

  // Cleanup
  cleanup() {
    console.log("🧹 Cleaning up STOMP singleton...");
    
    this.tokenRefreshListeners.forEach(unsubscribe => unsubscribe());
    this.tokenRefreshListeners = [];
    
    this.disconnect();
    
    this.client = null;
    this.subscribers.clear();
  }
}

// Create singleton instance
const stompClientSingleton = new StompClientSingleton();

// Export functions for backward compatibility
export async function getStompClient() {
  return await stompClientSingleton.getInstance();
}

export async function sendMessage(destination, message, headers = {}) {
  return await stompClientSingleton.sendMessage(destination, message, headers);
}

export async function subscribe(destination, callback, headers = {}) {
  return await stompClientSingleton.subscribe(destination, callback, headers);
}

export function unsubscribe(destination) {
  return stompClientSingleton.unsubscribe(destination);
}

export async function connect() {
  return await stompClientSingleton.connect();
}

export async function disconnect() {
  return await stompClientSingleton.disconnect();
}

export function isConnected() {
  return stompClientSingleton.isConnected();
}

export function getSubscriberCount() {
  return stompClientSingleton.getSubscriberCount();
}

export function updateConfig(config) {
  return stompClientSingleton.updateConfig(config);
}

export function cleanup() {
  return stompClientSingleton.cleanup();
}

// Legacy function for backward compatibility
export function createStompClient(onConnect, options = {}) {
  console.warn("⚠️ createStompClient is deprecated. Use getStompClient() instead.");
  
  // Update config if provided
  if (Object.keys(options).length > 0) {
    stompClientSingleton.updateConfig(options);
  }
  
  // Return promise that resolves to client
  return stompClientSingleton.getInstance().then(client => {
    if (onConnect) {
      if (client.connected) {
        onConnect();
      } else {
        const originalOnConnect = client.onConnect;
        client.onConnect = (frame) => {
          originalOnConnect(frame);
          onConnect(frame);
        };
      }
    }
    return client;
  });
}

export function createBasicStompClient(onConnect) {
  console.warn("⚠️ createBasicStompClient is deprecated. Use getStompClient() instead.");
  return createStompClient(onConnect, {
    reconnectDelay: 3000,
    maxReconnectAttempts: 10
  });
}

// Export singleton instance for advanced usage
export { stompClientSingleton };

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stompClientSingleton.cleanup();
  });
}