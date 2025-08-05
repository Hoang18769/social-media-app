"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import MotionContainer from "@/components/ui-components/MotionContainer";
import Chatbox from "@/components/social-app-component/ChatBox";
import Header from "@/components/ui-components/Header";
import Sidebar from "@/components/ui-components/Sidebar";
import ProgressBar from "@/components/ui-components/ProgressBar";
import { Toaster } from "react-hot-toast";
import ChatList from "@/components/social-app-component/ChatList";
import useNotificationSocket from "@/hooks/useNotificationSocket";
import useMessageNotification from "@/hooks/useMessageNotification";
import useErrorSocket from "@/hooks/useErrorSocket"; // ✅ Import useErrorSocket
import useOnlineNotification from "@/hooks/useOnlineNotification";
import { getAuthInfo } from "@/utils/axios";

// ✅ Import Call System
import { CallProvider } from "@/context/CallContext";
import { useCall } from "@/context/CallContext";
import CallPopup from "@/components/social-app-component/CallPopup";
import CallVideo from "@/components/social-app-component/CallVideo";
import ThemeProvider from "@/providers/ThemeProvider";
import { useRouter } from "next/navigation";
import {pageMetadata, usePageMetadata} from "@/utils/clientMetadata";
import useAppStore from "@/store/ZustandStore";

// ✅ Component để hiển thị call UI global
function GlobalCallInterface() {
  const { 
    incomingCaller, 
    currentCall, 
    localStream, 
    remoteStream, 
    isCallEnding,
    acceptCall, 
    rejectCall 
  } = useCall();
  const router=useRouter();
  // ✅ State để control việc hiển thị CallVideo
  const [showCallVideo, setShowCallVideo] = useState(false);
  useEffect(()=>{
  const authInfo=getAuthInfo();
  if(!authInfo){
        router.push("/register")
        return;
  }
  if(!authInfo.token || !authInfo.userId || !authInfo.userName)
    router.push("/register")
},[router])

  // ✅ Hiển thị CallVideo khi có cuộc gọi active hoặc đang ending
  useEffect(() => {
    const shouldShow = currentCall || isCallEnding;
    console.log("[DEBUG] CallVideo visibility - currentCall:", !!currentCall, "isCallEnding:", isCallEnding, "shouldShow:", shouldShow);
    setShowCallVideo(shouldShow);
  }, [currentCall, isCallEnding]);

  // ✅ Callback khi CallVideo đóng
  const handleCallVideoClose = () => {
    console.log("[DEBUG] CallVideo closed by user");
    setShowCallVideo(false);
  };

  return (
    <>
      {/* Popup cho cuộc gọi đến */}
      {incomingCaller && !currentCall && !isCallEnding && (
        <CallPopup
          caller={incomingCaller}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Video interface khi đang trong cuộc gọi */}
      {showCallVideo && (
        <CallVideo 
          localStream={localStream} 
          remoteStream={remoteStream}
          onCallEnd={handleCallVideoClose}
        />
      )}
    </>
  );
}

// ✅ Hàm kiểm tra route có cần hiển thị header không
function shouldShowHeader(pathname) {
  // Các route cần hiển thị header
  const showHeaderRoutes = [
    '/',
    '/home',
    '/settings',
    '/search',
    '/friends',
  ];
  
  // Kiểm tra exact match
  if (showHeaderRoutes.includes(pathname)) {
    return true;
  }
  
  // Kiểm tra profile route với pattern /profile/{abc}
  if (pathname.startsWith('/profile/')) {
    return true;
  }
  
  // Kiểm tra settings route với sub-paths
  if (pathname.startsWith('/settings')) {
    return true;
  }
  
  return false;
}

// ✅ Main Layout Content (tách ra để có thể sử dụng useCall)
function MainLayoutContent({ children }) {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const prevThemeRef = useRef(null);

  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeTargetUser, setActiveTargetUser] = useState(null);
  const [blockStatus, setBlockStatus] = useState(null);
  const {fetchUnreadNotificationCount} = useAppStore();

  // ✅ Sử dụng Call Hook
  const { initializeCall, currentCall, isCallEnding } = useCall();

  // ✅ Kiểm tra có cần hiển thị header không
  const showHeader = shouldShowHeader(pathname);
  useEffect(()=>{
    fetchUnreadNotificationCount();
  },[]);
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedToken = localStorage.getItem("accessToken");

    if (storedUserId && storedToken) {
      setUserId(storedUserId);
      setToken(storedToken);
      
      // ✅ Initialize call system khi có token
      initializeCall(storedToken);
    }
  }, [initializeCall]);

  // ✅ Sử dụng các socket hooks
  useMessageNotification(userId);
  useNotificationSocket(userId, token);
  useOnlineNotification(userId);
  useErrorSocket(userId); // ✅ Subscribe tới error channel

  useEffect(() => {
    const handleNewMessage = (event) => {
      const messageData = event.detail;
      console.log("🔔 [MainLayout] New message received:", messageData);
      
      // Logic để handle tin nhắn mới
      if (pathname === "/chats" && !activeChatId) {
        // Auto-select chat mới nếu đang ở trang chats
        setActiveChatId(messageData.chatId);
        setActiveTargetUser(messageData.sender);
      }
    };

    const handleOpenChat = (event) => {
      const { chatId, targetUser } = event.detail;
      console.log("💬 [MainLayout] Opening chat:", chatId);
      
      // Navigate to chats page nếu chưa ở đó
      if (pathname !== "/chats") {
        // Sử dụng router để navigate
        // router.push("/chats");
      }
      
      // Mở chat
      setActiveChatId(chatId);
      setActiveTargetUser(targetUser);
    };

    // ✅ Handle error events từ useErrorSocket
    const handleErrorReceived = (event) => {
      const errorData = event.detail;
      console.log("🚨 [MainLayout] Error received:", errorData);
      
      // Có thể thêm logic xử lý error cụ thể ở đây
      // Ví dụ: redirect về login nếu token expired, etc.
    };

    // Register event listeners
    window.addEventListener('newMessageReceived', handleNewMessage);
    window.addEventListener('openChat', handleOpenChat);
    window.addEventListener('errorReceived', handleErrorReceived); // ✅ Listen for errors
    
    return () => {
      window.removeEventListener('newMessageReceived', handleNewMessage);
      window.removeEventListener('openChat', handleOpenChat);
      window.removeEventListener('errorReceived', handleErrorReceived); // ✅ Cleanup
    };
  }, [pathname, activeChatId]);

  // Xử lý animation theme change
  useEffect(() => {
    setMounted(true);
  }, []);

  const shouldAnimate =
    mounted && prevThemeRef.current && prevThemeRef.current !== resolvedTheme;

  useEffect(() => {
    if (mounted) {
      prevThemeRef.current = resolvedTheme;
    }
  }, [resolvedTheme, mounted]);

  // Xác định các route ẩn right sidebar
  const hideRightSidebar =
    pathname.startsWith("/settings") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/chats");

  // Xử lý chat
  const handleSelectChat = (chatId, user, chat) => {
    setActiveChatId(chatId);
    setActiveTargetUser(user);
    setBlockStatus(chat.blockStatus);
  };

  const handleBackToList = () => {
    setActiveChatId(null);
    setActiveTargetUser(null);
  };

  // ✅ Callback khi tạo chat mới từ ChatBox
  const handleChatCreated = (newChatId, targetUser) => {
    setActiveChatId(newChatId);
    setActiveTargetUser(targetUser);
  };

  const renderRightSidebar = () => {
    if (hideRightSidebar) return null;

    return (
      <aside className="hidden md:flex justify-center items-end w-[80px] lg:w-[400px] lg:max-w-[400px] h-[calc(100vh-64px)] p-4">
        <div className="flex flex-col w-full h-full relative">
          {activeChatId && activeTargetUser ? (
            <Chatbox
              chatId={activeChatId}
              targetUser={activeTargetUser}
              onBack={handleBackToList}
              onChatCreated={handleChatCreated}
              // ✅ Pass token cho call functionality
              beToken={token}
              recipientId={activeTargetUser?.id || activeTargetUser?.userId}
            />
          ) : (
            <div className="flex flex-col w-full h-full">
              <ChatList
                onSelectChat={handleSelectChat}
                selectedChatId={activeChatId}
              />
            </div>
          )}
        </div>
      </aside>
    );
  };

  // ✅ Kiểm tra có đang trong cuộc gọi để điều chỉnh UI
  const isInCall = currentCall || isCallEnding;

  // ✅ Tính toán header height và padding top
  const headerHeight = showHeader ? "h-12" : "h-0";
  const contentPaddingTop = showHeader ? "pt-12" : "pt-0";
  const sidebarHeight = showHeader ? "h-[calc(100vh-64px)]" : "h-screen";

