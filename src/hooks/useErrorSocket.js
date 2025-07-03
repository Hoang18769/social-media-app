"use client";

import { useEffect, useRef, useState } from "react";
import { subscribe, unsubscribe, isConnected } from "@/utils/socket";
import { toast } from "react-hot-toast";

export default function useErrorSocket(userId) {
  const subscriptionRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (uid) setCurrentUserId(uid);
  }, []);

  // Hàm xử lý error message nhận được
  const handleErrorMessage = (errorData) => {
    if (!errorData) return;

    console.log("🚨 Error received:", errorData);

    try {
      // Toast thông báo lỗi
      toast.error(
        errorData.message || errorData.error || "Đã xảy ra lỗi",
        {
          duration: 5000,
          position: "top-right",
        }
      );

      // Dispatch custom event để các component khác có thể lắng nghe
      window.dispatchEvent(
        new CustomEvent("errorReceived", {
          detail: errorData,
        })
      );
    } catch (error) {
      console.error("❌ Failed to process error message:", error);
    }
  };

  // Setup subscription
  useEffect(() => {
    if (!userId || !currentUserId) return;

    let isMounted = true;
    
    const setupErrorSubscription = async () => {
      try {
        const destination = `/errors/${userId}`;
        
        console.log(`🔌 Setting up error subscription for ${destination}...`);
        
        // Subscribe to error messages
        const subscription = await subscribe(destination, (message) => {
          if (!isMounted) return;
          
          try {
            const errorData = JSON.parse(message.body);
            handleErrorMessage(errorData);
          } catch (error) {
            console.error("❌ Parse error message error:", error);
            // Fallback: hiển thị raw message nếu parse fail
            console.log("🚨 Raw error message:", message.body);
            toast.error("Đã xảy ra lỗi không xác định", {
              duration: 5000,
              position: "top-right",
            });
          }
        });

        if (subscription && isMounted) {
          subscriptionRef.current = subscription;
          setIsSubscribed(true);
          console.log(`✅ Successfully subscribed to ${destination}`);
        }
      } catch (error) {
        console.error("❌ Error setting up error subscription:", error);
        setIsSubscribed(false);
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
  }, [userId, currentUserId]);

  // Debug status
  const getConnectionStatus = () => ({
    isConnected: isConnected(),
    hasSubscription: isSubscribed,
    userId,
    currentUserId,
    subscriptionDestination: userId ? `/errors/${userId}` : null,
  });

  return {
    getConnectionStatus,
    isSubscribed,
  };
}