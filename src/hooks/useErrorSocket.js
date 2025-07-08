"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  subscribe, 
  unsubscribe, 
  isConnected,
  getStompClient,
  stompClientSingleton 
} from "@/utils/socket";
import { toast } from "react-hot-toast";

export default function useErrorSocket(userId) {
  const subscriptionRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isConnecting: false,
    subscriberCount: 0
  });

  // Initialize current user ID
  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (uid) setCurrentUserId(uid);
  }, []);

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

  // Handle error message received
  const handleErrorMessage = useCallback((errorData) => {
    if (!errorData) return;

    console.log("🚨 Error received:", errorData);

    try {
      // Determine error message
      let errorMessage = "Đã xảy ra lỗi";
      
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }

      // Toast error notification
      toast.error(errorMessage, {
        duration: 5000,
        position: "top-right",
      });

      // Dispatch custom event for other components to listen
      window.dispatchEvent(
        new CustomEvent("errorReceived", {
          detail: errorData,
        })
      );
    } catch (error) {
      console.error("❌ Failed to process error message:", error);
      
      // Fallback toast
      toast.error("Đã xảy ra lỗi không xác định", {
        duration: 5000,
        position: "top-right",
      });
    }
  }, []);

  // Setup subscription với singleton
  useEffect(() => {
    if (!userId || !currentUserId) return;

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;
    
    const setupErrorSubscription = async () => {
      try {
        const destination = `/errors/${userId}`;
        
        console.log(`🔌 Setting up error subscription for ${destination}...`);
        
        // Đảm bảo có connection trước khi subscribe
        const client = await getStompClient();
        if (!client || !client.connected) {
          throw new Error("STOMP client not connected");
        }

        // Subscribe to error messages
        const subscription = await subscribe(destination, (message) => {
          if (!isMounted) return;
          
          try {
            const errorData = JSON.parse(message.body);
            handleErrorMessage(errorData);
          } catch (error) {
            console.error("❌ Parse error message error:", error);
            console.log("🚨 Raw error message:", message.body);
            
            // Fallback: try to display raw message or generic error
            const fallbackMessage = typeof message.body === 'string' ? message.body : "Đã xảy ra lỗi không xác định";
            handleErrorMessage(fallbackMessage);
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
        console.error("❌ Error setting up error subscription:", error);
        setIsSubscribed(false);
        
        // Retry logic
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`🔄 Retrying error subscription (${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
          setTimeout(() => {
            if (isMounted) setupErrorSubscription();
          }, retryDelay);
        } else {
          console.error("❌ Max retry attempts reached for error subscription");
        }
      }
    };

    setupErrorSubscription();

    return () => {
      isMounted = false;
      
      if (subscriptionRef.current) {
        const destination = `/errors/${userId}`;
        unsubscribe(destination);
        subscriptionRef.current = null;
        setIsSubscribed(false);
        console.log(`🔌 Unsubscribed from ${destination}`);
      }
    };
  }, [userId, currentUserId, handleErrorMessage]);

  // Enhanced connection status
  const getConnectionStatus = useCallback(() => ({
    isConnected: stompClientSingleton.isConnected(),
    isConnecting: stompClientSingleton.isConnecting,
    hasSubscription: isSubscribed,
    subscriberCount: stompClientSingleton.getSubscriberCount(),
    userId,
    currentUserId,
    subscriptionDestination: userId ? `/errors/${userId}` : null,
    reconnectAttempts: stompClientSingleton.reconnectAttempts,
    maxReconnectAttempts: stompClientSingleton.maxReconnectAttempts,
  }), [isSubscribed, userId, currentUserId]);

  // Force reconnect method
  const forceReconnect = useCallback(async () => {
    console.log("🔄 Force reconnecting error subscription...");
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
    if (!userId || !currentUserId) return false;

    console.log("🔄 Manual resubscription for error socket...");
    
    // Cleanup current subscription
    if (subscriptionRef.current) {
      const destination = `/errors/${userId}`;
      unsubscribe(destination);
      subscriptionRef.current = null;
      setIsSubscribed(false);
    }

    // Wait a bit then resubscribe
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const destination = `/errors/${userId}`;
      const client = await getStompClient();
      
      if (!client || !client.connected) {
        throw new Error("STOMP client not connected");
      }

      const subscription = await subscribe(destination, (message) => {
        try {
          const errorData = JSON.parse(message.body);
          handleErrorMessage(errorData);
        } catch (error) {
          console.error("❌ Parse error message error:", error);
          const fallbackMessage = typeof message.body === 'string' ? message.body : "Đã xảy ra lỗi không xác định";
          handleErrorMessage(fallbackMessage);
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
  }, [userId, currentUserId, handleErrorMessage]);

  // Update socket configuration
  const updateSocketConfig = useCallback((config) => {
    console.log("⚙️ Updating socket config for error notifications:", config);
    stompClientSingleton.updateConfig(config);
  }, []);

  // Test error notification method
  const testErrorNotification = useCallback((message = "Test error message") => {
    console.log("🧪 Testing error notification...");
    handleErrorMessage({
      message,
      type: "TEST_ERROR",
      timestamp: new Date().toISOString()
    });
  }, [handleErrorMessage]);

  return {
    isSubscribed,
    connectionStatus,
    getConnectionStatus,
    forceReconnect,
    resubscribe,
    updateSocketConfig,
    testErrorNotification,
    // Debug methods
    debug: {
      getSocketInstance: () => stompClientSingleton,
      getSubscriberCount: () => stompClientSingleton.getSubscriberCount(),
      getSubscribers: () => Array.from(stompClientSingleton.subscribers.keys()),
    }
  };
}