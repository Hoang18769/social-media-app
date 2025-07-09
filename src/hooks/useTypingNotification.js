"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { subscribe, unsubscribe, getStompClient } from "@/utils/socket";

export default function useTypingNotification(chatId) {
  const subscriptionRef = useRef(null);
  const isSubscribedRef = useRef(false);
  const isMountedRef = useRef(true);

  const handleTypingEvent = (data) => {
    if (!data) {
      console.warn("⚠️ Typing event không hợp lệ:", data);
      return;
    }

    const name = data.user?.givenName || data.user?.username || "ai đó";
    const typing = data.typing ? "đang gõ..." : "ngừng gõ.";
    console.log(`💬 ${name} ${typing}`, data);
  };

  useEffect(() => {
    isMountedRef.current = true;

    const setupSubscription = async () => {
      if (!chatId || subscriptionRef.current || !isMountedRef.current) return;

      try {
        console.log("🔌 Setting up typing subscription for chat:", chatId);

        await getStompClient();

        const destination = `/typing/${chatId}`;
        const subscription = await subscribe(destination, (message) => {
          console.log("📥 Nhận được tin nhắn typing:", message);
          if (!isMountedRef.current) return;

          try {
            const data = JSON.parse(message.body);
            console.log("📨 Typing message received:", data);
            handleTypingEvent(data);
          } catch (err) {
            console.error("❌ Không thể parse typing message:", err);
          }
        });

        subscriptionRef.current = subscription;
        isSubscribedRef.current = true;

        console.log(`✅ Subscribed to ${destination}`);
      } catch (err) {
        console.error("❌ Lỗi khi subscribe typing:", err);
      }
    };

    setupSubscription();

    return () => {
      isMountedRef.current = false;

      if (subscriptionRef.current) {
        try {
          const destination = `/typing/${chatId}`;
          unsubscribe(destination);
          console.log("📤 Hủy đăng ký:", destination);
        } catch (err) {
          console.warn("⚠️ Lỗi khi hủy đăng ký:", err);
        }

        subscriptionRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [chatId]);

  return {
    isSubscribed: isSubscribedRef.current,
  };
}
