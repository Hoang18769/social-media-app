"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  subscribe, 
  unsubscribe,
  getStompClient,
  stompClientSingleton 
} from "@/utils/socket";


import { toast } from "react-hot-toast";
import useAppStore from "@/store/ZustandStore";
import { useRouter } from "next/navigation";
import { playSound } from "@/utils/playSound";
import {useCall} from "@/context/CallContext";

export default function useMessageNotification(userId) {
  const {endCall}=useCall();
  const subscriptionRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isConnecting: false,
    subscriberCount: 0
  });
  const router = useRouter();

  const {  onMessageReceived, selectChat } = useAppStore();

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

  // Kiểm tra và yêu cầu quyền thông báo
  useEffect(() => {
    const checkNotificationPermission = async () => {
      console.log('🔍 Checking notification permission...');
      
      if (!('Notification' in window)) {
        console.warn('⚠️ Browser does not support notifications');
        setNotificationPermission('denied');
        return;
      }

      console.log('📋 Current Notification.permission:', Notification.permission);
      
      if (Notification.permission === 'default') {
        console.log('📋 Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('📋 Permission granted:', permission);
        setNotificationPermission(permission);
      } else {
        setNotificationPermission(Notification.permission);
      }
    };

    checkNotificationPermission();
  }, []);

  // Hàm hiển thị PWA notification
  const showPWANotification = useCallback(async (title, options = {}) => {
    try {
      if (!('Notification' in window)) return false;

      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;
      }

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.active) {
          registration.active.postMessage({
            type: 'SIMULATE_PUSH',
            data: {
              title,
              ...options
            }
          });
          return true;
        } else {
          console.warn('⚠️ No active service worker found');
        }
      }

      // Fallback nếu không gửi được tới SW
      new Notification(title, options);
      return true;

    } catch (error) {
      console.error('❌ Error showing notification:', error);
      return false;
    }
  }, []);

  // Hàm helper để xác định loại file
  const getFileType = useCallback((attachment, attachmentName) => {
    if (!attachment && !attachmentName) return 'file';
    
    const fileName = attachmentName || attachment;
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    
    if (imageExtensions.includes(extension)) return 'ảnh';
    if (videoExtensions.includes(extension)) return 'video';
    return 'file';
  }, []);

  // Hàm helper để rút gọn nội dung tin nhắn
  const truncateMessage = useCallback((content, maxLength = 30) => {
    if (!content || content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }, []);

  // Hàm helper để cập nhật chatList
  const updateChatList = useCallback((newMessage, chatId) => {
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
  }, []);

  // Hàm xử lý tin nhắn nhận được
  const handleMessage = useCallback(async (messageData) => {
    if (!messageData) return;

    console.log("📨 New message received:", messageData);

    try {
      // Command xử lý riêng
      if (messageData.command === "DELETE") {
        toast(`🗑️ Tin nhắn đã bị xóa`, {
          duration: 3000,
          position: "top-right",
        });
        
        // PWA notification cho tin nhắn bị xóa
        await showPWANotification('Tin nhắn đã bị xóa', {
          body: 'Một tin nhắn vừa bị xóa khỏi cuộc trò chuyện',
          tag: `delete-${messageData.chatId}`,
          data: { 
            type: 'delete', 
            chatId: messageData.chatId 
          }
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
          
          // PWA notification cho tin nhắn được chỉnh sửa
          await showPWANotification('Tin nhắn đã được chỉnh sửa', {
            body: `${senderName} đã chỉnh sửa tin nhắn`,
            tag: `edit-${messageData.chatId}`,
            data: { 
              type: 'edit', 
              chatId: messageData.chatId,
              senderId: messageData.sender?.id
            }
          });
        }
        return;
      }

      if (messageData.command === "END_CALL") {
        console.log(messageData)
        toast(`Cuộc gọi đã kết thúc`, {
          duration: 3000,
          position: "top-right",
        });
        endCall();
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

      // Toast thông báo kèm click handler và PWA notification
      if (messageData.sender && !newMessage.isOwnMessage) {
        const senderName = messageData.sender.username || messageData.sender.givenName || "ai đó";
        
        // Phát âm thanh
        try {
          playSound("pocpoc.mp3", { 
            loop: false, 
            volume: 0.7, 
            duration: 3000 
          });
          console.log("🔊 Playing notification sound for NEW_MESSAGE");
        } catch (soundError) {
          console.warn("🔇 Failed to play notification sound:", soundError);
        }

        // Xác định nội dung thông báo
        let toastMessage = '';
        let notificationBody = '';

        if (messageData.content && messageData.content.trim()) {
          // Tin nhắn có nội dung text - rút gọn nếu quá dài
          const truncatedContent = truncateMessage(messageData.content.trim(), 30);
          toastMessage = `💬 ${senderName}: ${truncatedContent}`;
          
          // Cho PWA notification có thể dài hơn một chút
          const truncatedNotificationContent = truncateMessage(messageData.content.trim(), 50);
          notificationBody = `${senderName}: ${truncatedNotificationContent}`;
        } else if (messageData.attachment || messageData.attachmentName) {
          // Tin nhắn có file đính kèm
          const fileType = getFileType(messageData.attachment, messageData.attachmentName);
          toastMessage = `📎 ${senderName} đã gửi một ${fileType}`;
          notificationBody = `${senderName} đã gửi một ${fileType}`;
        } else {
          // Tin nhắn không có nội dung (fallback)
          toastMessage = `💬 ${senderName} đã gửi một tin nhắn`;
          notificationBody = `${senderName} đã gửi một tin nhắn`;
        }

        // Toast notification
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
              {toastMessage}
            </div>
          ),
          {
            duration: 4000,
            position: "top-right",
          }
        );

        // PWA notification
        const notificationResult = await showPWANotification('Tin nhắn mới', {
          body: notificationBody,
          tag: `message-${messageData.id}`,
          data: { 
            type: 'message', 
            chatId: messageData.chatId,
            messageId: messageData.id,
            senderId: messageData.sender?.id
          }
        });
        
        console.log('📱 PWA notification result:', notificationResult);
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
  }, [currentUserId, showPWANotification, getFileType, truncateMessage, updateChatList, onMessageReceived, selectChat, router]);

  // Setup subscription với singleton
  useEffect(() => {
    if (!userId || !currentUserId) return;

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;
    
    const setupSubscription = async () => {
      try {
        const destination = `/message/${userId}`;
        
        console.log(`🔌 Setting up subscription for ${destination}...`);
        
        // Đảm bảo có connection trước khi subscribe
        const client = await getStompClient();
        if (!client || !client.connected) {
          throw new Error("STOMP client not connected");
        }

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
          retryCount = 0; // Reset retry count on success
        } else {
          throw new Error("Failed to create subscription");
        }
      } catch (error) {
        console.error("❌ Error setting up subscription:", error);
        setIsSubscribed(false);
        
        // Retry logic
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`🔄 Retrying subscription (${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
          setTimeout(() => {
            if (isMounted) setupSubscription();
          }, retryDelay);
        } else {
          console.error("❌ Max retry attempts reached for subscription");
        }
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
  }, [userId, currentUserId, handleMessage]);

  // Xử lý click notification từ Service Worker
  useEffect(() => {
    const handleSWMessage = (event) => {
      console.log('📱 Received SW message:', event.data);
      
      const { type, action, data } = event.data;
      
      if (type === 'NOTIFICATION_ACTION') {
        if (action === 'view' || action === 'reply') {
          if (data?.chatId) {
            selectChat(data.chatId);
            router.push("/chats");
          }
        }
      }
    };

    // Lắng nghe message từ Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [selectChat, router]);


  // Enhanced connection status
  const getConnectionStatus = useCallback(() => ({
    isConnected: stompClientSingleton.isConnected(),
    isConnecting: stompClientSingleton.isConnecting,
    hasSubscription: isSubscribed,
    subscriberCount: stompClientSingleton.getSubscriberCount(),
    userId,
    currentUserId,
    subscriptionDestination: userId ? `/message/${userId}` : null,
    notificationPermission,
    reconnectAttempts: stompClientSingleton.reconnectAttempts,
    maxReconnectAttempts: stompClientSingleton.maxReconnectAttempts,
  }), [isSubscribed, userId, currentUserId, notificationPermission]);

  // Force reconnect method
  const forceReconnect = useCallback(async () => {
    console.log("🔄 Force reconnecting...");
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

  // Update socket configuration
  const updateSocketConfig = useCallback((config) => {
    console.log("⚙️ Updating socket config:", config);
    stompClientSingleton.updateConfig(config);
  }, []);

  return {
    getConnectionStatus,
    forceReconnect,
    updateSocketConfig,
    isSubscribed,
    connectionStatus,
    notificationPermission,
    showPWANotification,
    // Thêm các method debug
    debug: {
      getSocketInstance: () => stompClientSingleton,
      getSubscriberCount: () => stompClientSingleton.getSubscriberCount(),
      getSubscribers: () => Array.from(stompClientSingleton.subscribers.keys()),
    }
  };
}