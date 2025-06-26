// socketManager.js
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { 
  getAuthToken, 
  isTokenValid, 
  onTokenRefresh, 
  clearSession,
  setAuthToken,
  getUserId,
  getUserName
} from "@/utils/axios";
import api from "@/utils/axios";

class SocketManager {
  constructor() {
    this.client = null;
    this.isConnecting = false;
    this.subscribers = new Map(); // Map<destination, Set<callback>>
    this.messageQueue = []; // Queue messages when disconnected
    this.tokenRefreshPromise = null;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    
    // Listen for token refresh events
    this.setupTokenListener();
  }

  setupTokenListener() {
    this.unsubscribeTokenListener = onTokenRefresh((newToken) => {
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
  }

  async connect(options = {}) {
    // If already connected, return existing client
    if (this.client?.connected) {
      console.log("✅ STOMP already connected, reusing connection");
      return this.client;
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      console.log("⏳ Connection in progress, waiting...");
      return this.connectionPromise;
    }

    const {
      url = process.env.NEXT_PUBLIC_SOCKET_ENDPOINT || "http://localhost/ws",
      reconnectDelay = this.reconnectDelay,
      maxReconnectAttempts = this.maxReconnectAttempts,
      ...otherOptions
    } = options;

    this.connectionPromise = this._createConnection(url, {
      reconnectDelay,
      maxReconnectAttempts,
      ...otherOptions
    });

    try {
      const result = await this.connectionPromise;
      this.connectionPromise = null;
      return result;
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  async _createConnection(url, options) {
    console.log("🔌 Creating new STOMP connection...");
    
    try {
      // Ensure we have valid token before connecting
      const token = await this.ensureValidToken();
      
      this.client = new Client({
        webSocketFactory: () => new SockJS(url),
        connectHeaders: {
          Authorization: "Bearer " + (token || ""),
        },
        debug: (str) => console.log("[STOMP DEBUG]", str),
        reconnectDelay: options.reconnectDelay,
        onConnect: (frame) => {
          console.log("✅ STOMP connected", frame);
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          
          // Resubscribe to all channels
          this.resubscribeAll();
          
          // Process queued messages
          this.processMessageQueue();
        },
        onDisconnect: () => {
          console.warn("⚠️ STOMP disconnected");
          this.isConnecting = false;
        },
        onWebSocketClose: (event) => {
          console.warn("⚠️ WebSocket closed:", event);
          this.handleReconnect();
        },
        onWebSocketError: (event) => {
          console.error("❌ WebSocket error:", event);
        },
        onStompError: (frame) => {
          console.error("❌ STOMP error:", frame.headers["message"] || frame.body);
          
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
        },
        ...options
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        const originalOnConnect = this.client.onConnect;
        this.client.onConnect = (frame) => {
          clearTimeout(timeout);
          originalOnConnect(frame);
          resolve(this.client);
        };

        const originalOnStompError = this.client.onStompError;
        this.client.onStompError = (frame) => {
          clearTimeout(timeout);
          originalOnStompError(frame);
          reject(new Error(`STOMP Error: ${frame.headers["message"] || frame.body}`));
        };

        this.client.activate();
      });
    } catch (error) {
      console.error("❌ Failed to create STOMP connection:", error);
      throw error;
    }
  }

  subscribe(destination, callback, headers = {}) {
    // Store subscriber info for reconnection
    if (!this.subscribers.has(destination)) {
      this.subscribers.set(destination, new Set());
    }
    this.subscribers.get(destination).add(callback);

    // If connected, subscribe immediately
    if (this.client?.connected) {
      const subscription = this.client.subscribe(destination, callback, headers);
      
      // Store subscription reference with callback for cleanup
      callback._subscription = subscription;
      
      return subscription;
    } else {
      // If not connected, connect first then subscribe
      console.log("⏳ Not connected, connecting first...");
      this.connect().then(() => {
        if (this.client?.connected) {
          const subscription = this.client.subscribe(destination, callback, headers);
          callback._subscription = subscription;
        }
      }).catch(error => {
        console.error("❌ Failed to connect for subscription:", error);
      });
      
      return null;
    }
  }

  unsubscribe(destination, callback) {
    const subscribers = this.subscribers.get(destination);
    if (subscribers) {
      subscribers.delete(callback);
      
      // Clean up subscription
      if (callback._subscription) {
        callback._subscription.unsubscribe();
        delete callback._subscription;
      }
      
      // Remove destination if no more subscribers
      if (subscribers.size === 0) {
        this.subscribers.delete(destination);
      }
    }
  }

  resubscribeAll() {
    console.log("🔄 Resubscribing to all channels...");
    for (const [destination, callbacks] of this.subscribers.entries()) {
      for (const callback of callbacks) {
        if (this.client?.connected) {
          const subscription = this.client.subscribe(destination, callback);
          callback._subscription = subscription;
        }
      }
    }
  }

  async sendMessage(destination, message, headers = {}) {
    // If not connected, try to connect
    if (!this.client?.connected) {
      console.log("⏳ Not connected, attempting to connect...");
      try {
        await this.connect();
      } catch (error) {
        console.error("❌ Failed to connect for sending message:", error);
        // Queue message for later
        this.messageQueue.push({ destination, message, headers, timestamp: Date.now() });
        return false;
      }
    }

    // If still not connected, queue message
    if (!this.client?.connected) {
      console.warn("⚠️ Still not connected, queuing message...");
      this.messageQueue.push({ destination, message, headers, timestamp: Date.now() });
      return false;
    }

    try {
      const token = await this.ensureValidToken();
      
      this.client.publish({
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
      // Queue message for retry
      this.messageQueue.push({ destination, message, headers, timestamp: Date.now() });
      return false;
    }
  }

  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    console.log(`📤 Processing ${this.messageQueue.length} queued messages...`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(async ({ destination, message, headers }) => {
      await this.sendMessage(destination, message, headers);
    });
  }

  handleReconnect() {
    if (this.isConnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    this.isConnecting = true;
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        this.isConnecting = false;
      });
    }, this.reconnectDelay);
  }

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
        
        if (this.client.active) {
          await this.client.deactivate();
        }
        
        setTimeout(() => {
          this.client.activate();
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

      // Sử dụng các hàm đã import ở đầu file
      setAuthToken(newToken, getUserId(), getUserName());

      return newToken;
    } catch (error) {
      console.error("❌ Direct token refresh failed:", error);
      throw error;
    }
  }

  disconnect() {
    console.log("🔌 Disconnecting STOMP client...");
    
    // Clear all subscribers
    this.subscribers.clear();
    
    // Clear message queue
    this.messageQueue = [];
    
    // Cleanup token listener
    if (this.unsubscribeTokenListener) {
      this.unsubscribeTokenListener();
    }
    
    // Disconnect client
    if (this.client?.active) {
      this.client.deactivate();
    }
    
    this.client = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  isConnected() {
    return this.client?.connected || false;
  }

  getConnectionState() {
    if (!this.client) return 'disconnected';
    if (this.isConnecting) return 'connecting';
    if (this.client.connected) return 'connected';
    return 'disconnected';
  }
}

// Singleton instance
const socketManager = new SocketManager();

export default socketManager;