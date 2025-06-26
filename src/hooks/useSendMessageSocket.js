"use client";

import { useEffect, useState, useCallback } from "react";
import { getStompClient, sendMessage as stompSendMessage, isConnected as stompIsConnected } from "@/utils/socket";

export default function useSendMessage({ chatId, receiverUsername }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize connection when hook mounts
    const initializeConnection = async () => {
      try {
        const client = await getStompClient();
        setIsConnected(client.connected);
        
        // Set up connection status monitoring
        const checkConnection = () => {
          setIsConnected(stompIsConnected());
        };
        
        // Check connection status periodically
        const intervalId = setInterval(checkConnection, 1000);
        
        return () => {
          clearInterval(intervalId);
        };
      } catch (error) {
        console.error("❌ Failed to initialize STOMP connection:", error);
        setIsConnected(false);
      }
    };

    initializeConnection();

    // Cleanup is handled by the singleton itself
    return () => {
      setIsConnected(false);
    };
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      console.log("📡 Attempting to send message...");
      console.log("✅ isConnected:", isConnected);

      // Validate inputs
      if (!text?.trim()) {
        console.warn("⚠️ Empty message text");
        return false;
      }

      if (!receiverUsername?.trim()) {
        console.warn("⚠️ Missing receiver username");
        return false;
      }

      const messageData = {
        chatId: chatId || null,
        username: receiverUsername.trim(),
        text: text.trim(),
      };

      try {
        // Use the singleton's sendMessage method
        const success = await stompSendMessage("/app/chat", messageData);
        
        if (success) {
          console.log("✅ Message sent successfully:", messageData);
          return true;
        } else {
          console.error("❌ Failed to send message");
          return false;
        }
      } catch (error) {
        console.error("❌ Error sending message:", error);
        return false;
      }
    },
    [chatId, receiverUsername, isConnected]
  );

  return { 
    sendMessage, 
    isConnected,
    // Additional utility functions
    connectionStatus: isConnected ? 'connected' : 'disconnected'
  };
}