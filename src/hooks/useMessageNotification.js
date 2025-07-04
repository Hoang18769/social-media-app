"use client";

import { useEffect, useRef, useState } from "react";
import { subscribe, unsubscribe, sendMessage as sendStompMessage, isConnected } from "@/utils/socket";
import { toast } from "react-hot-toast";
import useAppStore from "@/store/ZustandStore";
import { isTokenValid } from "@/utils/axios";
import { useRouter } from "next/navigation";
import { playSound } from "@/utils/playSound";

export default function useMessageNotification(userId) {
  const subscriptionRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const router = useRouter();

  const { fetchChatList, onMessageReceived, onChatCreated, selectChat } = useAppStore();

  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (uid) setCurrentUserId(uid);
  }, []);

  // Hàm helper để cập nhật chatList
  const updateChatList = (newMessage, chatId) => {
    console.log("🔄 Processing message for chatList:", newMessage);
    const { chatList } = useAppStore.getState();
    console.log("📜 Current chatList:", chatList);

    const foundChat = chatList.find((c) => c.chatId === chatId);
    if (foundChat) {
      const updatedChat = {
        ...foundChat,
        latestMessage: {
          id: newMessage.id,
          content: newMessage.content,
          sentAt: newMessage.sentAt,
          sender: newMessage.sender,
          messageType: newMessage.messageType,
          attachment: newMessage.attachment,
          attachments: newMessage.attachments,
          deleted: newMessage.deleted || false,
        },
        updatedAt: newMessage.sentAt,
        notReadMessageCount:
          (foundChat.notReadMessageCount || 0) + (newMessage.isOwnMessage ? 0 : 1),
      };
      const otherChats = chatList.filter((c) => c.chatId !== chatId);
      const newChatList = [...otherChats, updatedChat].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      useAppStore.setState({ chatList: newChatList.map((chat) => ({ ...chat })) });

      console.log("✅ ChatList updated successfully!");
    } else {
      console.warn(`⚠️ Không tìm thấy chat với chatId: ${chatId}`);
    }
  };

  // Hàm xử lý tin nhắn nhận được
  const handleMessage = async (messageData) => {
    if (!messageData) return;

    console.log("📨 New message received:", messageData);

    try {
      // Command xử lý riêng
      if (messageData.command === "DELETE") {
        toast(`🗑️ Tin nhắn đã bị xóa`, {
          duration: 3000,
          position: "top-right",
        });
        return;
      }

      if (messageData.command === "EDIT") {
        const senderName = messageData.sender?.username || messageData.sender?.givenName || "ai đó";
        if (messageData.sender?.id !== currentUserId) {
          toast(`✏️ ${senderName} đã chỉnh sửa tin nhắn`, {
            duration: 3000,
            position: "top-right",
          });
        }
        return;
      }

      const newMessage = {
        ...messageData,
        isOwnMessage: messageData.sender?.id === currentUserId,
      };

      // Cập nhật chat list
      if (messageData.chatId) {
        requestAnimationFrame(() => {
          updateChatList(newMessage, messageData.chatId);
        });
      }

      // Toast thông báo kèm click handler
      if (
        messageData.sender &&
        messageData.content &&
        !newMessage.isOwnMessage
      ) {
        const senderName = messageData.sender.username || messageData.sender.givenName || "ai đó";
        try {
              playSound("pocpoc.mp3", { 
                loop: false, 
                volume: 0.7, 
                duration: 3000 
              });
              console.log("🔊 Playing notification sound for NEW_CHAT_CREATED");
            } catch (soundError) {
              console.warn("🔇 Failed to play notification sound:", soundError);
            }
        toast(
          (t) => (
            <div
              onClick={() => {
                selectChat(messageData.chatId);
                router.push("/chats");
                toast.dismiss(t.id);
              }}
              className="cursor-pointer"
            >
              💬 {senderName}: {messageData.content}
            </div>
          ),
          {
            duration: 4000,
            position: "top-right",
          }
        );
      }

      if (onMessageReceived) {
        onMessageReceived(messageData);
      }

      window.dispatchEvent(
        new CustomEvent("newMessageReceived", {
          detail: messageData,
        })
      );
    } catch (error) {
      console.error("❌ Failed to process message:", error);
    }
  };

  // Setup subscription
  useEffect(() => {
    if (!userId || !currentUserId) return;

    let isMounted = true;
    
    const setupSubscription = async () => {
      try {
        const destination = `/message/${userId}`;
        
        console.log(`🔌 Setting up subscription for ${destination}...`);
        
        // Subscribe to messages
        const subscription = await subscribe(destination, (message) => {
          if (!isMounted) return;
          
          try {
            const messageData = JSON.parse(message.body);
            handleMessage(messageData);
          } catch (error) {
            console.error("❌ Parse message error:", error);
          }
        });

        if (subscription && isMounted) {
          subscriptionRef.current = subscription;
          setIsSubscribed(true);
          console.log(`✅ Successfully subscribed to ${destination}`);
        }
      } catch (error) {
        console.error("❌ Error setting up subscription:", error);
        setIsSubscribed(false);
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      
      if (subscriptionRef.current) {
        const destination = `/message/${userId}`;
        unsubscribe(destination);
        subscriptionRef.current = null;
        setIsSubscribed(false);
        console.log(`🔌 Unsubscribed from ${destination}`);
      }
    };
  }, [userId, currentUserId, onMessageReceived, selectChat, router]);

  // Method để gửi message qua STOMP client
  const sendMessage = async (destination, message) => {
    try {
      const success = await sendStompMessage(destination, message);
      if (!success) {
        console.warn("⚠️ Failed to send message via STOMP");
      }
      return success;
    } catch (error) {
      console.error("❌ Error sending message:", error);
      return false;
    }
  };

  // Debug status
  const getConnectionStatus = () => ({
    isConnected: isConnected(),
    hasSubscription: isSubscribed,
    userId,
    currentUserId,
    subscriptionDestination: userId ? `/message/${userId}` : null,
  });

  return {
    sendMessage,
    getConnectionStatus,
    isSubscribed,
  };
}