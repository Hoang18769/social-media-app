"use client";

import { useState, useEffect } from "react";
import ChatList from "@/components/social-app-component/ChatList";
import ChatBox from "@/components/social-app-component/ChatBox";
import useAppStore from "@/store/ZustandStore";
import useIsMobile from "@/hooks/useIsMobile";
import {pageMetadata, usePageMetadata} from "@/utils/clientMetadata";

export default function ChatLayout() {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [chatListKey, setChatListKey] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  const isMobile = useIsMobile();

  // Store data
  const selectedChatId_Store = useAppStore((state) => state.selectedChatId);
  const virtualChatUser_Store = useAppStore((state) => state.virtualChatUser);
  const chatList = useAppStore((state) => state.chatList);
  const fetchChatList = useAppStore((state) => state.fetchChatList);
  const clearChatSelection = useAppStore((state) => state.clearChatSelection);

  usePageMetadata(pageMetadata.chats());

  // Logic hiển thị responsive
  const shouldShowChatList = !targetUser || !isMobile;
  const shouldShowChatBox = !!targetUser;
  const shouldShowChatSkeleton = !targetUser && !isMobile;

  useEffect(() => {
    // Simulate initialization delay if needed
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (selectedChatId_Store) {
      console.log("✅ Using selectedChatId from store");
      const selectedChat = chatList.find(chat =>
          chat.chatId === selectedChatId_Store || chat.id === selectedChatId_Store
      );
      if (selectedChat) {
        setSelectedChatId(selectedChatId_Store);
        setTargetUser(selectedChat.target);
        return;
      }
    }

    if (virtualChatUser_Store) {
      console.log("✅ Using virtualChatUser from store");
      setSelectedChatId(null);
      setTargetUser(virtualChatUser_Store);
      return;
    }

    console.log("❌ No valid data found");
  }, [selectedChatId_Store, virtualChatUser_Store, chatList]);

  const handleSelectChat = (chatId, user) => {
    setSelectedChatId(chatId);
    setTargetUser(user);
  };

  const handleChatCreated = async (newChatId, user) => {
    console.log("🎉 Chat mới được tạo:", { newChatId, user });
    try {
      await fetchChatList();
      setSelectedChatId(newChatId);
      setTargetUser(user);
      setChatListKey((prev) => prev + 1);
      console.log("✅ Chat creation flow completed successfully");
    } catch (error) {
      console.error("❌ Error in chat creation flow:", error);
    }
  };

  const handleBackToList = () => {
    clearChatSelection();
    setSelectedChatId(null);
    setTargetUser(null);
  };

  // Show loading state during initialization
  if (isInitializing) {
    return (
        <div className="pt-16 flex h-[calc(100vh-64px)] bg-[var(--background)] text-[var(--foreground)] items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="md:mt-16 flex h-[calc(100vh-64px)] bg-[var(--background)] text-[var(--foreground)] transition-colors duration-500 p-2 sm:p-4 gap-4">
        {/* ChatList - Logic hiển thị responsive */}
        {shouldShowChatList && (
            <aside className="w-full md:w-[40%] lg:w-[340px] h-full md:h-auto max-h-[calc(100vh-72px)] md:max-h-none rounded-2xl bg-[var(--card)] border border-[var(--border)] p-2 md:p-4 overflow-y-auto shadow-sm">
              <ChatList
                  key={chatListKey}
                  onSelectChat={handleSelectChat}
                  selectedChatId={selectedChatId}
              />
            </aside>
        )}

        {/* ChatBox - Logic hiển thị responsive */}
        {shouldShowChatBox && (
            <main className="w-full md:w-[60%] md:flex-1 rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-y-auto shadow-sm">
              <ChatBox
                  chatId={selectedChatId}
                  targetUser={targetUser}
                  onBack={handleBackToList}
                  onChatCreated={handleChatCreated}
              />
            </main>
        )}

        {/* Chat Skeleton - Hiển thị khi chưa chọn chat trên màn hình lớn */}
        {shouldShowChatSkeleton && (
            <main className="w-full md:h-full md:w-[60%] md:flex-1 rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-y-auto shadow-sm">
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                  Chưa có cuộc trò chuyện được chọn
                </h3>
                <p className="text-[var(--muted-foreground)] mb-4 max-w-md">
                  Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu cuộc trò chuyện mới để bắt đầu nhắn tin.
                </p>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center text-sm text-[var(--muted-foreground)]">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Tìm kiếm và chọn người dùng
                  </div>
                  <div className="flex items-center text-sm text-[var(--muted-foreground)]">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Bắt đầu cuộc trò chuyện mới
                  </div>
                  <div className="flex items-center text-sm text-[var(--muted-foreground)]">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    Tiếp tục cuộc trò chuyện cũ
                  </div>
                </div>
              </div>
            </main>
        )}
      </div>
  );
}