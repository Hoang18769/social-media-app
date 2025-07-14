"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import api, { isTokenValid } from "@/utils/axios";
import { 
  getStompClient, 
  subscribe, 
  unsubscribe, 
  isConnected,
  connect 
} from "@/utils/socket";
import useAppStore from "@/store/ZustandStore";

export default function useChat(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // ✅ Thêm state cho typing notifications
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Refs để track subscription
  const subscriptionRef = useRef(null);
  const subscribedChatIdRef = useRef(null);
  const reconnectIntervalRef = useRef(null);

  // Get userId từ localStorage
  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (uid) setCurrentUserId(uid);
  }, []);

  // Hàm helper để cập nhật chatList
  const updateChatList = useCallback((newMessage) => {
    console.log("🔄 Processing message for chatList:", newMessage);
    
    const { chatList } = useAppStore.getState();
    console.log("📜 Current chatList:", chatList);
    
    const foundChat = chatList.find((c) => c.chatId === chatId);
    console.log("🔍 Found chat:", foundChat);

    if (foundChat) {
      console.log("🔍 Current latestMessage:", foundChat.latestMessage);
      console.log("🆕 New message structure:", {
        id: newMessage.id,
        content: newMessage.content,
        sentAt: newMessage.sentAt,
        sender: newMessage.sender
      });

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
          deleted: newMessage.deleted || false
        },
        updatedAt: newMessage.sentAt,
        notReadMessageCount:
          (foundChat.notReadMessageCount || 0) + (newMessage.isOwnMessage ? 0 : 1),
      };
      
      console.log("🆕 UpdatedChat latestMessage:", updatedChat.latestMessage);
      
      // Tìm chat được update và các chat khác
      const otherChats = chatList.filter((c) => c.chatId !== chatId);
      
      // Đặt chat được chọn ở cuối, các chat khác giữ nguyên thứ tự
      const newChatList = [...otherChats, updatedChat];

      console.log("📜 New chatList first item latestMessage:", newChatList[0]?.latestMessage);
      
      // Force update bằng cách tạo object mới hoàn toàn
      useAppStore.setState({ 
        chatList: newChatList.map(chat => ({...chat}))
      });
      
      console.log("✅ ChatList updated successfully!");
      
      // Verify update
      setTimeout(() => {
        const { chatList: updatedList } = useAppStore.getState();
        console.log("🔍 Verified latestMessage after update:", updatedList.find(c => c.chatId === chatId)?.latestMessage);
      }, 100);
    } else {
      console.warn(`⚠️ Không tìm thấy chat với chatId: ${chatId}`);
    }
  }, [chatId]);

  // ✅ Xử lý typing notifications
  const handleTypingNotification = useCallback((data) => {
    console.log("💬 Typing notification received:", data);
    
    // Chỉ xử lý typing của người khác, không phải của mình
    if (data.id === currentUserId) {
      console.log("💬 Ignoring own typing notification");
      return;
    }

    if (data.command === "TYPING") {
      setIsTyping(true);
      
    } else if (data.command === "STOP_TYPING") {
      setIsTyping(false);
    }
  }, [currentUserId]);

  // ✅ NEW: Xử lý block/unblock notifications
  const handleBlockNotification = useCallback((data) => {
    console.log("🚫 Block notification received:", data);
    
    // Cập nhật blockStatus trong store
    const { updateBlockStatus } = useAppStore.getState();
    
    if (data.command === "HAS_BEEN_BLOCKED") {
      updateBlockStatus(chatId, {
        blockStatus: "HAS_BEEN_BLOCKED",
        blockedAt: data.blockedAt || new Date().toISOString(),
        blockReason: data.blockReason || "Blocked by user"
      });
      console.log(`🚫 Updated blockStatus to HAS_BEEN_BLOCKED for chat ${chatId}`);
    } else if (data.command === "HAS_BEEN_UNBLOCKED") {
      updateBlockStatus(chatId, {
        blockStatus: "NORMAL",
        blockedAt: null,
        blockReason: null
      });
      console.log(`✅ Updated blockStatus to NORMAL for chat ${chatId}`);
    }
  }, [chatId]);

  // UPDATED: Xử lý READING notifications
  const handleReadingNotification = useCallback((data) => {
    console.log("👁️ Reading notification received:", data);
    
    // Nếu là tin nhắn đọc của chính mình thì không xử lý
    if (data.id === currentUserId) {
      console.log("👁️ Ignoring own reading notification");
      return;
    }

    // Nếu là người khác đọc tin nhắn, đánh dấu tất cả messages là đã đọc
    console.log("👁️ Marking all messages as read");
    setMessages((prevMessages) => {
      return prevMessages.map((message) => ({
        ...message,
        isRead: true
      }));
    });
  }, [currentUserId]);

  // Xử lý message nhận được từ WebSocket
  const handleMessage = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);

      // ✅ Xử lý typing notifications
      if (data.command === "TYPING" || data.command === "STOP_TYPING") {
        handleTypingNotification(data);
        return;
      }

      // ✅ UPDATED: Xử lý block/unblock notifications
      if (data.command === "HAS_BEEN_BLOCKED" || data.command === "HAS_BEEN_UNBLOCKED") {
        handleBlockNotification(data);
        return;
      }

      // ✅ UPDATED: Xử lý READING command
      if (data.command === "READING") {
        console.log("👁️ READING received:", data);
        handleReadingNotification(data);
        return;
      }

      if (data.command === "DELETE") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.id ? { ...msg, content: "[Tin nhắn đã bị xóa]", deleted: true } : msg
          )
        );
        return;
      }

      if (data.command === "EDIT") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.id
              ? { ...msg, content: data.message, updated: true, editedAt: data.editedAt || new Date().toISOString() }
              : msg
          )
        );
        return;
      }

      // NEW MESSAGE
      const newMessage = { ...data, isOwnMessage: data.sender?.id === currentUserId };
      console.log("📩 Processing new message:", newMessage);
      console.log("🆔 Current userId:", currentUserId);
      console.log("🆔 Sender ID:", data.sender?.id);
      
      // ✅ Khi nhận được tin nhắn mới, ẩn typing indicator
      if (!newMessage.isOwnMessage) {
        setIsTyping(false);
      }
      
      // Cập nhật messages state - thêm vào đầu mảng (tin nhắn mới nhất)
      setMessages((prev) => {
        console.log("📝 Previous messages count:", prev.length);
        const newMessages = [newMessage, ...prev];
        console.log("📝 New messages count:", newMessages.length);
        return newMessages;
      });

      // Cập nhật chatList ngay lập tức
      requestAnimationFrame(() => {
        updateChatList(newMessage);
      });

    } catch (err) {
      console.error("❌ Error parsing message:", err);
    }
  }, [currentUserId, updateChatList, handleTypingNotification, handleBlockNotification, handleReadingNotification]);

  // Load messages lần đầu khi chatId thay đổi
  useEffect(() => {
    if (!chatId) return;

    const fetchInitialMessages = async () => {
      try {
        setLoading(true);
        setMessages([]);
        setHasMore(true);
        setTotalMessages(0);
        
        // ✅ Reset typing state khi chuyển chat
        setIsTyping(false);
        
        const limit = 20;
        const skip = 0;
        
        const res = await api.get(`/v1/chat/messages/${chatId}?skip=${skip}&limit=${limit}`);
        const fetchedMessages = res.data.body || [];
        
        setMessages(fetchedMessages);
        setTotalMessages(fetchedMessages.length);
        setHasMore(fetchedMessages.length === limit);
        
        console.log(`📨 Loaded initial messages: ${fetchedMessages.length}, hasMore=${fetchedMessages.length === limit}`);
      } catch (err) {
        console.error("❌ Lỗi tải tin nhắn:", err);
        setMessages([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMessages();
  }, [chatId, currentUserId]);

  // Load more messages (infinity scroll)
  const loadMoreMessages = useCallback(async () => {
    if (!chatId || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      
      const limit = 20;
      const currentCount = messages.length;
      const skip = currentCount;
      
      console.log(`📨 Loading more messages: currentCount=${currentCount}, skip=${skip}`);
      
      const res = await api.get(`/v1/chat/messages/${chatId}?skip=${skip}&limit=${limit}`);
      const olderMessages = res.data.body || [];
      
      if (olderMessages.length > 0) {
        setMessages(prev => [...prev, ...olderMessages]);
        setTotalMessages(prev => prev + olderMessages.length);
        setHasMore(olderMessages.length === limit);
        
        console.log(`📨 Loaded ${olderMessages.length} more messages, hasMore=${olderMessages.length === limit}`);
      } else {
        setHasMore(false);
        console.log(`📨 No more messages to load`);
      }
    } catch (err) {
      console.error("❌ Lỗi load thêm tin nhắn:", err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, messages.length, loadingMore, hasMore]);

  // Quản lý WebSocket subscription với singleton client
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    if (subscribedChatIdRef.current === chatId && subscriptionRef.current) {
      console.log(`✅ Already subscribed to chat:${chatId}`);
      return;
    }

    if (subscriptionRef.current && subscribedChatIdRef.current) {
      console.log(`🧹 Unsubscribing from previous chat:${subscribedChatIdRef.current}`);
      unsubscribe(`/chat/${subscribedChatIdRef.current}`);
      subscriptionRef.current = null;
      subscribedChatIdRef.current = null;
    }

    const subscribeToChat = async () => {
      try {
        console.log(`🔌 Subscribing to chat:${chatId}...`);
        setConnectionStatus('connecting');

        await getStompClient();
        
        const subscription = await subscribe(`/chat/${chatId}`, handleMessage);
        
        if (subscription) {
          subscriptionRef.current = subscription;
          subscribedChatIdRef.current = chatId;
          setConnectionStatus('connected');
          console.log(`✅ Successfully subscribed to chat:${chatId}`);
        } else {
          setConnectionStatus('error');
          console.error(`❌ Failed to subscribe to chat:${chatId}`);
        }
      } catch (error) {
        setConnectionStatus('error');
        console.error(`❌ Error subscribing to chat:${chatId}:`, error);
      }
    };

    subscribeToChat();

    reconnectIntervalRef.current = setInterval(async () => {
      const connected = isConnected();
      
      if (!connected && isTokenValid()) {
        console.log(`🔁 Reconnecting to chat:${chatId}...`);
        setConnectionStatus('reconnecting');
        
        try {
          await connect();
          
          if (isConnected()) {
            const subscription = await subscribe(`/chat/${chatId}`, handleMessage);
            if (subscription) {
              subscriptionRef.current = subscription;
              subscribedChatIdRef.current = chatId;
              setConnectionStatus('connected');
              console.log(`✅ Reconnected and resubscribed to chat:${chatId}`);
            }
          }
        } catch (error) {
          setConnectionStatus('error');
          console.error(`❌ Reconnection failed for chat:${chatId}:`, error);
        }
      } else {
        setConnectionStatus(connected ? 'connected' : 'disconnected');
        console.log(
          `[chat:${chatId}] Status: ${connected ? "✅ connected" : "❌ disconnected"}`
        );
      }
    }, 15000);

    return () => {
      console.log(`🧹 Cleaning up chat:${chatId} subscription...`);
      
      if (subscriptionRef.current && subscribedChatIdRef.current === chatId) {
        unsubscribe(`/chat/${chatId}`);
        subscriptionRef.current = null;
        subscribedChatIdRef.current = null;
      }
      
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
      
      // ✅ Cleanup typing state
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      setConnectionStatus('disconnected');
    };
  }, [chatId, currentUserId, handleMessage]);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current && subscribedChatIdRef.current) {
        console.log(`🧹 Component unmounting, cleaning up chat:${subscribedChatIdRef.current}`);
        unsubscribe(`/chat/${subscribedChatIdRef.current}`);
      }
      
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
      }
      
      // ✅ Cleanup typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Utility function để force reconnect
  const forceReconnect = useCallback(async () => {
    if (!chatId) return;
    
    console.log(`🔄 Force reconnecting to chat:${chatId}...`);
    setConnectionStatus('connecting');
    
    try {
      if (subscriptionRef.current) {
        unsubscribe(`/chat/${chatId}`);
        subscriptionRef.current = null;
        subscribedChatIdRef.current = null;
      }
      
      await connect();
      
      const subscription = await subscribe(`/chat/${chatId}`, handleMessage);
      if (subscription) {
        subscriptionRef.current = subscription;
        subscribedChatIdRef.current = chatId;
        setConnectionStatus('connected');
        console.log(`✅ Force reconnected to chat:${chatId}`);
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error(`❌ Force reconnect failed:`, error);
    }
  }, [chatId, handleMessage]);

  return { 
    messages, 
    loading, 
    loadingMore,
    hasMore,
    totalMessages,
    currentUserId,
    connectionStatus,
    loadMoreMessages,
    forceReconnect,
    // ✅ Thêm typing states
    isTyping,
  };
}