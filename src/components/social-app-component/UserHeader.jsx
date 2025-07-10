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

        {/* {showLastOnline && (
          <p className="text-xs text-[var(--muted-foreground)] truncate">
            {lastOnline}
          </p>
        )} */}

        {/* Mutual friends */}
        {mutualFriendsCount > 0 ? (
          <p className="text-xs text-[var(--muted-foreground)] truncate">
            {mutualFriendsCount} bạn chung
          </p>
        ):<p className="text-xs text-[var(--muted-foreground)] truncate">chưa có bạn chung</p>}
      </div>

      {/* Options Button */}
     
    </div>
  );
}
