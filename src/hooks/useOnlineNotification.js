"use client";

import { useEffect, useRef, useState } from "react";
import { subscribe, unsubscribe, isConnected } from "@/utils/socket";
import useAppStore from "@/store/ZustandStore";

export default function useOnlineNotification(userId) {
  const subscriptionRef = useRef(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    let isMounted = true;

    // Xử lý status online
    const handleOnlineStatus = (data) => {
      if (!isMounted) return;

      console.log("🟢 Processing online status:", data);
      // ✅ Gọi action trong store để cập nhật status
      useAppStore.getState().updateChatUserOnlineStatus(data.userId, data);
    };

    // Setup subscription
    const setupSubscription = async () => {
      try {
        const destination = `/online/${userId}`;
        
        console.log(`🔌 Setting up online subscription for ${destination}...`);
        
        // Subscribe to online status updates
        const subscription = await subscribe(destination, (message) => {
          if (!isMounted) return;
          
          try {
            const data = JSON.parse(message.body);
            handleOnlineStatus(data);
          } catch (err) {
            console.error(
              "❌ Parse online status error:",
              err,
              message.body
            );
          }
        });

        if (subscription && isMounted) {
          subscriptionRef.current = subscription;
          setIsSubscribed(true);
          console.log(`✅ Successfully subscribed to ${destination}`);
        }
      } catch (error) {
        console.error(`❌ Error subscribing to /online/${userId}:`, error);
        setIsSubscribed(false);
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
  }, [userId]);

  // Debug function để check trạng thái
  const getConnectionStatus = () => ({
    isConnected: isConnected(),
    hasSubscription: isSubscribed,
    userId,
    subscriptionDestination: userId ? `/online/${userId}` : null,
  });

  return {
    isSubscribed,
    getConnectionStatus,
  };
}