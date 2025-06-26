"use client";

import { ArrowLeft } from "lucide-react";
import Avatar from "../ui-components/Avatar";
import clsx from "clsx";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Enable plugin
dayjs.extend(relativeTime);

export default function ChatHeader({
  targetUser,
  isConnected,
  onBack,
  showBackButton,
}) {

  let statusText = "Offline 🔴";
  if (targetUser?.isOnline) {
    statusText = "Online 🟢";
  } else if (targetUser?.lastOnline) {
    statusText = `Hoạt động ${dayjs(targetUser.lastOnline).fromNow()}`;
  }

  return (
    <div className="flex items-center gap-3 p-3 py-1 border-b border-[var(--border)]">
      {showBackButton && (
        <button
          onClick={onBack}
          className="text-[var(--muted-foreground)] hover:text-foreground"
        >
          <ArrowLeft className="w-3 h-3" />
        </button>
      )}

      <Avatar src={targetUser?.profilePictureUrl} size="sm" />

      <div className="flex-1">
        <div className="font-semibold text-base">{targetUser?.givenName}</div>
        <div className="text-sm text-[var(--muted-foreground)]">
          {statusText}
          {/* <span className="ml-2">{isConnected ? "🟢" : "🔴"}</span> */}
        </div>
      </div>
    </div>
  );
}
