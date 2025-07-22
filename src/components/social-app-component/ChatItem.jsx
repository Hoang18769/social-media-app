"use client";

import { memo } from "react";
import Avatar from "../ui-components/Avatar";
import Badge from "../ui-components/Badge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

function ChatItem({ chat, onClick, selected }) {
  const { chatId, latestMessage, target, notReadMessageCount } = chat;

  const isOnline = target?.isOnline || false;
  const isUnread = notReadMessageCount > 0;
  const displayName =
      `${target?.givenName || ""} ${target?.familyName || ""}`.trim() ||
      target?.username ||
      "Unknown User";

  let content = "Chưa có tin nhắn nào";
  let sentTime = "";

  if (latestMessage) {
    const isSenderTarget = latestMessage.sender?.id === target?.id;
    const senderPrefix = isSenderTarget ? "" : "Bạn: ";
    const {
      type,
      callId,
      answered,
      endAt,
      callAt,
      deleted,
      attachment,
      content: msgContent,
      sentAt,
    } = latestMessage;

    if (type === "CALL") {
      if (callAt && endAt) {
        // ✅ Cuộc gọi kết thúc
        const durationSec = dayjs(endAt).diff(dayjs(callAt), "second");
        const min = Math.floor(durationSec / 60);
        const sec = durationSec % 60;
        const duration = ` (${min}:${sec.toString().padStart(2, "0")})`;
        content = `📞 Cuộc gọi đã kết thúc${duration}`;
      } else {
        // ❌ Cuộc gọi nhỡ
        content = "📞 Cuộc gọi nhỡ";
      }
    } else {
      // ✅ Tin nhắn thường
      if (deleted) {
        content = "Tin nhắn đã bị thu hồi";
      } else if (attachment) {
        content = "[Tệp đính kèm]";
      } else {
        content = msgContent?.slice(0, 60) || "Tin nhắn đã bị xoá";
      }
      content = senderPrefix + content;
    }

    sentTime = dayjs(sentAt).fromNow();
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition hover:bg-accent ${
        selected ? "bg-accent" : ""
      }`}
      data-chat-id={chatId}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar
          src={target?.profilePictureUrl}
          alt={displayName}
          className="w-12 h-12"
        />

        <div className="absolute bottom-0 right-0">
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 border-background ${
              isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          >
            {isOnline && (
              <div className="absolute inset-0 w-3.5 h-3.5 bg-green-500 rounded-full animate-pulse opacity-75" />
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col hide-between-630-768">
        <div className="flex justify-between items-center mb-0.5">
          <p className={`truncate ${isUnread ? "font-bold" : "font-medium"}`}>
            {displayName}
          </p>
          {sentTime && (
            <span
              className={`text-xs text-muted-foreground shrink-0 ${
                isUnread ? "font-bold" : ""
              }`}
            >
              {sentTime}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <p
            className={`text-sm text-muted-foreground truncate ${
              isUnread ? "font-bold" : ""
            }`}
          >
            {content}
          </p>
          {notReadMessageCount > 0 && (
            <Badge
              variant="secondary"
              className="rounded-full border px-2 text-xs ml-2 shrink-0"
            >
              {notReadMessageCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ Custom comparison function để tối ưu re-render
const areEqual = (prevProps, nextProps) => {
  const prev = prevProps.chat;
  const next = nextProps.chat;

  // So sánh các props khác
  if (prevProps.selected !== nextProps.selected) return false;

  // So sánh chatId
  if (prev.chatId !== next.chatId) return false;

  // So sánh notReadMessageCount
  if (prev.notReadMessageCount !== next.notReadMessageCount) return false;

  // So sánh target info
  if (prev.target?.isOnline !== next.target?.isOnline) return false;
  if (prev.target?.profilePictureUrl !== next.target?.profilePictureUrl) return false;
  if (prev.target?.givenName !== next.target?.givenName) return false;
  if (prev.target?.familyName !== next.target?.familyName) return false;
  if (prev.target?.username !== next.target?.username) return false;

  // So sánh latest message
  const prevMsg = prev.latestMessage;
  const nextMsg = next.latestMessage;

  if (!prevMsg && !nextMsg) return true;
  if (!prevMsg || !nextMsg) return false;

  // So sánh các trường quan trọng của message
  if (prevMsg.id !== nextMsg.id) return false;
  if (prevMsg.content !== nextMsg.content) return false;
  if (prevMsg.sentAt !== nextMsg.sentAt) return false;
  if (prevMsg.type !== nextMsg.type) return false;
  if (prevMsg.deleted !== nextMsg.deleted) return false;
  if (prevMsg.attachment !== nextMsg.attachment) return false;
  if (prevMsg.callAt !== nextMsg.callAt) return false;
  if (prevMsg.endAt !== nextMsg.endAt) return false;

  // So sánh sender
  if (prevMsg.sender?.id !== nextMsg.sender?.id) return false;

  return true;
};

// ✅ Export memoized component với custom comparison
export default memo(ChatItem, areEqual);