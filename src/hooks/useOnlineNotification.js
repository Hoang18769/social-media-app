"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  subscribe, 
  unsubscribe, 
  isConnected,
  getStompClient,
  stompClientSingleton 
} from "@/utils/socket";
import useAppStore from "@/store/ZustandStore";

export default function useOnlineNotification(userId) {
  const subscriptionRef = useRef(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isConnecting: false,
    subscriberCount: 0
  });

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      setConnectionStatus({
        isConnected: stompClientSingleton.isConnected(),
        isConnecting: stompClientSingleton.isConnecting,
        subscriberCount: stompClientSingleton.getSubscriberCount()
      });
    };

    // Initial status
    updateConnectionStatus();

    // Update status periodically
    const statusInterval = setInterval(updateConnectionStatus, 2000);

    return () => clearInterval(statusInterval);
  }, []);

  // Handle online status updates
  const handleOnlineStatus = useCallback((data) => {
    console.log("🟢 Processing online status:", data);
    
    try {
      // Update store with online status
      useAppStore.getState().updateChatUserOnlineStatus(data.userId, data);
    } catch (error) {
      console.error("❌ Error updating online status in store:", error);
    }
  }, []);

  // Setup subscription với singleton
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;
    
    const setupSubscription = async () => {
      try {
        const destination = `/online/${userId}`;
        
        console.log(`🔌 Setting up online subscription for ${destination}...`);
        
        // Đảm bảo có connection trước khi subscribe
        const client = await getStompClient();
        if (!client || !client.connected) {
          throw new Error("STOMP client not connected");
        }

        // Subscribe to online status updates
        const subscription = await subscribe(destination, (message) => {
          if (!isMounted) return;
          
          try {
            const data = JSON.parse(message.body);
            handleOnlineStatus(data);
          } catch (error) {
            console.error("❌ Parse online status error:", error, "Raw message:", message.body);
          }
        });

        if (subscription && isMounted) {
          subscriptionRef.current = subscription;
          setIsSubscribed(true);
          console.log(`✅ Successfully subscribed to ${destination}`);
          retryCount = 0; // Reset retry count on success
        } else {
          throw new Error("Failed to create subscription");
        }
      } catch (error) {
        console.error("❌ Error setting up online subscription:", error);
        setIsSubscribed(false);
        
        // Retry logic
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`🔄 Retrying online subscription (${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
          setTimeout(() => {
            if (isMounted) setupSubscription();
          }, retryDelay);
        } else {
          console.error("❌ Max retry attempts reached for online subscription");
        }
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      
      if (subscriptionRef.current) {
        const destination = `/online/${userId}`;
        unsubscribe(destination);
        subscriptionRef.current = null;
        setIsSubscribed(false);
        console.log(`🔌 Unsubscribed from ${destination}`);
      }
    };
  }, [userId, handleOnlineStatus]);

  // Enhanced connection status
  const getConnectionStatus = useCallback(() => ({
    isConnected: stompClientSingleton.isConnected(),
    isConnecting: stompClientSingleton.isConnecting,
    hasSubscription: isSubscribed,
    subscriberCount: stompClientSingleton.getSubscriberCount(),
    userId,
    subscriptionDestination: userId ? `/online/${userId}` : null,
    reconnectAttempts: stompClientSingleton.reconnectAttempts,
    maxReconnectAttempts: stompClientSingleton.maxReconnectAttempts,
  }), [isSubscribed, userId]);

  // Force reconnect method
  const forceReconnect = useCallback(async () => {
    console.log("🔄 Force reconnecting online subscription...");
    try {
      await stompClientSingleton.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await getStompClient();
      return true;
    } catch (error) {
      console.error("❌ Force reconnect failed:", error);
      return false;
    }
  }, []);

  // Manual resubscribe method
  const resubscribe = useCallback(async () => {
    if (!userId) return false;

    console.log("🔄 Manual resubscription for online status...");
    
    // Cleanup current subscription
    if (subscriptionRef.current) {
      const destination = `/online/${userId}`;
      unsubscribe(destination);
      subscriptionRef.current = null;
      setIsSubscribed(false);
    }

    // Wait a bit then resubscribe
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const destination = `/online/${userId}`;
      const client = await getStompClient();
      
      if (!client || !client.connected) {
        throw new Error("STOMP client not connected");
      }

      const subscription = await subscribe(destination, (message) => {
        try {
          const data = JSON.parse(message.body);
          handleOnlineStatus(data);
        } catch (error) {
          console.error("❌ Parse online status error:", error);
        }
      });

      if (subscription) {
        subscriptionRef.current = subscription;
        setIsSubscribed(true);
        console.log(`✅ Successfully resubscribed to ${destination}`);
        return true;
      }
    } catch (error) {
      console.error("❌ Manual resubscription failed:", error);
    }
    
    return false;
  }, [userId, handleOnlineStatus]);

  // Update socket configuration
  const updateSocketConfig = useCallback((config) => {
    console.log("⚙️ Updating socket config for online notifications:", config);
    stompClientSingleton.updateConfig(config);
  }, []);

  return {
    isSubscribed,
    connectionStatus,
    getConnectionStatus,
    forceReconnect,
    resubscribe,
    updateSocketConfig,
    // Debug methods
    debug: {
      getSocketInstance: () => stompClientSingleton,
      getSubscriberCount: () => stompClientSingleton.getSubscriberCount(),
      getSubscribers: () => Array.from(stompClientSingleton.subscribers.keys()),
    }
  };
}