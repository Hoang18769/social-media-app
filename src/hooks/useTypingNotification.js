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

  // ✅ Setup subscription function - export để có thể gọi từ bên ngoài
  const setupSubscription = useCallback(async () => {
    // Kiểm tra điều kiện
    if (!chatId || !isMountedRef.current) {
      console.log("⚠️ Không thể setup subscription - chatId:", chatId, "mounted:", isMountedRef.current);
      return;
    }

    // Nếu đã subscribe rồi thì không setup lại
    if (isSubscribedRef.current) {
      console.log("⚠️ Đã subscribe rồi, bỏ qua setup");
      return;
    }

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
  }, [chatId]);

  // ✅ Cleanup subscription function
  const cleanupSubscription = useCallback(() => {
    if (!isSubscribedRef.current) {
      console.log("⚠️ Không có subscription để cleanup");
      return;
    }

    if (subscriptionRef.current && chatId) {
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
  }, [chatId]);

  // ✅ Auto setup khi chatId thay đổi (tự động setup ban đầu)
  useEffect(() => {
    isMountedRef.current = true;
    
    // Auto setup khi chatId thay đổi
    if (chatId) {
      setupSubscription();
    }

    return () => {
      isMountedRef.current = false;
      cleanupSubscription();
    };
  }, [chatId, setupSubscription, cleanupSubscription]);

  // ✅ Return cả 2 functions
  return {
    isSubscribed: isSubscribedRef.current,
    setupSubscription,    // ✅ Export để gọi khi focus
    cleanupSubscription,  // ✅ Export để gọi khi blur
  };
}