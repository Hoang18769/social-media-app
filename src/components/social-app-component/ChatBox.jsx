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
  
  // ✅ Thêm state để track việc tạo chat
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // ✅ Refs để handle abort và prevent duplicate requests
  const abortControllerRef = useRef(null);
  const createChatPromiseRef = useRef(null);
  const lastMessageTimestampRef = useRef(0);
  
  // Refs for infinity scroll
  const messagesContainerRef = useRef(null);
  const topElementRef = useRef(null);
  const bottomElementRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // Zustand store
  const fetchChatList = useAppStore((state) => state.fetchChatList);
  const selectChat = useAppStore((state) => state.selectChat);
  const clearChatSelection = useAppStore((state) => state.clearChatSelection);
  const getBlockStatusByChatId = useAppStore((state) => state.getBlockStatusByChatId);

  // ✅ Get block status for current chat
  const blockStatus = currentChatId ? getBlockStatusByChatId(currentChatId) : "NORMAL";
  
  // ✅ Determine if user can send messages based on block status
  const canSendMessage = blockStatus === "NORMAL";
  const isBlockedByOther = blockStatus === "HAS_BEEN_BLOCKED";
  const hasBlockedOther = blockStatus === "BLOCKED";

  const { 
    messages, 
    loading, 
    loadingMore, 
    hasMore, 
    totalMessages,
    loadMoreMessages 
  } = useChat(currentChatId);
  console.log(messages)
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
      // ✅ Reset states khi chuyển chat
      setIsCreatingChat(false);
      setIsSendingMessage(false);
      // Cancel pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      createChatPromiseRef.current = null;
    }
  }, [chatId]);

  // ✅ Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup khi component unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  // ✅ Tối ưu hóa hàm createNewChat với abort controller và debounce
  const createNewChat = async (message) => {
    // Prevent duplicate calls
    const currentTime = Date.now();
    if (currentTime - lastMessageTimestampRef.current < 1000) {
      console.log("🚫 Debouncing: Too fast, ignoring duplicate request");
      return null;
    }
    lastMessageTimestampRef.current = currentTime;

    // If already creating chat, wait for the existing promise
    if (createChatPromiseRef.current) {
      console.log("⏳ Chat creation in progress, waiting...");
      try {
        return await createChatPromiseRef.current;
      } catch (error) {
        console.error("❌ Error waiting for existing chat creation:", error);
        createChatPromiseRef.current = null;
        throw error;
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Create the promise and store it
    const createChatPromise = (async () => {
      try {
        setIsCreatingChat(true);
        console.log("🆕 Creating new chat with message:", message);

        const response = await api.post("/v1/chat/send", {
          username: targetUser?.username,
          text: message,
        }, {
          signal: abortController.signal, // ✅ Add abort signal
          timeout: 15000, // 15s timeout
        });

        if (abortController.signal.aborted) {
          console.log("🚫 Request was aborted");
          return null;
        }

        if (response.data?.body.chatId) {
          const newChatId = response.data.body.chatId;
          console.log("✅ New chat created with ID:", newChatId);
          
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
        if (error.name === 'AbortError' || abortController.signal.aborted) {
          console.log("🚫 Chat creation was cancelled");
          return null;
        }
        console.error("❌ Error creating chat:", error);
        toast.error("Không thể tạo cuộc trò chuyện mới");
        throw error;
      } finally {
        setIsCreatingChat(false);
        createChatPromiseRef.current = null;
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    })();

    createChatPromiseRef.current = createChatPromise;
    return await createChatPromise;
  };

  // ✅ Tối ưu hóa hàm handleSend
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // ✅ Check if user can send message (not blocked by other user)
    if (!canSendMessage) {
      toast.error("Không thể gửi tin nhắn do bạn đã bị chặn");
      return;
    }

    // ✅ Prevent spam clicking
    if (isSendingMessage || isCreatingChat) {
      console.log("🚫 Already sending message or creating chat, please wait");
      return;
    }

    try {
      setIsSendingMessage(true);
      
      if (isNewChat) {
        console.log("📝 Sending first message to create new chat");
        const newChatId = await createNewChat(trimmed);
        if (newChatId) {
          console.log("✅ Chat created successfully:", newChatId);
        } else {
          console.log("⏭️ Chat creation was cancelled or failed");
          return;
        }
      } else {
        if (!isConnected) {
          toast.error("Chưa kết nối đến server");
          return;
        }
        console.log("📨 Sending message via socket");
        await sendMessage(trimmed);
      }
      setInput("");
    } catch (err) {
      console.error("❌ Error in handleSend:", err);
      if (err.name !== 'AbortError') {
        toast.error("Lỗi khi gửi tin nhắn");
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // ✅ Check block status before allowing any action
      if (!canSendMessage) {
        toast.error("Không thể gửi tin nhắn do bạn đã bị chặn");
        return;
      }
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
    
    // ✅ Check block status before allowing file selection
    if (!canSendMessage) {
      toast.error("Không thể gửi file do bạn đã bị chặn");
      e.target.value = null;
      return;
    }
    
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
    
    // ✅ Check block status before sending file
    if (!canSendMessage) {
      toast.error("Không thể gửi file do bạn đã bị chặn");
      return;
    }
    
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

  // ✅ Render blocked status message
  const renderBlockedStatus = () => {
    if (blockStatus === "NORMAL") return null;

    let message = "";
    let bgColor = "bg-red-50";
    let textColor = "text-red-700";
    let borderColor = "border-red-200";

    if (isBlockedByOther) {
      message = `Bạn đã bị ${targetUser?.displayName || targetUser?.username} chặn. Không thể gửi tin nhắn.`;
    } else if (hasBlockedOther) {
      message = `Bạn đã chặn ${targetUser?.displayName || targetUser?.username}. Bỏ chặn để có thể nhắn tin.`;
      bgColor = "bg-yellow-50";
      textColor = "text-yellow-700";
      borderColor = "border-yellow-200";
    }

    return (
      <div className={`mx-4 mb-3 p-3 rounded-lg border ${bgColor} ${borderColor}`}>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <svg className={`w-5 h-5 ${textColor}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className={`text-sm font-medium ${textColor}`}>
            {message}
          </p>
        </div>
      </div>
    );
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

  // ✅ Tính toán trạng thái input disabled - bao gồm cả block status
  const isInputDisabled = !isConnected || isSendingMessage || isCreatingChat || uploading || !canSendMessage;
  
  const inputPlaceholder = !canSendMessage
    ? isBlockedByOther 
      ? "Bạn đã bị chặn, không thể gửi tin nhắn"
      : "Bạn đã chặn người này"
    : isCreatingChat 
      ? "Đang tạo cuộc trò chuyện..." 
      : isSendingMessage 
        ? "Đang gửi tin nhắn..."
        : isNewChat
          ? `Nhắn tin cho ${targetUser?.displayName || targetUser?.username}...`
          : "Nhập tin nhắn...";

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

        {/* ✅ Block status message */}
        {renderBlockedStatus()}

        {/* Preview file */}
        {canSendMessage && (
          <FilePreviewInChat
            selectedFile={selectedFile}
            filePreview={filePreview}
            onCancel={handleCancelFile}
          />
        )}

        {/* ✅ Input với loading states và block status */}
        {canSendMessage && (
          <ChatInput
            input={input}
            setInput={setInput}
            isConnected={!isInputDisabled}
            selectedFile={selectedFile}
            editingMessage={editingMessage}
            uploading={uploading}
            disabled={isInputDisabled}
            loading={isSendingMessage || isCreatingChat}
            onSend={handleSend}
            onSendFile={handleSendFile}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onCancelFile={handleCancelFile}
            onFileSelect={handleFileSelect}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
          />
        )}
      </div>
    </>
  );
}