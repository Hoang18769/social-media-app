import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { getAuthToken, isTokenValid, onTokenRefresh, clearSession } from "./axios";
import api from "./axios";

class StompClientSingleton {
  constructor() {
    this.client = null;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.tokenRefreshPromise = null;
    this.tokenRefreshListeners = [];

    this.config = {
      url: process.env.NEXT_PUBLIC_SOCKET_ENDPOINT,
      reconnectDelay: 5000,
      maxReconnectAttempts: 5,
    };

    this.setupTokenRefreshListener();
  }

  initializeClient() {
    if (this.client) return this.client;

    this.client = new Client({
      webSocketFactory: () => new SockJS(this.config.url),
      connectHeaders: { Authorization: "Bearer " + (getAuthToken() || "") },
      debug: (str) => console.log("[STOMP DEBUG]", str),
      reconnectDelay: this.config.reconnectDelay,

      onConnect: (frame) => {
        console.log("✅ STOMP connected", frame);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.resubscribeAll();
      },

      onStompError: (frame) => {
        console.error("❌ STOMP error:", frame.headers["message"] || frame.body);
        this.isConnecting = false;

        if (this.isAuthenticationError(frame)) {
          console.log("🔄 Authentication error detected. Attempting token refresh...");
          this.handleAuthError();
        }
      }
    });

    return this.client;
  }

  async getInstance() {
    if (!this.client) this.initializeClient();
    if (!this.client.connected && !this.isConnecting) return await this.connect();
    if (this.isConnecting) return await this.connectionPromise;
    return this.client;
  }

  async connect() {
    if (this.client?.connected) return this.client;
    if (this.isConnecting) return await this.connectionPromise;

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      const client = this.initializeClient();

      const originalOnConnect = client.onConnect;
      const originalOnStompError = client.onStompError;

      client.onConnect = (frame) => {
        originalOnConnect(frame);
        client.onConnect = originalOnConnect;
        resolve(client);
      };

      client.onStompError = (frame) => {
        originalOnStompError(frame);
        reject(new Error(`STOMP Error: ${frame.headers["message"] || frame.body}`));
      };

      client.activate();

      setTimeout(() => {
        if (this.isConnecting) reject(new Error("Connection timeout"));
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

  async subscribe(destination, callback, headers = {}) {
    try {
      const client = await this.getInstance();
      if (!client.connected) {
        console.error("❌ Client not connected. Cannot subscribe.");
        return null;
      }

      const subscription = client.subscribe(destination, callback, headers);
      this.subscribers.set(destination, { callback, headers, subscription });

      console.log("✅ Subscribed to", destination);
      return subscription;
    } catch (error) {
      console.error("❌ Error subscribing to channel:", error);
      return null;
    }
  }

  unsubscribe(destination) {
    const subscriberInfo = this.subscribers.get(destination);
    if (subscriberInfo?.subscription) {
      subscriberInfo.subscription.unsubscribe();
      this.subscribers.delete(destination);
      console.log("✅ Unsubscribed from", destination);
    }
  }

  resubscribeAll() {
    console.log("🔄 Resubscribing to all channels...");

    for (const [destination, subscriberInfo] of this.subscribers) {
      try {
        const subscription = this.client.subscribe(destination, subscriberInfo.callback, subscriberInfo.headers);
        subscriberInfo.subscription = subscription;
        console.log("✅ Resubscribed to", destination);
      } catch (error) {
        console.error("❌ Error resubscribing to", destination, error);
      }
    }
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
        this.client.connectHeaders = { Authorization: "Bearer " + token };

        await this.disconnect();
        setTimeout(() => this.connect(), 15000);
      } else {
        console.error("❌ Unable to get valid token. Clearing session...");
        clearSession();
      }
    } catch (error) {
      console.error("❌ Error handling STOMP auth error:", error);
      if (this.reconnectAttempts > this.maxReconnectAttempts) clearSession();
    }
  }

  setupTokenRefreshListener() {
    const unsubscribe = onTokenRefresh((newToken) => {
      if (newToken && this.client?.connected) {
        console.log("🔄 Token refreshed, updating STOMP headers...");
        this.client.connectHeaders = { Authorization: "Bearer " + newToken };
      } else if (!newToken) {
        console.log("🚪 Token cleared, disconnecting STOMP...");
        this.disconnect();
      }
    });

    this.tokenRefreshListeners.push(unsubscribe);
  }

  isAuthenticationError(frame) {
    const message = frame.headers["message"] || frame.body || "";
    return ["403", "401", "Unauthorized", "Access Denied", "Authentication"].some(error => message.includes(error));
  }

  async ensureValidToken(timeout = 15000) {
    const currentToken = getAuthToken();
    if (currentToken && isTokenValid()) return currentToken;

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
          newToken && isTokenValid() ? resolve(newToken) : reject(new Error("Invalid token received"));
        });

        setTimeout(() => {
          unsubscribe();
          reject(new Error("Token refresh timeout"));
        }, timeout);
      }),

      (async () => {
        await new Promise(resolve => setTimeout(resolve, 15000));
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
      if (!newToken) throw new Error("No token in refresh response");

      const { setAuthToken, getUserId, getUserName } = await import('./axios');
      setAuthToken(newToken, getUserId(), getUserName());

      return newToken;
    } catch (error) {
      console.error("❌ Direct token refresh failed:", error);
      throw error;
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (this.client) this.client.reconnectDelay = this.config.reconnectDelay;
  }

  isConnected() {
    return this.client?.connected || false;
  }

  getSubscriberCount() {
    return this.subscribers.size;
  }

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
export const getStompClient = () => stompClientSingleton.getInstance();
export const sendMessage = (destination, message, headers = {}) => stompClientSingleton.sendMessage(destination, message, headers);
export const subscribe = (destination, callback, headers = {}) => stompClientSingleton.subscribe(destination, callback, headers);
export const unsubscribe = (destination) => stompClientSingleton.unsubscribe(destination);
export const connect = () => stompClientSingleton.connect();
export const disconnect = () => stompClientSingleton.disconnect();
export const isConnected = () => stompClientSingleton.isConnected();
export const cleanup = () => stompClientSingleton.cleanup();

// Legacy function for backward compatibility
// export function createStompClient(onConnect, options = {}) {
//   console.warn("⚠️ createStompClient is deprecated. Use getStompClient() instead.");
//
//   if (Object.keys(options).length > 0) {
//     stompClientSingleton.updateConfig(options);
//   }
//
//   return stompClientSingleton.getInstance().then(client => {
//     if (onConnect) {
//       if (client.connected) {
//         onConnect();
//       } else {
//         const originalOnConnect = client.onConnect;
//         client.onConnect = (frame) => {
//           originalOnConnect(frame);
//           onConnect(frame);
//         };
//       }
//     }
//     return client;
//   });
// }

// Export singleton instance for advanced usage
export { stompClientSingleton };

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stompClientSingleton.cleanup();
  });
}