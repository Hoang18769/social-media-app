"use client";

import { useState, useRef, useEffect } from "react";
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
  const scrollRef = useRef(null);

  // Zustand store
  const fetchChatList = useAppStore((state) => state.fetchChatList);
  const selectChat = useAppStore((state) => state.selectChat);
  const clearChatSelection = useAppStore((state) => state.clearChatSelection);

  const { messages, loading } = useChat(currentChatId);
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
    initializeCall, // ✅ Thêm dòng này
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

  useEffect(() => {
    if (messages?.length > 0) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

        {/* Messages */}
        <div className="flex-1 px-4 py-3 overflow-y-auto space-y-2 bg-transparent">
          {loading && currentChatId ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Đang tải tin nhắn...
            </p>
          ) : isNewChat ? (
            <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
              Bắt đầu cuộc trò chuyện với{" "}
              {targetUser?.displayName || targetUser?.username}
            </div>
          ) : messages?.length === 0 ? (
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              Chưa có tin nhắn nào
            </p>
          ) : (
            messages
              ?.slice()
              .reverse()
              .map((msg) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  targetUser={targetUser}
                  selectedMessage={selectedMessage}
                  onMessageClick={handleMessageClick}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                />
              ))
          )}
          <div ref={scrollRef} />
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
