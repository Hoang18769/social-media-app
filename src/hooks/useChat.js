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

  // Xử lý message nhận được từ WebSocket
  const handleMessage = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);
      console.log("📩 Received:", data);

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
              ? { ...msg, content: data.message, edited: true, editedAt: data.editedAt || new Date().toISOString() }
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
      
      // Cập nhật messages state - thêm vào đầu mảng (tin nhắn mới nhất)
      setMessages((prev) => {
        console.log("📝 Previous messages count:", prev.length);
        const newMessages = [newMessage, ...prev];
        console.log("📝 New messages count:", newMessages.length);
        return newMessages;
      });

      // Cập nhật tổng số tin nhắn
      setTotalMessages(prev => prev + 1);
      
      // Cập nhật chatList ngay lập tức
      requestAnimationFrame(() => {
        updateChatList(newMessage);
      });

    } catch (err) {
      console.error("❌ Error parsing message:", err);
    }
  }, [currentUserId, updateChatList]);

  // Load messages lần đầu khi chatId thay đổi
  useEffect(() => {
    if (!chatId) return;

    const fetchInitialMessages = async () => {
      try {
        setLoading(true);
        setMessages([]);
        setHasMore(true);
        setTotalMessages(0);
        
        const limit = 20;
        const skip = 0; // Bắt đầu từ 0
        
        const res = await api.get(`/v1/chat/messages/${chatId}?skip=${skip}&limit=${limit}`);
        const fetchedMessages = res.data.body || [];
        
        // Tin nhắn trả về đã được sắp xếp từ mới nhất đến cũ nhất
        setMessages(fetchedMessages);
        setTotalMessages(fetchedMessages.length);
        
        // Nếu lấy được ít hơn limit, nghĩa là không còn tin nhắn nào
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
      const skip = currentCount; // Skip = số tin nhắn hiện tại
      
      console.log(`📨 Loading more messages: currentCount=${currentCount}, skip=${skip}`);
      
      const res = await api.get(`/v1/chat/messages/${chatId}?skip=${skip}&limit=${limit}`);
      const olderMessages = res.data.body || [];
      
      if (olderMessages.length > 0) {
        // Thêm tin nhắn cũ vào cuối mảng
        setMessages(prev => [...prev, ...olderMessages]);
        setTotalMessages(prev => prev + olderMessages.length);
        
        // Nếu lấy được ít hơn limit, nghĩa là không còn tin nhắn nào
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

    // Nếu đã subscribe cho chat này thì không làm gì
    if (subscribedChatIdRef.current === chatId && subscriptionRef.current) {
      console.log(`✅ Already subscribed to chat:${chatId}`);
      return;
    }

    // Cleanup subscription cũ nếu có
    if (subscriptionRef.current && subscribedChatIdRef.current) {
      console.log(`🧹 Unsubscribing from previous chat:${subscribedChatIdRef.current}`);
      unsubscribe(`/chat/${subscribedChatIdRef.current}`);
      subscriptionRef.current = null;
      subscribedChatIdRef.current = null;
    }

    // Subscribe to new chat
    const subscribeToChat = async () => {
      try {
        console.log(`🔌 Subscribing to chat:${chatId}...`);
        setConnectionStatus('connecting');

        // Đảm bảo client đã connected
        await getStompClient();
        
        // Subscribe với singleton client
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

    // Health check interval - chỉ cần check connection status
    reconnectIntervalRef.current = setInterval(async () => {
      const connected = isConnected();
      
      if (!connected && isTokenValid()) {
        console.log(`🔁 Reconnecting to chat:${chatId}...`);
        setConnectionStatus('reconnecting');
        
        try {
          // Reconnect và resubscribe
          await connect();
          
          // Resubscribe nếu connection thành công
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

    // Cleanup function
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
    };
  }, []);

  // Utility function để force reconnect
  const forceReconnect = useCallback(async () => {
    if (!chatId) return;
    
    console.log(`🔄 Force reconnecting to chat:${chatId}...`);
    setConnectionStatus('connecting');
    
    try {
      // Cleanup current subscription
      if (subscriptionRef.current) {
        unsubscribe(`/chat/${chatId}`);
        subscriptionRef.current = null;
        subscribedChatIdRef.current = null;
      }
      
      // Reconnect
      await connect();
      
      // Resubscribe
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
    forceReconnect
  };
}