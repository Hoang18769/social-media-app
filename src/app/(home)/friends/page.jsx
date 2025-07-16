"use client";

import { useState, useEffect, useRef } from "react";
import UserHeader from "@/components/social-app-component/UserHeader";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  UserMinus,
  UserCheck,
  UserX,
  UserPlus,
  X,
  Shield,
  Loader2,
  MoreVertical
} from "lucide-react";
import {pageMetadata, updatePageMetadata, usePageMetadata} from "@/utils/clientMetadata"; // Import metadata utility

export default function FriendPage() {
  const [activeTab, setActiveTab] = useState("friends");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const userName = typeof window !== 'undefined' ? localStorage.getItem("userName") : null;

  // Refs cho auto-scroll
  const tabContainerRef = useRef(null);
  const tabRefs = useRef({});

  const tabConfig = {
    friends: {
      title: "Bạn bè",
      endpoint: `/v1/friends/${userName}`,
      emptyMessage: "Bạn chưa có bạn bè nào",
      successMessages: {
        unfriend: "Đã hủy kết bạn thành công"
      }
    },
    requests: {
      title: "Yêu cầu kết bạn",
      endpoint: "/v1/friend-request/received-requests",
      emptyMessage: "Không có yêu cầu kết bạn nào",
      successMessages: {
        accept: "Đã chấp nhận yêu cầu kết bạn",
        reject: "Đã từ chối yêu cầu kết bạn"
      }
    },
    sent: {
      title: "Đã gửi",
      endpoint: "/v1/friend-request/sent-requests",
      emptyMessage: "Bạn chưa gửi yêu cầu kết bạn nào",
      successMessages: {
        cancel: "Đã hủy yêu cầu kết bạn"
      }
    },
    suggestions: {
      title: "Gợi ý",
      endpoint: "/v1/friends/suggested",
      emptyMessage: "Không có gợi ý nào",
      successMessages: {
        add: "Đã gửi yêu cầu kết bạn thành công"
      }
    },
    blocked: {
      title: "Đã chặn",
      endpoint: "/v1/blocks",
      emptyMessage: "Bạn chưa chặn ai",
      successMessages: {
        unblock: "Đã bỏ chặn thành công"
      }
    }
  };
  usePageMetadata(pageMetadata.friends());


  // Function để scroll tab vào view
  const scrollTabIntoView = (tabKey) => {
    const tabElement = tabRefs.current[tabKey];
    const container = tabContainerRef.current;

    if (!tabElement || !container) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();
    const tabs = Object.keys(tabConfig);
    const currentIndex = tabs.indexOf(tabKey);
    const isFirstTab = currentIndex === 0;
    const isLastTab = currentIndex === tabs.length - 1;

    // Kiểm tra nếu tab không nằm hoàn toàn trong container
    const isTabVisible = (
        tabRect.left >= containerRect.left &&
        tabRect.right <= containerRect.right
    );

    if (!isTabVisible || (!isFirstTab && !isLastTab)) {
      let scrollLeft;

      if (isFirstTab) {
        // Tab đầu tiên - scroll về đầu
        scrollLeft = 0;
      } else if (isLastTab) {
        // Tab cuối cùng - scroll về cuối
        scrollLeft = container.scrollWidth - container.offsetWidth;
      } else {
        // Tab ở giữa - scroll để tab nằm chính giữa container
        scrollLeft = tabElement.offsetLeft - (container.offsetWidth / 2) + (tabElement.offsetWidth / 2);
      }

      container.scrollTo({
        left: Math.max(0, Math.min(scrollLeft, container.scrollWidth - container.offsetWidth)),
        behavior: 'smooth'
      });
    }
  };

  // Effect để scroll khi activeTab thay đổi
  useEffect(() => {
    // Delay nhỏ để đảm bảo DOM đã render
    const timer = setTimeout(() => {
      scrollTabIntoView(activeTab);
    }, 100);

    return () => clearTimeout(timer);
  }, [activeTab]);

  // Effect để set activeTab từ URL query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && tabConfig[tabParam]) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get(tabConfig[activeTab].endpoint);
        setUsers(response.data.body || []);
        console.log(response.data.body)
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        toast.error("Lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const handleAction = async (userId, actionType) => {
    console.log("username", userId);
    const previousUsers = [...users];
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    setOpenDropdown(null); // Đóng dropdown khi thực hiện action

    try {
      let endpoint, method = "post", data = {};

      switch (actionType) {
        case "unfriend":
          endpoint = `/v1/friends/${userId}`;
          method = "delete";
          break;
        case "accept":
          endpoint = `/v1/friend-request/accept/${userId}`;
          break;
        case "reject":
          endpoint = `/v1/friend-request/reject/${userId}`;
          method = "delete";
          break;
        case "cancel":
          endpoint = `/v1/friend-request/delete/${userId}`;
          method = "delete";
          break;
        case "add":
          endpoint = `/v1/friend-request/send/${userId}`;
          break;
        case "unblock":
          endpoint = `/v1/blocks/${userId}`;
          method = "delete";
          break;
        default:
          return;
      }

      const response = await api[method](endpoint, data);

      // Chỉ ẩn user khi response trả về code 200
      if (response.data.code === 200) {
        setUsers(prev => prev.filter(user => user.username !== userId));
        toast.success(tabConfig[activeTab].successMessages[actionType]);
      } else {
        // Nếu không phải code 200, hiển thị thông báo lỗi từ server
        toast.error(response.data.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      // Không cần rollback users vì chúng ta chưa thay đổi optimistically
      toast.error(`Lỗi: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const renderActionButton = (user) => {
    const isLoading = actionLoading[user.username];
    const baseClass = "px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-center min-w-[40px] min-h-[36px]";

    const buttonConfig = {
      friends: {
        icon: UserMinus,
        style: "bg-red-50 text-red-600 hover:bg-red-100",
        tooltip: "Hủy kết bạn"
      },
      requests: [
        {
          icon: UserCheck,
          style: "bg-blue-50 text-blue-600 hover:bg-blue-100",
          action: "accept",
          tooltip: "Chấp nhận"
        },
        {
          icon: UserX,
          style: "bg-gray-50 text-gray-600 hover:bg-gray-100",
          action: "reject",
          tooltip: "Từ chối"
        }
      ],
      sent: {
        icon: X,
        style: "bg-gray-50 text-gray-600 hover:bg-gray-100",
        tooltip: "Hủy yêu cầu"
      },
      suggestions: {
        icon: UserPlus,
        style: "bg-green-50 text-green-600 hover:bg-green-100",
        tooltip: "Thêm bạn"
      },
      blocked: {
        icon: Shield,
        style: "bg-gray-50 text-gray-600 hover:bg-gray-100",
        tooltip: "Bỏ chặn"
      }
    };

    const currentConfig = buttonConfig[activeTab];

    if (Array.isArray(currentConfig)) {
      return (
          <div className="flex gap-2">
            {currentConfig.map((btn) => {
              const IconComponent = btn.icon;
              return (
                  <button
                      key={btn.action}
                      onClick={() => handleAction(user.username, btn.action)}
                      disabled={isLoading}
                      className={`${baseClass} ${btn.style}`}
                      title={btn.tooltip}
                  >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <IconComponent className="h-4 w-4" />
                    )}
                  </button>
              );
            })}
          </div>
      );
    }

    const IconComponent = currentConfig.icon;
    return (
        <button
            onClick={() => handleAction(user.username, activeTab === "friends" ? "unfriend" :
                activeTab === "sent" ? "cancel" :
                    activeTab === "suggestions" ? "add" : "unblock")}
            disabled={isLoading}
            className={`${baseClass} ${currentConfig.style}`}
            title={currentConfig.tooltip}
        >
          {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
              <IconComponent className="h-4 w-4" />
          )}
        </button>
    );
  };

  return (
      <div className=" container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">{tabConfig[activeTab].title}</h1>

        <div
            ref={tabContainerRef}
            className="flex justify-between border-b border-[var(--border)] mb-6 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {Object.keys(tabConfig).map((tab) => (
              <button
                  key={tab}
                  ref={el => tabRefs.current[tab] = el}
                  className={`px-4 py-2 whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                      activeTab === tab
                          ? "text-[var(--foreground)] font-bold border-b border-[var(--foreground)]"
                          : "text-[var(--muted-foreground)] font-medium hover:text-[var(--foreground)]"
                  }`}
                  onClick={() => setActiveTab(tab)}
              >
                {tabConfig[tab].title}
              </button>
          ))}
        </div>

        <div className="bg-[var(--card)] rounded-lg shadow">
          {loading ? (
              <div className="p-8 text-center text-[var(--muted-foreground)]">
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <div className="h-4 w-32 bg-[var(--muted)] rounded"></div>
                  <div className="h-4 w-64 bg-[var(--muted)] rounded"></div>
                </div>
              </div>
          ) : users.length === 0 ? (
              <div className="p-8 text-center text-[var(--muted-foreground)]">
                {tabConfig[activeTab].emptyMessage}
              </div>
          ) : (
              <ul className="divide-y divide-[var(--border)]">
                {users.map((user) => (
                    <li key={user.username} className="p-4 hover:bg-[var(--accent)] transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <Link href={`/profile/${user.username}`} className="flex-grow min-w-0">
                          <UserHeader
                              key={user.username}
                              user={user}
                              showLastOnline={activeTab === "friends"}
                              className="flex-grow min-w-0"
                          />
                        </Link>
                        <div className="flex-shrink-0">
                          {renderActionButton(user)}
                        </div>
                      </div>
                    </li>
                ))}
              </ul>
          )}
        </div>
      </div>
  );
}