"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";

import useChat from "@/hooks/useChat";
import useSendMessage from "@/hooks/useSendMessageSocket";
import useAppStore from "@/store/ZustandStore";
import api from "@/utils/axios";

import { useCall } from "@/context/CallContext";
import useTypingNotification from "@/hooks/useTypingNotification";

// Components
import ChatHeader from "./ChatHeader";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";
import FilePreviewInChat from "../ui-components/FilePreviewInChat";
import TypingIndicator from "../ui-components/TypingIndicator";

export default function ChatBox({ chatId, targetUser, onBack, onChatCreated }) {
  // State management
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [isNewChat, setIsNewChat] = useState(!chatId);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Refs
  const abortControllerRef = useRef(null);
  const createChatPromiseRef = useRef(null);
  const lastMessageTimestampRef = useRef(0);
  const messagesContainerRef = useRef(null);
  const bottomElementRef = useRef(null);
  const isLoadingMoreRef = useRef(false);

  // Store & hooks - separate selectors to avoid infinite loop
  const fetchChatList = useAppStore(state => state.fetchChatList);
  const selectChat = useAppStore(state => state.selectChat);
  const getBlockStatusByChatId = useAppStore(state => state.getBlockStatusByChatId);

  const blockStatus = currentChatId ? getBlockStatusByChatId(currentChatId) : "NORMAL";
  const canSendMessage = blockStatus === "NORMAL";
  const isBlockedByOther = blockStatus === "HAS_BEEN_BLOCKED";
  const hasBlockedOther = blockStatus === "BLOCKED";

  const { messages, loading, loadingMore, hasMore, totalMessages, loadMoreMessages, isTyping } = useChat(currentChatId);
  const { setupSubscription, cleanupSubscription } = useTypingNotification(currentChatId);
  const { sendMessage, isConnected } = useSendMessage({
    chatId: currentChatId,
    receiverUsername: targetUser?.username,
  });
  const { initializeCall, makeCall } = useCall();

  // Handlers
  const handleInputFocus = useCallback(() => setupSubscription(), [setupSubscription]);
  const handleInputBlur = useCallback(() => cleanupSubscription(), [cleanupSubscription]);

  // Effects
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) initializeCall(token);
  }, [initializeCall]);

  useEffect(() => {
    if (chatId !== currentChatId) {
      setCurrentChatId(chatId);
      setIsNewChat(!chatId);
      setIsCreatingChat(false);
      setIsSendingMessage(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      createChatPromiseRef.current = null;
    }
  }, [chatId, currentChatId]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (filePreview?.startsWith("blob:")) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!bottomElementRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
            isLoadingMoreRef.current = true;
            loadMoreMessages().finally(() => {
              isLoadingMoreRef.current = false;
            });
          }
        },
        { root: messagesContainerRef.current, rootMargin: '0px', threshold: 0.1 }
    );

    observer.observe(bottomElementRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMoreMessages, messages]);

  // Auto scroll effects
  const autoScrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (messages?.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom || messages.length === 1) {
          container.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    if (isTyping) setTimeout(autoScrollToBottom, 100);
  }, [isTyping, autoScrollToBottom]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".message-container")) {
        setSelectedMessage(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Chat creation logic
  const createNewChat = async (message) => {
    const currentTime = Date.now();
    if (currentTime - lastMessageTimestampRef.current < 1000) return null;
    lastMessageTimestampRef.current = currentTime;

    if (createChatPromiseRef.current) return await createChatPromiseRef.current;

    if (abortControllerRef.current) abortControllerRef.current.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const createChatPromise = (async () => {
      try {
        setIsCreatingChat(true);
        const response = await api.post("/v1/chat/send", {
          username: targetUser?.username,
          text: message,
        }, {
          signal: abortController.signal,
          timeout: 15000,
        });

        if (abortController.signal.aborted) return null;

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
        if (error.name === 'AbortError' || abortController.signal.aborted) return null;
        console.error("Error creating chat:", error);
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

  // Message handlers
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !canSendMessage || isSendingMessage || isCreatingChat) {
      if (!canSendMessage) toast.error("Không thể gửi tin nhắn do bạn đã bị chặn");
      return;
    }

    try {
      setIsSendingMessage(true);

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

  // File handlers
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const errors = {
      blocked: "Không thể gửi file do bạn đã bị chặn",
      newChat: "Vui lòng gửi tin nhắn đầu tiên trước khi gửi file",
      size: "File quá lớn! Vui lòng chọn file < 10MB"
    };

    if (!canSendMessage) return toast.error(errors.blocked);
    if (isNewChat) return toast.error(errors.newChat);
    if (file.size > 10 * 1024 * 1024) return toast.error(errors.size);

    setSelectedFile(file);
    setFilePreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    e.target.value = null;
  };

  const handleSendFile = async () => {
    if (!selectedFile || !currentChatId || !targetUser?.username || !canSendMessage) {
      if (!canSendMessage) toast.error("Không thể gửi file do bạn đã bị chặn");
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

  // Message interaction handlers
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

  // Render helpers
  const renderBlockedStatus = () => {
    if (blockStatus === "NORMAL") return null;

    const statusConfig = {
      HAS_BEEN_BLOCKED: {
        message: `Bạn đã bị ${targetUser?.displayName || targetUser?.username} chặn. Không thể gửi tin nhắn.`,
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200"
      },
      BLOCKED: {
        message: `Bạn đã chặn ${targetUser?.displayName || targetUser?.username}. Bỏ chặn để có thể nhắn tin.`,
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200"
      }
    };

    const config = statusConfig[blockStatus];
    if (!config) return null;

    return (
        <div className={`mx-4 mb-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <svg className={`w-5 h-5 ${config.textColor}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className={`text-sm font-medium ${config.textColor}`}>
              {config.message}
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
            <p className="text-sm text-[var(--muted-foreground)] mt-2">Đang tải tin nhắn...</p>
          </div>
      );
    }

    if (isNewChat) {
      return (
          <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
            Bắt đầu cuộc trò chuyện với {targetUser?.displayName || targetUser?.username}
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
          <TypingIndicator isTyping={isTyping} />

          {loadingMore && (
              <div className="text-center py-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Đang tải thêm tin nhắn...</p>
              </div>
          )}

          {!hasMore && totalMessages > 20 && (
              <div className="text-center py-2">
                <p className="text-xs text-[var(--muted-foreground)]">Đã hiển thị tất cả tin nhắn</p>
              </div>
          )}

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

          <div ref={bottomElementRef} className="h-1" />
        </>
    );
  };

  // Computed values
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
      <div className="flex flex-col h-full w-full bg-[var(--card)] text-[var(--foreground)] rounded-2xl overflow-hidden shadow-sm">
        <ChatHeader
            targetUser={targetUser}
            isConnected={isNewChat ? true : isConnected}
            onBack={onBack}
            onCall={() => makeCall(targetUser?.username, false)}
            onVideoCall={() => makeCall(targetUser?.username, true)}
        />

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

        {renderBlockedStatus()}

        {canSendMessage && (
            <FilePreviewInChat
                selectedFile={selectedFile}
                filePreview={filePreview}
                onCancel={handleCancelFile}
            />
        )}

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
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
            />
        )}
      </div>
  );
}