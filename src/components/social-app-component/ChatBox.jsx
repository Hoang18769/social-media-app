"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";

import useChat from "@/hooks/useChat";
import useSendMessage from "@/hooks/useSendMessageSocket";
import useAppStore from "@/store/ZustandStore";
import api from "@/utils/axios";

import { useCall } from "@/context/CallContext";

// Các components đã tách
import ChatHeader from "./ChatHeader";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";
import FilePreviewInChat from "../ui-components/FilePreviewInChat";

export default function ChatBox({ chatId, targetUser, onBack, onChatCreated }) {
  const pathname = usePathname();
  const showBackButton = pathname !== "/chats";

  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [isNewChat, setIsNewChat] = useState(!chatId);
  
  // Refs for infinity scroll
  const messagesContainerRef = useRef(null);
  const topElementRef = useRef(null);
  const bottomElementRef = useRef(null); // Thêm ref cho bottom element
  const scrollPositionRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // Zustand store
  const fetchChatList = useAppStore((state) => state.fetchChatList);
  const selectChat = useAppStore((state) => state.selectChat);
  const clearChatSelection = useAppStore((state) => state.clearChatSelection);

  const { 
    messages, 
    loading, 
    loadingMore, 
    hasMore, 
    totalMessages,
    loadMoreMessages 
  } = useChat(currentChatId);
  
  const { sendMessage, isConnected } = useSendMessage({
    chatId: currentChatId,
    receiverUsername: targetUser?.username,
  });

  // ✅ Sử dụng hook gọi điện
  const {
    isConnected: callConnected,
    callStatus,
    currentCall,
    makeCall,
    endCall,
    incomingCaller,
    acceptCall,
    rejectCall,
    remoteStream,
    localStream,
    initializeCall,
  } = useCall();

  // Popup nhận cuộc gọi
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      console.log("[DEBUG] Initializing call system with accessToken present:", !!token);
      initializeCall(token);
    } else {
      console.warn("[DEBUG] No accessToken found in localStorage!");
    }
  }, []);

  useEffect(() => {
    if (chatId !== currentChatId) {
      setCurrentChatId(chatId);
      setIsNewChat(!chatId);
    }
  }, [chatId]);

  // Infinity scroll using Intersection Observer thay vì scroll event
  useEffect(() => {
    if (!bottomElementRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMoreRef.current) {
          console.log("📜 Bottom element visible, loading more messages...");
          isLoadingMoreRef.current = true;
          
          loadMoreMessages().then(() => {
            isLoadingMoreRef.current = false;
          }).catch(() => {
            isLoadingMoreRef.current = false;
          });
        }
      },
      {
        root: messagesContainerRef.current,
        rootMargin: '0px',
        threshold: 0.1
      }
    );

    observer.observe(bottomElementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore, loadMoreMessages, messages]);

  // Auto scroll to bottom for new messages (only if user is near bottom)
  useEffect(() => {
    if (messages?.length > 0 && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      // Only auto-scroll if user is near bottom or it's a new chat
      if (isNearBottom || messages.length === 1) {
        container.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [messages]);

  // Attach scroll listener - giữ lại cho auto-scroll behavior
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const handleScroll = () => {
        scrollPositionRef.current = container.scrollTop;
      };
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".message-container")) {
        setSelectedMessage(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith("blob:")) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const createNewChat = async (message) => {
    try {
      const response = await api.post("/v1/chat/send", {
        username: targetUser?.username,
        text: message,
      });

      if (response.data?.body.chatId) {
        const newChatId = response.data.body.chatId;
        setCurrentChatId(newChatId);
        setIsNewChat(false);

        await fetchChatList();
        selectChat(newChatId);
        if (onChatCreated) onChatCreated(newChatId, targetUser);

        toast.success("Đã tạo cuộc trò chuyện mới!");
        return newChatId;
      }
      throw new Error("Không thể tạo chat mới");
    } catch (error) {
      toast.error("Không thể tạo cuộc trò chuyện mới");
      throw error;
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      if (isNewChat) {
        await createNewChat(trimmed);
      } else {
        if (!isConnected) {
          toast.error("Chưa kết nối đến server");
          return;
        }
        await sendMessage(trimmed);
      }
      setInput("");
    } catch (err) {
      toast.error("Lỗi khi gửi tin nhắn");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedFile) handleSendFile();
      else if (editingMessage) handleSaveEdit();
      else handleSend();
    }
    if (e.key === "Escape") {
      if (selectedFile) handleCancelFile();
      else if (editingMessage) handleCancelEdit();
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isNewChat) {
      toast.error("Vui lòng gửi tin nhắn đầu tiên trước khi gửi file");
      e.target.value = null;
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File quá lớn! Vui lòng chọn file < 10MB");
      e.target.value = null;
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else setFilePreview(null);
    e.target.value = null;
  };

  const handleSendFile = async () => {
    if (!selectedFile || !currentChatId || !targetUser?.username) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("attachment", selectedFile);
      formData.append("username", targetUser.username);
      await api.post(`/v1/chat/send-file`, formData);
      toast.success("File đã được gửi!");
      handleCancelFile();
    } catch {
      toast.error("Lỗi khi gửi file");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelFile = () => {
    if (filePreview?.startsWith("blob:")) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleMessageClick = (msg) => {
    const isSelf = msg.sender?.id !== targetUser?.id;
    if (isSelf && !msg.deleted) {
      setSelectedMessage(selectedMessage === msg.id ? null : msg.id);
    }
  };
  
  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/v1/chat/${messageId}`);
      setSelectedMessage(null);
      toast.success("Đã xóa tin nhắn");
    } catch {
      toast.error("Lỗi xóa tin nhắn");
    }
  };
  
  const handleEditMessage = (msg) => {
    setEditingMessage(msg);
    setInput(msg.content);
    setSelectedMessage(null);
  };
  
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInput("");
  };
  
  const handleSaveEdit = async () => {
    const trimmed = input.trim();
    if (!trimmed || !editingMessage) return;
    try {
      const res = await api.put("/v1/chat/edit", {
        messagesId: editingMessage.id,
        text: trimmed,
      });
      if (res.data.code === 200) {
        setEditingMessage(null);
        setInput("");
        toast.success("Sửa tin nhắn thành công!");
      }
    } catch {
      toast.error("Có lỗi khi sửa tin nhắn");
    }
  };

  const renderMessages = () => {
    if (loading && currentChatId) {
      return (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            Đang tải tin nhắn...
          </p>
        </div>
      );
    }

    if (isNewChat) {
      return (
        <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
          Bắt đầu cuộc trò chuyện với{" "}
          {targetUser?.displayName || targetUser?.username}
        </div>
      );
    }

    if (messages?.length === 0) {
      return (
        <p className="text-center text-sm text-[var(--muted-foreground)] py-8">
          Chưa có tin nhắn nào
        </p>
      );
    }

    return (
      <>
        {/* Load more indicator */}
        {loadingMore && (
          <div className="text-center py-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Đang tải thêm tin nhắn...
            </p>
          </div>
        )}
        
        {/* No more messages indicator */}
        {!hasMore && totalMessages > 20 && (
          <div className="text-center py-2">
            <p className="text-xs text-[var(--muted-foreground)]">
              Đã hiển thị tất cả tin nhắn
            </p>
          </div>
        )}
        
        {/* Messages list - reversed order (newest first) */}
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            msg={msg}
            targetUser={targetUser}
            selectedMessage={selectedMessage}
            onMessageClick={handleMessageClick}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        ))}
        
        {/* Bottom element reference for intersection observer */}
        <div ref={bottomElementRef} className="h-1" />
        
        {/* Top element reference for scroll positioning */}
        <div ref={topElementRef} />
      </>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full w-full bg-[var(--card)] text-[var(--foreground)] rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <ChatHeader
          targetUser={targetUser}
          isConnected={isNewChat ? true : isConnected}
          onBack={onBack}
          showBackButton={showBackButton}
          onCall={() => makeCall(targetUser?.username, false)} // Voice call
          onVideoCall={() => makeCall(targetUser?.username, true)} // Video call
        />

        {/* Messages Container - with reverse flex direction */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 px-4 py-3 overflow-y-auto space-y-2 bg-transparent flex flex-col-reverse"
          style={{ 
            scrollBehavior: 'smooth',
            overscrollBehavior: 'contain'
          }}
        >
          {renderMessages()}
        </div>

        {/* Preview file */}
        <FilePreviewInChat
          selectedFile={selectedFile}
          filePreview={filePreview}
          onCancel={handleCancelFile}
        />

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          isConnected={isNewChat ? true : isConnected}
          selectedFile={selectedFile}
          editingMessage={editingMessage}
          uploading={uploading}
          onSend={handleSend}
          onSendFile={handleSendFile}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onCancelFile={handleCancelFile}
          onFileSelect={handleFileSelect}
          onKeyDown={handleKeyDown}
          placeholder={
            isNewChat
              ? `Nhắn tin cho ${
                  targetUser?.displayName || targetUser?.username
                }...`
              : "Nhập tin nhắn..."
          }
        />
      </div>
    </>
  );
}