// ✅ Fixed layout - phần chính cần chỉnh sửa
const layoutContent = (
  <>
    <ProgressBar />
    <Toaster 
      position="top-right" 
      toastOptions={{ 
        duration: 4000,
        style: {
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        },
      }} 
    />

    {/* ✅ Main UI - ẩn khi đang trong cuộc gọi */}
    <div className={`h-screen flex flex-col ${isInCall ? 'hidden' : ''}`}>
      
      {/* ✅ Header - chỉ hiển thị khi showHeader = true */}
      {showHeader && (
        <header className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 ${headerHeight} border-b transition-colors duration-500`}>
          <Header />
        </header>
      )}

      <div className={`flex flex-1 ${contentPaddingTop} bg-[var(--background)] text-[var(--foreground)] transition-colors duration-500`}>
        {/* Left Sidebar - ẩn trên mobile, fixed trên desktop */}
       <aside
  className={`hidden md:block md:w-[80px] ${sidebarHeight} overflow-y-auto ${
    pathname === "/chats" ? "pt-12" : ""
  }`}
>
  <Sidebar />
</aside>

        {/* Main Content - điều chỉnh height và padding */}
        <main className={`flex-1 ${showHeader ? 'h-[calc(100vh-64px)]' : 'h-screen'} overflow-y-auto`}>
          <div
            className={`${
              hideRightSidebar ? "max-w-6xl" : "max-w-4xl"
            } w-full mx-auto space-y-6 pb-[72px] md:pb-0`}
          >
            {children}
          </div>
        </main>

        {/* Right Sidebar */}
        {renderRightSidebar()}
      </div>

      {/* ✅ Bottom Navigation - Fixed position trên mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t h-[72px]">
        <Sidebar />
      </div>
    </div>

    {/* ✅ Global Call Interface - luôn hiển thị */}
    <GlobalCallInterface />
  </>
);

  return shouldAnimate ? (
    <AnimatePresence mode="wait">
      <MotionContainer
        key={resolvedTheme}
        modeKey={resolvedTheme}
        effect="fadeUp"
        duration={0.25}
      >
        {layoutContent}
      </MotionContainer>
    </AnimatePresence>
  ) : (
    layoutContent
  );
}

// ✅ Main Layout với CallProvider wrapper
export default function MainLayout({ children }) {
  usePageMetadata(pageMetadata.home());
  return (
    <CallProvider>
    <ThemeProvider>
      <MainLayoutContent>
        {children}
      </MainLayoutContent>

    </ThemeProvider>
    </CallProvider>
  );
}