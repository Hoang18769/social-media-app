import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { getAuthToken, isTokenValid, onTokenRefresh, clearSession } from "./axios";
import api from "./axios";

// Token state management cho STOMP
let tokenRefreshPromise = null;
let stompClients = new Set(); // Track all active STOMP clients

export function createStompClient(onConnect, options = {}) {
  const {
    url = process.env.NEXT_PUBLIC_SOCKET_ENDPOINT || "http://localhost/ws",
    reconnectDelay = 5000,
    maxReconnectAttempts = 5,
    ...otherOptions
  } = options;

  const client = new Client({
    webSocketFactory: () => new SockJS(url),
    connectHeaders: {
      Authorization: "Bearer " + (getAuthToken() || ""),
    },
    debug: (str) => console.log("[STOMP DEBUG]", str),
    reconnectDelay,
    onConnect: (frame) => {
      console.log("✅ STOMP connected", frame);
      client._reconnectAttempts = 0; // Reset counter on successful connect
      if (onConnect) onConnect(frame);
    },
    onDisconnect: () => {
      console.warn("⚠️ STOMP disconnected");
    },
    onWebSocketClose: (event) => {
      console.warn("⚠️ WebSocket closed:", event);
    },
    onWebSocketError: (event) => {
      console.error("❌ WebSocket error:", event);
    },
    onStompError: (frame) => {
      console.error("❌ STOMP error:", frame.headers["message"] || frame.body);
      
      // Check for authentication errors
      if (isAuthenticationError(frame)) {
        console.log("🔄 Authentication error detected. Attempting token refresh...");
        handleStompAuthError(client);
      }
    },
    beforeConnect: async () => {
      console.log("🔌 STOMP preparing to connect...");
      try {
        const token = await ensureValidToken();
        client.connectHeaders = {
          Authorization: "Bearer " + (token || ""),
        };
        console.log("✅ STOMP headers updated with valid token");
      } catch (error) {
        console.error("❌ Failed to get valid token for STOMP:", error);
        // Still attempt to connect, maybe the current token is still valid
      }
    },
    ...otherOptions
  });

  // Track client
  stompClients.add(client);
  
  // Reconnect attempts counter
  client._reconnectAttempts = 0;
  
  // Enhanced sendMessage with retry logic
  client.sendMessage = async (destination, message, headers = {}) => {
    if (!client.connected) {
      console.warn("⚠️ Client not connected. Attempting to connect...");
      
      // Try to connect if not connected
      if (!client.active) {
        client.activate();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!client.connected) {
        console.error("❌ Unable to establish connection. Cannot send message.");
        return false;
      }
    }

    try {
      // Ensure we have a valid token before sending
      const token = await ensureValidToken();
      
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
  };

  // Enhanced subscribe with auto-reconnect
  client.subscribeToChannel = (destination, callback, headers = {}) => {
    if (!client.connected) {
      console.error("❌ Client not connected. Cannot subscribe.");
      return null;
    }
    return client.subscribe(destination, callback, headers);
  };

  // Cleanup function
  client.cleanup = () => {
    console.log("🧹 Cleaning up STOMP client...");
    stompClients.delete(client);
    if (client.active) {
      client.deactivate();
    }
  };

  // Listen for token refresh events from axios interceptor
  const unsubscribeTokenListener = onTokenRefresh((newToken) => {
    if (newToken && client.connected) {
      console.log("🔄 Token refreshed, updating STOMP headers...");
      client.connectHeaders = {
        Authorization: "Bearer " + newToken,
      };
    } else if (!newToken) {
      // Token cleared, disconnect
      console.log("🚪 Token cleared, disconnecting STOMP...");
      client.cleanup();
    }
  });

  // Store unsubscribe function for cleanup
  client._unsubscribeTokenListener = unsubscribeTokenListener;

  return client;
}

// Helper function to check if error is authentication related
function isAuthenticationError(frame) {
  const message = frame.headers["message"] || frame.body || "";
  return (
    message.includes("403") ||
    message.includes("401") ||
    message.includes("Unauthorized") ||
    message.includes("Access Denied") ||
    message.includes("Authentication")
  );
}

// Handle STOMP authentication errors
async function handleStompAuthError(client) {
  try {
    client._reconnectAttempts = (client._reconnectAttempts || 0) + 1;
    
    if (client._reconnectAttempts > 5) {
      console.error("❌ Max reconnection attempts reached. Clearing session...");
      clearSession();
      return;
    }

    const token = await ensureValidToken();
    
    if (token) {
      console.log("🔄 Got refreshed token, reconnecting STOMP...");
      client.connectHeaders = {
        Authorization: "Bearer " + token,
      };
      
      // Disconnect and reconnect
      if (client.active) {
        await client.deactivate();
      }
      
      setTimeout(() => {
        client.activate();
      }, 1000);
    } else {
      console.error("❌ Unable to get valid token. Clearing session...");
      clearSession();
    }
  } catch (error) {
    console.error("❌ Error handling STOMP auth error:", error);
    if (client._reconnectAttempts > 5) {
      clearSession();
    }
  }
}

// Ensure we have a valid token - tích hợp với axios interceptor
async function ensureValidToken(timeout = 5000) {
  // Check if we already have a valid token
  const currentToken = getAuthToken();
  if (currentToken && isTokenValid()) {
    return currentToken;
  }

  // Check if refresh is already in progress
  if (tokenRefreshPromise) {
    console.log("🔄 Token refresh already in progress, waiting...");
    try {
      return await tokenRefreshPromise;
    } catch (error) {
      console.error("❌ Failed to wait for token refresh:", error);
      tokenRefreshPromise = null;
    }
  }

  // Start new token refresh
  console.log("🔄 Starting token refresh for STOMP...");
  
  tokenRefreshPromise = Promise.race([
    // Method 1: Wait for token refresh event
    new Promise((resolve, reject) => {
      const unsubscribe = onTokenRefresh((newToken) => {
        unsubscribe();
        if (newToken && isTokenValid()) {
          resolve(newToken);
        } else {
          reject(new Error("Invalid token received"));
        }
      });

      // Trigger refresh by making an authenticated request
      triggerTokenRefresh().catch(() => {
        // Ignore errors, the interceptor will handle them
      });

      // Timeout fallback
      setTimeout(() => {
        unsubscribe();
        reject(new Error("Token refresh timeout"));
      }, timeout);
    }),

    // Method 2: Direct token refresh
    (async () => {
      await new Promise(resolve => setTimeout(resolve, 200)); // Give event method a chance
      return await forceTokenRefresh();
    })()
  ]);

  try {
    const token = await tokenRefreshPromise;
    console.log("✅ Token refresh successful for STOMP");
    return token;
  } catch (error) {
    console.error("❌ Token refresh failed for STOMP:", error);
    throw error;
  } finally {
    tokenRefreshPromise = null;
  }
}

// Trigger token refresh through axios interceptor
async function triggerTokenRefresh() {
  try {
    // Make a request to any protected endpoint to trigger the interceptor
    await api.get('/v1/auth/me'); // or any protected endpoint
  } catch (error) {
    // Expected if token is invalid - the interceptor will handle refresh
    if (error.response?.status === 401) {
      console.log("🔄 401 response received, token refresh should be triggered");
    }
    throw error;
  }
}

// Force token refresh (fallback method)
async function forceTokenRefresh() {
  try {
    const response = await api.post('/v1/auth/refresh', {}, {
      skipAuth: true, // Skip the interceptor for this request
      withCredentials: true
    });

    const newToken = response.data.body?.token;
    if (!newToken) {
      throw new Error("No token in refresh response");
    }

    // Update token storage (this should trigger the onTokenRefresh event)
    const { setAuthToken, getUserId, getUserName } = await import('./axios');
    setAuthToken(newToken, getUserId(), getUserName());

    return newToken;
  } catch (error) {
    console.error("❌ Direct token refresh failed:", error);
    throw error;
  }
}

// Utility function to disconnect all STOMP clients
export function disconnectAllStompClients() {
  console.log("🔌 Disconnecting all STOMP clients...");
  stompClients.forEach(client => {
    if (client.cleanup) {
      client.cleanup();
    } else if (client.active) {
      client.deactivate();
    }
  });
  stompClients.clear();
}

// Utility function to reconnect all STOMP clients with new token
export async function reconnectAllStompClients() {
  console.log("🔄 Reconnecting all STOMP clients...");
  
  try {
    const token = await ensureValidToken();
    
    for (const client of stompClients) {
      if (client.active) {
        client.connectHeaders = {
          Authorization: "Bearer " + token,
        };
        
        await client.deactivate();
        setTimeout(() => {
          client.activate();
        }, 500);
      }
    }
  } catch (error) {
    console.error("❌ Failed to reconnect STOMP clients:", error);
  }
}

// Example usage function
export function createBasicStompClient(onConnect) {
  return createStompClient(onConnect, {
    reconnectDelay: 3000,
    maxReconnectAttempts: 10
  });
}