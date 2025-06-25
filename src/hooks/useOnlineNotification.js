"use client";

import { useEffect, useRef } from "react";
import { createStompClient } from "@/utils/socket";
import useAppStore from "@/store/ZustandStore"; // Import store để update trạng thái

export default function useOnlineNotification(userId) {
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const intervalRef = useRef(null);

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

    // === Setup STOMP client ===
    const client = createStompClient();
    clientRef.current = client;

    client.debug = (str) => console.log("[STOMP DEBUG]", str);

    client.onConnect = () => {
      if (!isMounted) return;

      try {
        subscriptionRef.current = client.subscribe(
          `/online/${userId}`,
          (message) => {
            try {
              const data = JSON.parse(message.body);
              handleOnlineStatus(data); // xử lý data
            } catch (err) {
              console.error(
                "❌ Parse online status error:",
                err,
                message.body
              );
            }
          }
        );

        console.log(`✅ Subscribed to /online/${userId}`);
      } catch (error) {
        console.error(`❌ Error subscribing to /online/${userId}:`, error);
      }
    };
    client.onDisconnect = () =>
      isMounted && console.warn(`🔌 Online client disconnected for ${userId}`);
    client.onStompError = (frame) =>
      isMounted && console.error("❌ Online STOMP error:", frame);
    client.onWebSocketError = (error) =>
      isMounted && console.error("❌ Online WebSocket error:", error);

    try {
      client.activate();
    } catch (error) {
      console.error(`❌ Error activating online client:`, error);
    }

    // === Reconnect every 15s if lost connection ===
    intervalRef.current = setInterval(() => {
      if (!client.connected) {
        console.warn(`🔄 Reconnecting online client for ${userId}...`);
        client
          .deactivate()
          .then(() => {
            const newClient = createStompClient();
            clientRef.current = newClient;

            newClient.debug = client.debug;
            newClient.onConnect = client.onConnect;
            newClient.onDisconnect = client.onDisconnect;
            newClient.onStompError = client.onStompError;
            newClient.onWebSocketError = client.onWebSocketError;
            newClient.activate();
          })
          .catch((error) => {
            console.error(
              `❌ Error during reconnection for ${userId}:`,
              error
            );
          });
      }
    }, 15000);

    return () => {
      isMounted = false;

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId]);

  return null;
}
