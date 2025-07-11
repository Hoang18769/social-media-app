"use client";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  MessageCircle,
  Users,
  UserPen,
  Settings,
  LogOut,
  User,
  Menu,
  Bell,
} from "lucide-react";
import Badge from "@/components/ui-components/Badge";
import api, { clearSession } from "@/utils/axios";
import NotificationList from "../social-app-component/NotificationList";
import useAppStore from "@/store/ZustandStore";

export default function SidebarNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showNotifications, setShowNotifications] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [notificationPosition, setNotificationPosition] = useState({ top: 10, left: 0 });
  
  const dropdownRef = useRef(null);
  const moreButtonRef = useRef(null);
  const notificationRef = useRef(null);
  const notificationButtonRef = useRef(null);

  // ✅ Zustand store
  const clearAllData = useAppStore(state => state.clearAllData);
  const unreadNotificationCount = useAppStore(state => state.unreadNotificationCount);
  const unreadNotificationCountFromSocket = useAppStore(state => state.unreadNotificationCountFromSocket);
  const resetSocketNotificationCount = useAppStore(state => state.resetSocketNotificationCount);
  const fetchNotifications = useAppStore(state => state.fetchNotifications);
  
  // ✅ Add unread message count from store
  const unreadMessageCount = useAppStore(state => state.unreadMessageCount);

  const menuItems = [
    { id: "home", icon: Home, href: "/home", label: "Home" },
    { id: "search", icon: Search, href: "/search", label: "Search" },
    { id: "message", icon: MessageCircle, href: "/chats", showBadge: true, label: "Messages" },
    { id: "favorites", icon: Users, href: "/friends", label: "Friends" },
    { id: "profile", icon: UserPen, href: username ? `/profile/${username}` : "#", label: "Profile" },
  ];

  // ✅ Update badge count when store count changes
  useEffect(() => {
    setBadgeCount(unreadNotificationCount + unreadNotificationCountFromSocket);
  }, [unreadNotificationCount, unreadNotificationCountFromSocket]);

  useEffect(() => {
    const storedUsername = localStorage.getItem("userName");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ✅ Enhanced notification button click handler
  const handleNotificationClick = async () => {
    // ✅ If already showing notifications, just hide them
    if (showNotifications) {
      setShowNotifications(false);
      return;
    }

    // ✅ Calculate position for notification dropdown
    if (notificationButtonRef.current) {
      const rect = notificationButtonRef.current.getBoundingClientRect();
      const isDesktop = window.innerWidth >= 768;
      
      if (isDesktop) {
        // Desktop: show to the LEFT of the sidebar (80px from left + some padding)
        setNotificationPosition({
          top: 64, // 64px navbar height + 16px padding
          left: 80 + 16, // 80px sidebar width + 16px padding
        });
      } else {
        // Mobile: full width, positioned from bottom
        setNotificationPosition({
          top: 0, // Will be overridden by CSS
          left: 0, // Will be overridden by CSS
        });
      }
    }

    // ✅ Show loading state
    setIsMarkingAsRead(true);

    try {
      console.log(unreadNotificationCountFromSocket);
      // ✅ If there are socket notifications, mark them as read first
      if (unreadNotificationCountFromSocket > 0) {
        const res = await api.post(`/v1/notifications/mark-as-read?limit=${unreadNotificationCountFromSocket}`);
        console.log(res);
        
        console.log(`✅ Successfully marked ${unreadNotificationCountFromSocket} notifications as read`);
      }

      // ✅ Fetch notifications (always fetch to get latest state)
      await fetchNotifications(true); // force refresh

      // ✅ Show notifications dropdown
      setShowNotifications(true);
      
      // ✅ Hide badge count when clicked (set to 0)
      setBadgeCount(0);

    } catch (error) {
      console.error('❌ Error handling notification click:', error);
      // ✅ Still show notifications even if mark-as-read fails
      setShowNotifications(true);
      setBadgeCount(0);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleLogout = async () => {
    // ✅ Prevent multiple logout calls
    if (isLoggingOut) return;
   
    setIsLoggingOut(true);
   
    try {
      await api.delete("/v1/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err.response?.data || err.message);
    } finally {
      // ✅ Clear session first
      clearSession();
      // ✅ Clear store data after session is cleared
      clearAllData();
     
      // ✅ Navigate immediately after clearing data
      router.replace("/register"); // Use replace instead of push
     
      setIsLoggingOut(false);
    }
  };

  const handleMoreClick = () => {
    if (!showSettingsDropdown && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      const isDesktop = window.innerWidth >= 768;
      
      if (isDesktop) {
        // Desktop: show to the right of the button
        setDropdownPosition({
          top: rect.top,
          left: rect.right + 8,
        });
      } else {
        // Mobile: show above the button
        setDropdownPosition({
          top: rect.top - 160, // Adjust based on dropdown height
          left: rect.left - 75, // Center the dropdown
        });
      }
    }
    setShowSettingsDropdown(!showSettingsDropdown);
  };

  const dropdownItems = [
    // {
    //   id: "profile",
    //   icon: User,
    //   label: "Profile",
    //   href: username ? `/profile/${username}` : "#",
    // },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      href: "/settings",
    },
    {
      id: "logout",
      icon: LogOut,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  // Render dropdown using portal
  const renderDropdown = () => {
    if (!showSettingsDropdown) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[150px] z-[9999]"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
        }}
      >
        {dropdownItems.map((item) => {
          const Icon = item.icon;
          
          if (item.onClick) {
            return (
              <button
                key={item.id}
                onClick={() => {
                  item.onClick();
                  setShowSettingsDropdown(false);
                }}
                disabled={isLoggingOut}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                aria-label={item.label}
              >
                <Icon size={16} className="mr-3" />
                {isLoggingOut && item.id === "logout" ? "Logging out..." : item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setShowSettingsDropdown(false)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={item.label}
            >
              <Icon size={16} className="mr-3" />
              {item.label}
            </Link>
          );
        })}
      </div>,
      document.body
    );
  };

  // Render notifications dropdown using portal
  const renderNotifications = () => {
    if (!showNotifications) return null;

    return createPortal(
      <div
        ref={notificationRef}
        className={`
          fixed z-[9999] overflow-y-auto rounded-xl shadow-lg bg-[var(--card)] border border-[var(--border)]
          md:w-80 md:max-h-[calc(100vh-64px-32px)]
          w-full max-h-[calc(90vh-72px-32px)] left-0 right-0
          md:left-auto md:right-auto md:w-80
        `}
        style={{
          // Desktop positioning
          ...(window.innerWidth >= 768 ? {
            top: `${notificationPosition.top}px`,
            left: `${notificationPosition.left}px`,
          } : {
            // Mobile positioning - from bottom
            bottom: `${72 + 32}px`, // 72px sidebar height + 32px padding
            top: 'auto',
            left: '0',
            right: '0',
          })
        }}
      >
        <NotificationList />
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* Main sidebar */}
      <div
        className={`
          z-50 fixed bottom-0 left-0 w-full flex justify-around
          md:static md:top-[64px] md:items-start md:h-full
          w-auto md:flex md:px-2 md:py-4
        `}
      >
        <nav className="md:h-full bg-[var(--card)] p-4 md:rounded-xl flex flex-row md:flex-col items-center justify-around md:justify-center md:space-y-6 w-full md:w-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href.startsWith("/profile")
                ? pathname.startsWith("/profile")
                : pathname === item.href;

            return (
              <div key={item.id} className="relative">
                <Link
                  href={item.href}
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-full transition-colors
                    ${
                      isActive
                        ? "text-black dark:bg-white"
                        : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                    }
                  `}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon size={24} strokeWidth={isActive ? 3 : 2} />
                </Link>
                
                {/* ✅ Show badge for message icon when there are unread messages */}
                {item.showBadge && unreadMessageCount > 0 && (
                  <Badge asNotification>{unreadMessageCount}</Badge>
                )}
              </div>
            );
          })}
          
          {/* 🔔 Notification button */}
          <div className="relative">
            <button
              ref={notificationButtonRef}
              type="button"
              aria-label="Notifications"
              title="Notifications"
              onClick={handleNotificationClick}
              disabled={isLoggingOut || isMarkingAsRead}
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors relative
                ${
                  showNotifications
                    ? "text-black dark:bg-white"
                    : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                }
                ${isLoggingOut || isMarkingAsRead ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* ✅ Show loading spinner when marking as read */}
              {isMarkingAsRead ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
              ) : (
                <Bell size={24} strokeWidth={showNotifications ? 3 : 2} />
              )}
              
              {/* ✅ Show badge only if badgeCount > 0 and not loading */}
              {badgeCount > 0 && !isMarkingAsRead && (
                <Badge asNotification>{badgeCount}</Badge>
              )}
            </button>
          </div>
          
          {/* More button with dropdown */}
          <div className="relative">
            <button
              aria-label="Menu"
              title="Menu"
              ref={moreButtonRef}
              onClick={handleMoreClick}
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors
                ${
                  showSettingsDropdown
                    ? "text-black dark:bg-white"
                    : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                }
              `}
            >
              <Menu size={24} strokeWidth={showSettingsDropdown ? 3 : 2} />
            </button>
          </div>
        </nav>
      </div>

      {/* Dropdown rendered via portal */}
      {renderDropdown()}
      
      {/* Notifications rendered via portal */}
      {renderNotifications()}
    </>
  );
}