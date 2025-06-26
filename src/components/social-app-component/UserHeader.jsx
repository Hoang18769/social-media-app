"use client";

import Avatar from "../ui-components/Avatar";

export default function UserHeader({
  user = {},
  showLastOnline = true,
  showOptions = true,
  className = "",
}) {
  const {
    familyName = "",
    givenName = "",
    profilePictureUrl,
    lastOnline,
    mutualFriendsCount = 0,
  } = user;

  return (
    <div className={`flex items-center p-3 w-full ${className}`}>
      {/* Avatar */}
      <Avatar
        src={profilePictureUrl}
        alt={`${familyName} ${givenName}`}
        size="md"
        className="flex-shrink-0"
      />

      {/* User Info */}
      <div className="ml-3 flex-grow min-w-0">
        <h4 className="text-sm font-medium text-[var(--foreground)] truncate">
          {familyName} {givenName}
        </h4>

        {showLastOnline && (
          <p className="text-xs text-[var(--muted-foreground)] truncate">
            {lastOnline}
          </p>
        )}

        {/* Mutual friends */}
        {mutualFriendsCount > 0 ? (
          <p className="text-xs text-[var(--muted-foreground)] truncate">
            {mutualFriendsCount} bạn chung
          </p>
        ):<p className="text-xs text-[var(--muted-foreground)] truncate">chưa có bạn chung</p>}
      </div>

      {/* Options Button */}
      {showOptions && (
        <button
          className="p-1 rounded-full hover:bg-[var(--accent)] text-[var(--muted-foreground)]"
          aria-label="More options"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      )}
    </div>
  );
}
