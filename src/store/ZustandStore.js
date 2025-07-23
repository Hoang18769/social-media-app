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
  // Posts events
  POSTS_LOADED: 'posts_loaded',
  POST_LIKED: 'post_liked',
  POST_UNLIKED: 'post_unliked',
};

const useAppStore = create(
    devtools((set, get) => ({
      // ============ USER STATE ============
      userName: null,
      setUserNameStore: (username) => {
        set({ userName: username })
      },
      getUserNameStore: () => get().userName,
      filterType: "RELEVANT", // default filter
      setFilterType: (filterType) => set({ filterType }),

      // ============ POSTS STATE ============
      posts: {
        // State for different filter types
        newsfeed: {
          posts: [],
          skip: 0,
          hasMore: true,
          loading: false,
          loadingMore: false,
          lastFetched: null,
        },
        recent: {
          posts: [],
          skip: 0,
          hasMore: true,
          loading: false,
          loadingMore: false,
          lastFetched: null,
        },
        friends: {
          posts: [],
          skip: 0,
          hasMore: true,
          loading: false,
          loadingMore: false,
          lastFetched: null,
        },
      },

      // Posts Actions
      setCurrentFilter: (filterType) => {
        set({ filterType });
      },

      // Get current filter data
      getCurrentFilterData: () => {
        const state = get();
        const filterMap = {
          'RELEVANT': 'newsfeed',
          'TIME': 'recent',
          'FRIEND_ONLY': 'friends'
        };
        return state.posts[filterMap[state.filterType]];
      },

      // Set loading state for posts
      setPostsLoading: (filterType, loading) => {
        const filterMap = {
          'RELEVANT': 'newsfeed',
          'TIME': 'recent',
          'FRIEND_ONLY': 'friends'
        };
        const key = filterMap[filterType];
        if (key) {
          set((state) => ({
            posts: {
              ...state.posts,
              [key]: {
                ...state.posts[key],
                loading
              }
            }
          }));
        }
      },

      // Set loading more state for posts
      setPostsLoadingMore: (filterType, loadingMore) => {
        const filterMap = {
          'RELEVANT': 'newsfeed',
          'TIME': 'recent',
          'FRIEND_ONLY': 'friends'
        };
        const key = filterMap[filterType];
        if (key) {
          set((state) => ({
            posts: {
              ...state.posts,
              [key]: {
                ...state.posts[key],
                loadingMore
              }
            }
          }));
        }
      },

      // Set posts (replace all)
      setPosts: (filterType, posts, hasMore = true) => {
        const filterMap = {
          'RELEVANT': 'newsfeed',
          'TIME': 'recent',
          'FRIEND_ONLY': 'friends'
        };
        const key = filterMap[filterType];
        if (key) {
          set((state) => ({
            posts: {
              ...state.posts,
              [key]: {
                ...state.posts[key],
                posts,
                skip: posts.length,
                hasMore,
                lastFetched: Date.now(),
                loading: false,
                loadingMore: false
              }
            }
          }));
          console.log(`✅ ${STORE_EVENTS.POSTS_LOADED} - ${posts.length} posts loaded for ${filterType}`);
        }
      },

      // Add more posts (for pagination)
      addMorePosts: (filterType, newPosts, hasMore = true) => {
        const filterMap = {
          'RELEVANT': 'newsfeed',
          'TIME': 'recent',
          'FRIEND_ONLY': 'friends'
        };
        const key = filterMap[filterType];
        if (key) {
          set((state) => {
            const currentPosts = state.posts[key].posts;
            const existingIds = new Set(currentPosts.map(p => p.id));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));

            return {
              posts: {
                ...state.posts,
                [key]: {
                  ...state.posts[key],
                  posts: [...currentPosts, ...uniqueNewPosts],
                  skip: state.posts[key].skip + uniqueNewPosts.length,
                  hasMore,
                  lastFetched: Date.now(),
                  loading: false,
                  loadingMore: false
                }
              }
            };
          });
          console.log(`✅ ${STORE_EVENTS.POSTS_LOADED} - ${newPosts.length} more posts added for ${filterType}`);
        }
      },

      // Update a specific post (for like/unlike)
      updatePost: (postId, updates) => {
        set((state) => {
          const updatePostsInFilter = (posts) =>
              posts.map(post =>
                  post.id === postId ? { ...post, ...updates } : post
              );

          return {
            posts: {
              newsfeed: {
                ...state.posts.newsfeed,
                posts: updatePostsInFilter(state.posts.newsfeed.posts)
              },
              recent: {
                ...state.posts.recent,
                posts: updatePostsInFilter(state.posts.recent.posts)
              },
              friends: {
                ...state.posts.friends,
                posts: updatePostsInFilter(state.posts.friends.posts)
              }
            }
          };
        });

        if (updates.liked !== undefined) {
          console.log(`✅ ${updates.liked ? STORE_EVENTS.POST_LIKED : STORE_EVENTS.POST_UNLIKED} - Post ${postId}`);
        }
      },

      // Check if data exists and is fresh
      hasDataForFilter: (filterType, maxAge = 5 * 60 * 1000) => { // 5 minutes default
        const filterMap = {
          'RELEVANT': 'newsfeed',
          'TIME': 'recent',
          'FRIEND_ONLY': 'friends'
        };
        const key = filterMap[filterType];
        if (!key) return false;

        const state = get();
        const filterData = state.posts[key];

        if (!filterData.posts.length || !filterData.lastFetched) {
          return false;
        }

        // Check if data is still fresh
        return (Date.now() - filterData.lastFetched) < maxAge;
      },

      // Reset a specific filter
      resetPostsFilter: (filterType) => {
        const filterMap = {
          'RELEVANT': 'newsfeed',
          'TIME': 'recent',
          'FRIEND_ONLY': 'friends'
        };
        const key = filterMap[filterType];
        if (key) {
          set((state) => ({
            posts: {
              ...state.posts,
              [key]: {
                posts: [],
                skip: 0,
                hasMore: true,
                loading: false,
                loadingMore: false,
                lastFetched: null,
              }
            }
          }));
          console.log(`✅ Reset posts filter: ${filterType}`);
        }
      },

      // Reset all posts filters
      resetAllPostsFilters: () => {
        set((state) => ({
          posts: {
            newsfeed: {
              posts: [],
              skip: 0,
              hasMore: true,
              loading: false,
              loadingMore: false,
              lastFetched: null,
            },
            recent: {
              posts: [],
              skip: 0,
              hasMore: true,
              loading: false,
              loadingMore: false,
              lastFetched: null,
            },
            friends: {
              posts: [],
              skip: 0,
              hasMore: true,
              loading: false,
              loadingMore: false,
              lastFetched: null,
            }
          }
        }));
        console.log('✅ Reset all posts filters');
      },

      // Fetch posts from API
      fetchPosts: async (filterType, skip = 0, isLoadMore = false, limit = 20) => {
        try {
          if (isLoadMore) {
            get().setPostsLoadingMore(filterType, true);
          } else {
            get().setPostsLoading(filterType, true);
          }

          console.log(`🚀 Fetching posts from API - Filter: ${filterType}, Skip: ${skip}, LoadMore: ${isLoadMore}`);

          const res = await api.get(`/v1/posts/newsfeed?skip=${skip}&limit=${limit}&TYPE=${filterType}`);
          const newPosts = res.data.body || [];
          const hasMoreData = newPosts.length === limit;

          if (isLoadMore) {
            get().addMorePosts(filterType, newPosts, hasMoreData);
          } else {
            // Khi không phải loadMore, luôn replace posts và reset skip về đúng số lượng
            get().setPosts(filterType, newPosts, hasMoreData);
          }

          console.log(`✅ ${STORE_EVENTS.NEWSFEED_LOAD} - ${newPosts.length} posts loaded for ${filterType}`);
          return { success: true, posts: newPosts };
        } catch (error) {
          console.error('❌ Error fetching posts:', error);

          // Reset loading states
          if (isLoadMore) {
            get().setPostsLoadingMore(filterType, false);
          } else {
            get().setPostsLoading(filterType, false);
          }

          return { success: false, error };
        }
      },

      // Handle new post creation
      onPostCreated: (newPost) => {
        // Add to all relevant filters
        set((state) => {
          const addToFilter = (filterData) => ({
            ...filterData,
            posts: [newPost, ...filterData.posts],
            skip: filterData.skip + 1
          });

          return {
            posts: {
              newsfeed: addToFilter(state.posts.newsfeed),
              recent: addToFilter(state.posts.recent),
              friends: addToFilter(state.posts.friends),
            }
          };
        });

        console.log(`✅ ${STORE_EVENTS.POST_CREATED} - New post ${newPost.id} added to all filters`);
      },

      // ============ CHAT STATE ============
      chatList: [],
      conversationMap: new Map(),
      isLoadingChats: false,
      error: null,
      unreadMessageCount: 0,

      // Helper function to calculate unread message count
      calculateUnreadMessageCount: (chatList) => {
        const total = chatList.reduce((sum, chat) => {
          return sum + (chat.notReadMessageCount || 0);
        }, 0);
        return total;
      },

      // Update unread message count
      updateUnreadMessageCount: () => {
        const { chatList } = get();
        const newCount = get().calculateUnreadMessageCount(chatList);

        set({ unreadMessageCount: newCount });
        console.log(`✅ ${STORE_EVENTS.UNREAD_MESSAGE_COUNT_UPDATED} - Total unread messages: ${newCount}`);

        return newCount;
      },

      // Fetch chat list from API
      fetchChatList: async () => {
        set({ isLoadingChats: true, error: null });
        try {
          console.log('🚀 Fetching chat list from API...');
          const res = await api.get('/v1/chat');
          console.log('📊 Chat API response:', res);

          const data = res.data.body || res.data || [];

          // Reverse the chat list when fetching
          const reversedData = [...data].reverse();

          // Calculate unread message count
          const unreadCount = get().calculateUnreadMessageCount(reversedData);

          set({
            chatList: reversedData,
            isLoadingChats: false,
            error: null,
            unreadMessageCount: unreadCount
          });

          console.log(`✅ ${STORE_EVENTS.CHAT_LIST_LOAD} - ${reversedData.length} chats loaded`);
          console.log(`✅ ${STORE_EVENTS.UNREAD_MESSAGE_COUNT_UPDATED} - Total unread messages: ${unreadCount}`);
          return reversedData;
        } catch (error) {
          console.error('❌ Error fetching chats:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Failed to load chats';

          set({
            isLoadingChats: false,
            error: errorMessage,
            chatList: [],
            unreadMessageCount: 0
          });

          throw error;
        }
      },

      // Update chat user online status
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

      // Get block status by chat ID
      getBlockStatusByChatId: (chatId) => {
        const { chatList } = get();
        const chat = chatList.find(c => (c.id === chatId || c.chatId === chatId));

        if (!chat) {
          console.log(`❌ Chat not found for ID: ${chatId}`);
          return "NORMAL";
        }

        return chat.blockStatus || "NORMAL";
      },

      // Mark chat as read
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

      // Handle received message
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

      // Handle new chat creation
      onChatCreated: (newChat) => {
        set(state => {
          const updatedChatList = [newChat, ...state.chatList];
          const unreadCount = get().calculateUnreadMessageCount(updatedChatList);

          return {
            chatList: updatedChatList,
            unreadMessageCount: unreadCount
          };
        });

        console.log(`📊 ${STORE_EVENTS.CHAT_CREATED} - ${newChat.id}`);
      },

      // ============ NOTIFICATIONS STATE ============
      notifications: [],
      isLoadingNotifications: false,
      unreadNotificationCount: 0,
      unreadNotificationCountFromSocket: 0,

      // Fetch unread notification count
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

      // Fetch notifications
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

          // Merge with socket notifications if available
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
      // Handle notification received from socket
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
          unreadNotificationCountFromSocket: state.unreadNotificationCountFromSocket + 1
        }));

        console.log(`📊 ${STORE_EVENTS.NOTIFICATION_RECEIVED} - ${notification.id || 'new notification'} | Socket count: ${get().unreadNotificationCountFromSocket}`);
      },

      // ============ CHAT NAVIGATION & SELECTION LOGIC ============
      selectedChatId: null,
      virtualChatUser: null,

      // Select a chat
      selectChat: (chatId) => {
        set({
          selectedChatId: chatId,
          virtualChatUser: null
        });
        console.log(`✅ Selected chat: ${chatId}`);
      },

      // Show virtual chat with user
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

      // Clear chat selection
      clearChatSelection: () => {
        set({
          selectedChatId: null,
          virtualChatUser: null
        });
      },

      // ============ INITIALIZATION ============
      initializeApp: async () => {
        console.log('🚀 Initializing app...');
        try {
          await Promise.allSettled([
            get().fetchChatList(),
            get().fetchUnreadNotificationCount(),
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
          filterType: "RELEVANT",
          conversationMap: new Map(),
          selectedChatId: null,
          virtualChatUser: null,
          notifications: [],
          unreadNotificationCount: 0,
          unreadNotificationCountFromSocket: 0,
          unreadMessageCount: 0,
          error: null,
          isLoadingChats: false,
          isLoadingNotifications: false,
          // Reset posts state
          posts: {
            newsfeed: {
              posts: [],
              skip: 0,
              hasMore: true,
              loading: false,
              loadingMore: false,
              lastFetched: null,
            },
            recent: {
              posts: [],
              skip: 0,
              hasMore: true,
              loading: false,
              loadingMore: false,
              lastFetched: null,
            },
            friends: {
              posts: [],
              skip: 0,
              hasMore: true,
              loading: false,
              loadingMore: false,
              lastFetched: null,
            },
          },
        }, false, 'clearAllData');
      },

      // Ensure notifications are loaded
      ensureNotificationsLoaded: () => {
        const { notifications, isLoadingNotifications } = get();

        if (notifications.length === 0 && !isLoadingNotifications) {
          console.log('📊 Auto-fetching notifications (empty list)...');
          get().fetchNotifications(true).catch(console.error);
        }
      },

      // Force refresh chat list
      refreshChatList: async () => {
        console.log('🔄 Force refreshing chat list...');
        return get().fetchChatList();
      },

    }), {
      name: 'app-store'
    })
);

export default useAppStore;