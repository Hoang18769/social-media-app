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
import api, {clearSession, getUserName} from "@/utils/axios";
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
  const fetchNotifications = useAppStore(state => state.fetchNotifications);
  
  // ✅ Add unread message count from store
  const unreadMessageCount = useAppStore(state => state.unreadMessageCount);

  // ✅ Update badge count when store count changes
  useEffect(() => {
    setBadgeCount(unreadNotificationCount + unreadNotificationCountFromSocket);
  }, [unreadNotificationCount, unreadNotificationCountFromSocket]);

  useEffect(() => {
    const storedUsername = getUserName()
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
        const res = await api.patch(`/v1/notifications/mark-as-read?limit=${unreadNotificationCountFromSocket}`);
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
        <button
          onClick={() => {
            handleLogout();
            setShowSettingsDropdown(false);
          }}
          disabled={isLoggingOut}
          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          aria-label="Đăng xuất"
        >
          <LogOut size={16} className="mr-3" />
          {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
        
        <Link
          href="/settings/personalinfo"
          onClick={() => setShowSettingsDropdown(false)}
          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Cài đặt"
        >
          <Settings size={16} className="mr-3" />
          Cài đặt
        </Link>
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
          md:left-auto md:right-auto
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
          md:flex md:px-2 md:py-4
        `}
      >
        <nav className="md:h-full bg-[var(--card)] p-4 md:rounded-xl flex flex-row md:flex-col items-center justify-around md:justify-center md:space-y-6 w-full md:w-full">
          
          {/* Desktop: Thứ tự cũ | Mobile: Home Button ở giữa */}
          
          {/* Home Button - Desktop: đầu tiên, Mobile: ở giữa */}
          <div className="relative order-4 md:order-1">
            <Link
              href="/home"
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors
                ${
                  pathname === "/home"
                    ? "text-black dark:bg-white"
                    : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                }
              `}
              aria-label="Home"
              title="Home"
            >
              <Home size={24} strokeWidth={pathname === "/home" ? 3 : 2} />
            </Link>
          </div>

          {/* Search Button - Desktop: thứ 2, Mobile: đầu tiên */}
          <div className="relative order-1 md:order-2">
            <Link
              href="/search"
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors
                ${
                  pathname === "/search"
                    ? "text-black dark:bg-white"
                    : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                }
              `}
              aria-label="Search"
              title="Search"
            >
              <Search size={24} strokeWidth={pathname === "/search" ? 3 : 2} />
            </Link>
          </div>

          {/* Messages Button - Desktop: thứ 3, Mobile: thứ 2 */}
          <div className="relative order-2 md:order-3">
            <Link
              href="/chats"
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors
                ${
                  pathname === "/chats"
                    ? "text-black dark:bg-white"
                    : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                }
              `}
              aria-label="Messages"
              title="Messages"
            >
              <MessageCircle size={24} strokeWidth={pathname === "/chats" ? 3 : 2} />
            </Link>
            
            {/* ✅ Show badge for message icon when there are unread messages */}
            {unreadMessageCount > 0 && (
              <Badge asNotification>{unreadMessageCount}</Badge>
            )}
          </div>

          {/* Friends Button - Desktop: thứ 3, Mobile: thứ 4 */}
          <div className="relative order-3 md:order-4">
            <Link
              href="/friends"
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors
                ${
                  pathname === "/friends"
                    ? "text-black dark:bg-white"
                    : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                }
              `}
              aria-label="Friends"
              title="Friends"
            >
              <Users size={24} strokeWidth={pathname === "/friends" ? 3 : 2} />
            </Link>
          </div>

          {/* Profile Button - Desktop: thứ 5, Mobile: thứ 5 */}
          <div className="relative order-5 md:order-5">
            <Link
              href={username ? `/profile/${username}` : "#"}
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors
                ${
                  pathname.startsWith("/profile")
                    ? "text-black dark:bg-white"
                    : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                }
              `}
              aria-label="Profile"
              title="Profile"
            >
              <UserPen size={24} strokeWidth={pathname.startsWith("/profile") ? 3 : 2} />
            </Link>
          </div>
          
          {/* 🔔 Notification button - Desktop: thứ 6, Mobile: thứ 6 */}
          <div className="relative order-6 md:order-6">
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
          
          {/* More button with dropdown - Desktop: thứ 7, Mobile: thứ 7 */}
          <div className="relative order-7 md:order-7">
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