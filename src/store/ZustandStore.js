import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import api from '@/utils/axios'; 

// Event constants
export const STORE_EVENTS = {
  CHAT_LIST_LOAD: 'chat_list_load',
  CHAT_CREATED: 'chat_created',
  MESSAGE_RECEIVED: 'message_received',
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATIONS_LOAD: 'notifications_load',
  UNREAD_COUNT_LOAD: 'unread_count_load',
  NEWSFEED_LOAD: 'newsfeed_load',
  POST_CREATED: 'post_created',
  SEARCH_PERFORMED: 'search_performed',
  UNREAD_MESSAGE_COUNT_UPDATED: 'unread_message_count_updated',
  BLOCK_STATUS_UPDATED: 'block_status_updated',
};

const useAppStore = create(
  devtools((set, get) => ({
    // ============ CHAT STATE ============
    chatList: [],
    conversationMap: new Map(), //about to remove
    isLoadingChats: false,
    error: null,
    unreadMessageCount: 0, // Total unread messages from all chats

    // ✅ NEW: Helper function to calculate unread message count
    calculateUnreadMessageCount: (chatList) => {
      const total = chatList.reduce((sum, chat) => {
        return sum + (chat.notReadMessageCount || 0);
      }, 0);
      return total;
    },

    // ✅ NEW: Update unread message count
    updateUnreadMessageCount: () => {
      const { chatList } = get();
      const newCount = get().calculateUnreadMessageCount(chatList);
      
      set({ unreadMessageCount: newCount });
      console.log(`✅ ${STORE_EVENTS.UNREAD_MESSAGE_COUNT_UPDATED} - Total unread messages: ${newCount}`);
      
      return newCount;
    },

    // ✅ UPDATED: Return Promise and handle errors properly + update unread count
    fetchChatList: async () => {
      set({ isLoadingChats: true, error: null });
      try {
        console.log('🚀 Fetching chat list from API...');
        const res = await api.get('/v1/chat');
        console.log('📊 Chat API response:', res);
        
        const data = res.data.body || res.data || [];
        const conversationMap = new Map();
        const currentUserId = getCurrentUserId();

        // ✅ Build conversation map
        data.forEach(chat => {
          const otherUser = chat.participants?.find(p => p.id !== currentUserId);
          if (otherUser) {
            conversationMap.set(otherUser.id, chat.id);
          }
        });

        // ✅ Reverse the chat list when fetching
        const reversedData = [...data].reverse();

        // ✅ Calculate unread message count
        const unreadCount = get().calculateUnreadMessageCount(reversedData);

        set({ 
          chatList: reversedData, 
          conversationMap,
          isLoadingChats: false,
          error: null,
          unreadMessageCount: unreadCount // ✅ Update unread count
        });

        console.log(`✅ ${STORE_EVENTS.CHAT_LIST_LOAD} - ${reversedData.length} chats loaded`);
        console.log(`✅ ${STORE_EVENTS.UNREAD_MESSAGE_COUNT_UPDATED} - Total unread messages: ${unreadCount}`);
        return reversedData; // ✅ Return data for component
      } catch (error) {
        console.error('❌ Error fetching chats:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load chats';
        
        set({ 
          isLoadingChats: false, 
          error: errorMessage,
          chatList: [], // ✅ Reset on error
          unreadMessageCount: 0 // ✅ Reset unread count on error
        });
        
        throw error; // ✅ Re-throw for component to handle
      }
    },

    // ✅ UPDATED: Update online status and recalculate unread count
    updateChatUserOnlineStatus: (userId, onlineStatusData) => {
      set((state) => {
        const updatedChatList = state.chatList.map((chat) => {
          if (chat.target && chat.target.id === userId) {
            return {
              ...chat,
              target: {
                ...chat.target,
                isOnline: onlineStatusData.online,
                lastOnline: onlineStatusData.lastOnline || null
              }
            };
          }
          return chat;
        });

        const unreadCount = get().calculateUnreadMessageCount(updatedChatList);

        return {
          chatList: updatedChatList,
          unreadMessageCount: unreadCount
        };
      });
      console.log(`✅ Updated target online status for ${userId}`, onlineStatusData);
    },

    //unused: Helper để lấy online status của user từ chatList
    // getUserOnlineStatusFromChats: (userId) => {
    //   const { chatList } = get();
    //
    //   for (const chat of chatList) {
    //     // Tìm trong participants
    //     if (chat.participants && Array.isArray(chat.participants)) {
    //       const participant = chat.participants.find(p => p.id === userId);
    //       if (participant && participant.onlineStatus) {
    //         return participant.onlineStatus;
    //       }
    //     }
    //
    //     // Tìm trong target
    //     if (chat.target && chat.target.id === userId && chat.target.onlineStatus) {
    //       return chat.target.onlineStatus;
    //     }
    //   }
    //
    //   return null;
    // },

    // ✅ NEW: Get block status by chat ID
    getBlockStatusByChatId: (chatId) => {
  const { chatList } = get();
  const chat = chatList.find(c => (c.id === chatId || c.chatId === chatId));
  
  if (!chat) {
    console.log(`❌ Chat not found for ID: ${chatId}`);
    return "NORMAL"; // Default status if chat not found
  }

  console.log(`✅ Block status for chat ${chatId}:`, chat.blockStatus);
  return chat.blockStatus || "NORMAL"; // Return the direct blockStatus value
},

// ✅ Update block status for a chat
updateBlockStatus: (chatId, blockStatusData) => {
  set((state) => {
    const updatedChatList = state.chatList.map((chat) => {
      if (chat.id === chatId || chat.chatId === chatId) {
        return {
          ...chat,
          blockStatus: blockStatusData.blockStatus, // Update the main blockStatus field
          blockedAt: blockStatusData.blockedAt,
          blockReason: blockStatusData.blockReason,
          target: chat.target ? {
            ...chat.target,
            hasBlocked: blockStatusData.blockStatus === "HAS_BEEN_BLOCKED",
            isBlocked: blockStatusData.blockStatus === "BLOCKED"
          } : chat.target
        };
      }
      return chat;
    });

    return {
      chatList: updatedChatList
    };
  });
  
  console.log(`✅ Block status updated for chat ${chatId}:`, blockStatusData);
},

    // unused: Block/Unblock user in chat
    toggleBlockUser: async (chatId, shouldBlock = true) => {
      try {
        const endpoint = shouldBlock ? '/v1/chat/block' : '/v1/chat/unblock';
        const res = await api.post(endpoint, { chatId });
        
        if (res.data.code === 200) {
          const currentUserId = getCurrentUserId();
          const blockStatusData = {
            hasBlocked: shouldBlock,
            isBlockedByTarget: false, // We're doing the action, so we're not blocked by target
            blockedAt: shouldBlock ? new Date().toISOString() : null,
            blockReason: shouldBlock ? 'Blocked by user' : null
          };
          
          get().updateBlockStatus(chatId, blockStatusData);
          
          console.log(`✅ ${shouldBlock ? 'Blocked' : 'Unblocked'} user in chat ${chatId}`);
          return true;
        }
        
        return false;
      } catch (error) {
        console.error(`❌ Error ${shouldBlock ? 'blocking' : 'unblocking'} user:`, error);
        throw error;
      }
    },

    // ✅ UPDATED: Bulk update online status và recalculate unread count
    bulkUpdateOnlineStatus: (userStatusList) => {
      if (!Array.isArray(userStatusList) || userStatusList.length === 0) {
        return;
      }

      set(state => {
        const updatedChatList = state.chatList.map(chat => {
          let updatedChat = { ...chat };

          // Update participants
          if (chat.participants && Array.isArray(chat.participants)) {
            updatedChat.participants = chat.participants.map(participant => {
              const statusUpdate = userStatusList.find(status => status.userId === participant.id);
              if (statusUpdate) {
                return {
                  ...participant,
                  onlineStatus: {
                    isOnline: statusUpdate.isOnline,
                    lastOnline: statusUpdate.lastOnline,
                    updatedAt: statusUpdate.updatedAt || new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                  }
                };
              }
              return participant;
            });
          }

          // Update target
          if (chat.target) {
            const statusUpdate = userStatusList.find(status => status.userId === chat.target.id);
            if (statusUpdate) {
              updatedChat.target = {
                ...chat.target,
                onlineStatus: {
                  isOnline: statusUpdate.isOnline,
                  lastOnline: statusUpdate.lastOnline,
                  updatedAt: statusUpdate.updatedAt || new Date().toISOString(),
                  lastUpdated: new Date().toISOString()
                }
              };
            }
          }

          return updatedChat;
        });

        const unreadCount = get().calculateUnreadMessageCount(updatedChatList);

        return {
          chatList: updatedChatList,
          unreadMessageCount: unreadCount
        };
      });

      console.log(`✅ Bulk updated online status for ${userStatusList.length} users`);
    },

    // ✅ UPDATED: Better update logic + recalculate unread count
    updateChatListAfterMessage: (chatId, lastMessage) => {
      set((state) => {
        const updatedChatList = state.chatList.map(chat =>
          (chat.id === chatId || chat.chatId === chatId)
            ? { ...chat, lastMessage, updatedAt: new Date().toISOString() }
            : chat
        );
        
        // Tìm chat được update và các chat khác
        const selectedChat = updatedChatList.find(chat => 
          chat.id === chatId || chat.chatId === chatId
        );
        const otherChats = updatedChatList.filter(chat => 
          chat.id !== chatId && chat.chatId !== chatId
        );
        
        // Đặt chat được chọn ở cuối, các chat khác giữ nguyên thứ tự
        const finalChatList = [...otherChats, selectedChat];
        const unreadCount = get().calculateUnreadMessageCount(finalChatList);

        return {
          chatList: finalChatList,
          unreadMessageCount: unreadCount
        };
      });
    },
  //unused
    getUserByChatId: (chatId) => {
      const chat = get().chatList.find(c => (c.id === chatId || c.chatId === chatId));
      return chat ? chat.target : null;
    },

    // ✅ UPDATED: Mark chat as read + recalculate unread count
    markChatAsRead: async (chatId) => {
      try {      
        set(state => {
          const updatedChatList = state.chatList.map(chat => 
            (chat.chatId === chatId || chat.id === chatId)
              ? { ...chat, notReadMessageCount: 0 }
              : chat
          );

          const unreadCount = get().calculateUnreadMessageCount(updatedChatList);

          return {
            chatList: updatedChatList,
            unreadMessageCount: unreadCount
          };
        });   
        
        console.log(`✅ Marked chat ${chatId} as read`);
      } catch (error) {
        console.error('❌ Error marking chat as read:', error);
      }
    },

    // ✅ UPDATED: Handle received message + recalculate unread count
    onMessageReceived: (message, isCurrentChatOpen = false) => {
      set(state => {
        const updatedChats = state.chatList
          .map(chat => {
            if (chat.chatId === message.chatId || chat.id === message.chatId) {
              return { 
                ...chat, 
                lastMessage: message, 
                updatedAt: message.createdAt,
                notReadMessageCount: isCurrentChatOpen 
                  ? 0 
                  : (chat.notReadMessageCount || 0) + 1
              };
            }
            return chat;
          })
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        const unreadCount = get().calculateUnreadMessageCount(updatedChats);

        return { 
          chatList: updatedChats,
          unreadMessageCount: unreadCount
        };
      });

      console.log(`📊 ${STORE_EVENTS.MESSAGE_RECEIVED} - ${message.chatId}`);
    },

    // ✅ UPDATED: Handle new chat creation + recalculate unread count
    onChatCreated: (newChat) => {
      const currentUserId = getCurrentUserId();
      const otherUser = newChat.participants?.find(p => p.id !== currentUserId);

      set(state => {
        const updatedChatList = [newChat, ...state.chatList];
        const unreadCount = get().calculateUnreadMessageCount(updatedChatList);

        return {
          // ✅ Add new chat at the beginning (most recent)
          chatList: updatedChatList,
          conversationMap: otherUser 
            ? new Map(state.conversationMap).set(otherUser.id, newChat.id)
            : state.conversationMap,
          unreadMessageCount: unreadCount
        };
      });

      console.log(`📊 ${STORE_EVENTS.CHAT_CREATED} - ${newChat.id}`);
    },

    // ============ NOTIFICATIONS STATE ============
    notifications: [],
    isLoadingNotifications: false,
    unreadNotificationCount: 0, // ✅ From REST API (only set once during init)
    unreadNotificationCountFromSocket: 0, // ✅ NEW: From socket notifications

    fetchUnreadNotificationCount: async () => {
      try {
        const res = await api.get('/v1/notifications/unread-count');
        console.log('📊 Unread count API response:', res);
        
        const unreadCount = res.data.body;
        
        set({ 
          unreadNotificationCount: unreadCount,
          error: null
        });

        console.log(`✅ ${STORE_EVENTS.UNREAD_COUNT_LOAD} - ${unreadCount} unread notifications from API`);
        return unreadCount;
      } catch (error) {
        console.error('❌ Error fetching unread notification count:', error);
        return 0;
      }
    },

    fetchNotifications: async (force = false, page = 0, size = 10) => {
      const { notifications, isLoadingNotifications } = get();
      
      if (!force && notifications.length > 0) {
        return notifications;
      }
      
      if (isLoadingNotifications) {
        return notifications;
      }

      set({ isLoadingNotifications: true, error: null });
      try {
        console.log('🚀 Fetching notifications from API...');
        const res = await api.get('/v1/notifications', {
          params: { page, size }
        });
        
        console.log('📊 Notifications API response:', res);
        
        const responseData = res.data.body.notifications;
        let data = [];
        
        if (responseData) {
          if (responseData.body && Array.isArray(responseData.body)) {
            data = responseData.body;
          } else if (Array.isArray(responseData)) {
            data = responseData;
          }
        }
        
        const currentNotifications = get().notifications;
        let finalNotifications = data;
        
        // ✅ Merge với socket notifications nếu có
        if (currentNotifications.length > 0) {
          const apiNotificationIds = new Set(data.map(n => n.id));
          const socketOnlyNotifications = currentNotifications.filter(n => !apiNotificationIds.has(n.id));
          
          finalNotifications = [...socketOnlyNotifications, ...data];
        }
        
        set({ 
          notifications: finalNotifications,
          isLoadingNotifications: false,
          error: null
        });

        console.log(`✅ ${STORE_EVENTS.NOTIFICATIONS_LOAD} - ${finalNotifications.length} notifications loaded`);
        return finalNotifications;
      } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load notifications';
        
        set({ 
          isLoadingNotifications: false,
          error: errorMessage
        });
        
        throw error;
      }
    },

    // ✅ UPDATED: Cập nhật socket notification count khi nhận thông báo từ socket
    onNotificationReceived: (notification) => {
      const { notifications } = get();
      
      if (notifications.length === 0) {
        console.log('📊 Empty notifications list, fetching from API...');
        get().fetchNotifications(true).catch(console.error);
      }

      const existingNotification = notifications.find(n => n.id === notification.id);
      if (existingNotification) {
        console.log(`📊 Notification ${notification.id} already exists, skipping...`);
        return;
      }

      set(state => ({
        notifications: [notification, ...state.notifications],
        // ✅ NEW: Increment socket notification count
        unreadNotificationCountFromSocket: state.unreadNotificationCountFromSocket + 1
      }));

      console.log(`📊 ${STORE_EVENTS.NOTIFICATION_RECEIVED} - ${notification.id || 'new notification'} | Socket count: ${get().unreadNotificationCountFromSocket}`);
    },

    // ✅ NEW: Reset socket notification count (when user reads notifications)
    resetSocketNotificationCount: () => {
      set({ unreadNotificationCountFromSocket: 0 });
      console.log('✅ Reset socket notification count to 0');
    },

    // ✅ NEW: Get total unread notification count (API + Socket)
    getTotalUnreadNotificationCount: () => {
      const { unreadNotificationCount, unreadNotificationCountFromSocket } = get();
      return unreadNotificationCount + unreadNotificationCountFromSocket;
    },

    // ✅ UPDATED: Clear all notifications và reset socket count
    clearAllNotifications: async () => {
      try {
        set({ 
          notifications: [],
          unreadNotificationCountFromSocket: 0 // ✅ Reset socket count, keep API count
        });
        
        console.log('✅ Cleared all notifications and reset socket count');
      } catch (error) {
        console.error('❌ Error clearing all notifications:', error);
      }
    },

    // ============ CHAT NAVIGATION & SELECTION LOGIC ============
    selectedChatId: null,
    virtualChatUser: null,

    navigateToChat: (userId, userInfo = null) => {
      const { chatList } = get();

      const existingChat = chatList.find(chat => 
        chat.target && (chat.target.username === userInfo?.username || chat.target.id === userId)
      );

      if (existingChat) {
        console.log(`🚀 Navigating to existing chat: ${existingChat.chatId || existingChat.id} with user: ${userId}`);
        return {
          type: 'existing',
          chatId: existingChat.chatId || existingChat.id,
          userId: userId
        };
      } else {
        console.log(`🚀 Creating virtual chat with user: ${userId}`);
        return {
          type: 'virtual',
          chatId: null,
          userId: userId,
          userInfo: userInfo
        };
      }
    },

    selectChat: (chatId) => {
      set({ 
        selectedChatId: chatId,
        virtualChatUser: null
      });
      console.log(`✅ Selected chat: ${chatId}`);
    },

    showVirtualChat: (userId, userInfo) => {
      set({ 
        selectedChatId: null,
        virtualChatUser: {
          id: userId,
          ...userInfo
        }
      });
      console.log(`✅ Showing virtual chat with user: ${userId}`);
    },

    clearChatSelection: () => {
      set({ 
        selectedChatId: null,
        virtualChatUser: null
      });
    },

    createNewChat: async (userId, firstMessage) => {
      try {
        const res = await api.post('/v1/chat', {
          participantId: userId,
          message: firstMessage
        });

        if (res.data.code === 200) {
          const newChat = res.data.body;
          get().onChatCreated(newChat);

          set({ 
            selectedChatId: newChat.id,
            virtualChatUser: null
          });

          console.log(`✅ New chat created and selected: ${newChat.id}`);
          return newChat;
        }
      } catch (error) {
        console.error('❌ Error creating new chat:', error);
        throw error;
      }
    },

    // ============ INITIALIZATION ============
    initializeApp: async () => {
      console.log('🚀 Initializing app...');
      try {
        await Promise.allSettled([
          get().fetchChatList(),
          get().fetchUnreadNotificationCount(), // ✅ Fetch unread count riêng biệt (chỉ 1 lần)
          // get().fetchNotifications() // ✅ Fetch notifications riêng biệt
        ]);
        console.log('✅ App initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        set({ error: 'Failed to initialize app' });
      }
    },

    // ============ UTILITY ============
    clearAllData: () => {
      set({
        chatList: [],
        conversationMap: new Map(),
        selectedChatId: null,
        virtualChatUser: null,
        notifications: [],
        unreadNotificationCount: 0,
        unreadNotificationCountFromSocket: 0, // ✅ Reset socket count
        unreadMessageCount: 0, // ✅ Reset message count
        error: null,
        isLoadingChats: false,
        isLoadingNotifications: false,
      }, false, 'clearAllData'); // ✅ Better devtools action name
    },
  //unused
    getChatByUserId: (userId) => get().conversationMap.get(userId),
    //unused
    getSelectedChat: () => {
      const { selectedChatId, chatList } = get();
      return chatList.find(chat => (chat.id === selectedChatId || chat.chatId === selectedChatId)) || null;
    },
    //unused
    ensureNotificationsLoaded: () => {
      const { notifications, isLoadingNotifications } = get();
      
      if (notifications.length === 0 && !isLoadingNotifications) {
        console.log('📊 Auto-fetching notifications (empty list)...');
        get().fetchNotifications(true).catch(console.error);
      }
    },

    // unused: Force refresh methods
    refreshChatList: async () => {
      console.log('🔄 Force refreshing chat list...');
      return get().fetchChatList();
    },
    //unused
    refreshNotifications: async () => {
      console.log('🔄 Force refreshing notifications...');
      return get().fetchNotifications(true);
    },

    // ✅ NEW: Force refresh unread count (từ API)
    refreshUnreadCount: async () => {
      console.log('🔄 Force refreshing unread count...');
      return get().fetchUnreadNotificationCount();
    },

    // unsed: Get total unread message count
    getTotalUnreadMessageCount: () => {
      const { unreadMessageCount } = get();
      return unreadMessageCount;
    },

    // unused: Manual recalculate unread message count (if needed)
    recalculateUnreadMessageCount: () => {
      return get().updateUnreadMessageCount();
    },

  }), {
    name: 'app-store'
  })
);

// ✅ FIXED: Better getCurrentUserId with fallback
function getCurrentUserId() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId') || sessionStorage.getItem('userId') || null;
  }
  return null;
}

export default useAppStore;