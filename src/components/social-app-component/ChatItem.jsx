"use client";

import Avatar from "../ui-components/Avatar";
import Badge from "../ui-components/Badge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

export default function ChatItem({ chat, onClick, selected }) {
  const { chatId, latestMessage, target, notReadMessageCount } = chat;
  
  const isOnline = target?.isOnline || false;
  const isUnread = notReadMessageCount > 0;
  const displayName = `${target?.givenName || ""} ${target?.familyName || ""}`.trim() || target?.username || "Unknown User";

  let content = "Chưa có tin nhắn nào";
  let sentTime = "";

  if (latestMessage) {
    const isSenderTarget = latestMessage.sender?.id === target?.id;
    const senderPrefix = isSenderTarget ? "" : "Bạn: ";
    const { type, callId, answered, endAt, callAt, deleted } = latestMessage;

    if (callId) {
      // ✅ Message là cuộc gọi
      if (!answered) {
        content = "📞 Cuộc gọi nhỡ";
      } else {
        let duration = "";
        if (endAt && callAt) {
          const durationSec = dayjs(endAt).diff(dayjs(callAt), "second");
          const min = Math.floor(durationSec / 60);
          const sec = durationSec % 60;
          duration = ` (${min}:${sec.toString().padStart(2, "0")})`;
        }
        content = `📞 Cuộc gọi đã kết thúc${duration}`;
      }
    } else {
      // ✅ Tin nhắn văn bản, ảnh, tệp, v.v.
      if (deleted) {
        content = "Tin nhắn đã bị thu hồi";
      } else if (latestMessage.attachment) {
        content = "[Tệp đính kèm]";
      } else {
        content = latestMessage.content?.slice(0, 60) || "Tin nhắn đã bị xoá";
      }
      content = senderPrefix + content;
    }

    sentTime = dayjs(latestMessage.sentAt).fromNow();
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
          <div className={`w-3.5 h-3.5 rounded-full border-2 border-background ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}>
            {isOnline && (
              <div className="absolute inset-0 w-3.5 h-3.5 bg-green-500 rounded-full animate-pulse opacity-75" />
            )}
          </div>
        </div>

        {notReadMessageCount > 0 && (
          <div className="absolute -top-1 -right-1 block md:hidden">
            <Badge variant="secondary" className="rounded-full px-1.5 text-[10px] border">
              {notReadMessageCount}
            </Badge>
          </div>
        )}
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
            <Badge variant="secondary" className="rounded-full border px-2 text-xs ml-2 shrink-0">
              {notReadMessageCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
