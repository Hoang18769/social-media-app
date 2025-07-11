"use client"

import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react"
import Avatar from "../ui-components/Avatar"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useRouter } from "next/navigation"
// Enable plugin
dayjs.extend(relativeTime)
export default function ChatHeader({
  targetUser,
  onBack,
  onCall,
  onVideoCall,
  onMoreOptions,
}) {
  const router = useRouter()
   const handleProfileClick = (e, user) => {
    e.stopPropagation() // Ngăn không cho bubble up tới card click
    router.push(`/profile/${user.username}`)
  }
  let statusText = "Offline 🔴"
  if (targetUser?.isOnline) {
    statusText = "Online 🟢"
  } else if (targetUser?.lastOnline) {
    statusText = `${dayjs(targetUser.lastOnline).fromNow()}`
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 py-1 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[var(--muted-foreground)] hover:text-foreground">
          <ArrowLeft className="w-3 h-3" />
        </button>
      <div className="flex items-center" onClick={(e) => {handleProfileClick(e, targetUser)}}>
      <Avatar src={targetUser?.profilePictureUrl} size="sm" />

      <div className="flex-1 px-2">
        <div className="font-semibold text-base">{targetUser?.givenName}</div>
        <div className="text-sm text-[var(--muted-foreground)]">
          {statusText}
        </div>
      </div>
      </div>
        </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            console.log("[DEBUG] Voice call button clicked → username:", targetUser?.username)
            onCall && onCall()
          }}
          className="p-2 text-[var(--muted-foreground)] hover:text-foreground hover:bg-[var(--accent)] rounded-full transition-colors"
          title="Voice call"
        >
          <Phone className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            console.log("[DEBUG] Video call button clicked → username:", targetUser?.username)
            onVideoCall && onVideoCall()
          }}
          className="p-2 text-[var(--muted-foreground)] hover:text-foreground hover:bg-[var(--accent)] rounded-full transition-colors"
          title="Video call"
        >
          <Video className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            console.log("[DEBUG] More options clicked")
            onMoreOptions && onMoreOptions()
          }}
          className="p-2 text-[var(--muted-foreground)] hover:text-foreground hover:bg-[var(--accent)] rounded-full transition-colors"
          title="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
