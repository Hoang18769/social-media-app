"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Loader2, Mail, Calendar, Users, MessageCircle, FileText, Phone, Shield, ShieldCheck, Clock, UserCheck, UserX, Send, Inbox, ArrowLeft, Upload, ThumbsUp, MessageSquareText } from 'lucide-react';
import api from "@/utils/axios";
import UserHeader from '@/components/social-app-component/UserHeader';
import { useRouter } from 'next/navigation';
import adminApi from "@/utils/adminInterception";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentSkip, setCurrentSkip] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();
  
  // Refs for optimization
  const abortControllerRef = useRef(null);
  
  const LIMIT = 20;
  
  const goToProfile = (username) => {
    if (username) router.push(`/profile/${username}`);
  };

  const goBackToAdmin = () => {
    router.push('/admin/dashboard/users');
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "N/A";
    }
  };

  // Calculate age from birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return "N/A";
    try {
      const today = new Date();
      const birth = new Date(birthdate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    } catch {
      return "N/A";
    }
  };

  // Format last online time - fixed for ZonedDateTime
  const formatLastOnline = (lastOnline, isOnline) => {
    if (isOnline) return "Trực tuyến";
    if (!lastOnline) return "Rất lâu trước đây";
    try {
      // Handle ZonedDateTime format from backend
      let date;
      if (typeof lastOnline === 'string') {
        // Remove timezone info if it's in ZonedDateTime format
        const cleanDateString = lastOnline.replace(/\[[^\]]+\]$/, '');
        date = new Date(cleanDateString);
      } else {
        date = new Date(lastOnline);
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('vi-VN');
    } catch {
      return "N/A";
    }
  };

  // Fetch users function with axios
  const fetchUsers = useCallback(async (skipValue = 0, isLoadMore = false) => {
    const token = localStorage.getItem("admin_accessToken");
    if (!token) {
      console.warn("Không có token đăng nhập");
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      const res = await adminApi.get(
        `/v1/users?skip=${skipValue}&limit=${LIMIT}`,
        { signal: abortControllerRef.current.signal }
      );
      
      console.log(res.data);
      
      if (res.data.code === 200) {
        const newUsers = res.data.body || [];
        
        // Use functional update to avoid stale closure
        setUsers(prevUsers => {
          if (isLoadMore) {
            // Prevent duplicate users
            const existingIds = new Set(prevUsers.map(u => u.id));
            const uniqueNewUsers = newUsers.filter(u => !existingIds.has(u.id));
            return [...prevUsers, ...uniqueNewUsers];
          } else {
            return newUsers;
          }
        });
        
        // Update hasMore and currentSkip based on returned data
        setHasMore(newUsers.length === LIMIT);
        setCurrentSkip(skipValue + newUsers.length);
        
        console.log(`Loaded ${newUsers.length} users, skip: ${skipValue}`);
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(`Không thể tải danh sách users: ${err.message}`);
        console.error("Lỗi khi tải users:", err);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Handle load more button click
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchUsers(currentSkip, true);
    }
  }, [currentSkip, hasMore, loadingMore, fetchUsers]);

  // Initial data load with cleanup
  useEffect(() => {
    console.log('Initial users load...');
    fetchUsers(0, false);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchUsers]);

  // User Card Component
  const UserCard = ({ user }) => (
    <div 
      className="bg-[var(--card)] rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => goToProfile(user.username)}
    >
      {/* Header Section */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          {user.profilePictureUrl ? (
            <img 
              src={user.profilePictureUrl} 
              alt={`${user.givenName} ${user.familyName}`}
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {user.givenName?.charAt(0)}{user.familyName?.charAt(0)}
              </span>
            </div>
          )}
          {/* Online Status */}
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card ${
            user.isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-card-foreground truncate">
              {user.givenName} {user.familyName}
            </h3>
            {user.verified && (
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            @{user.username}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {formatLastOnline(user.lastOnline, user.isOnline)}
            </span>
          </div>
        </div>
      </div>

      {/* Bio Section */}
        <div className="mb-4">
  <p className="text-foreground text-sm leading-relaxed line-clamp-2 h-12">
    {user.bio ? user.bio : "Không có tiểu sử"}
  </p>
</div>


      {/* User Info Grid */}
      <div className=" gap-8 my-2">
      <div className="flex gap-2 justify-between" >
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate">
            {user.email}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {calculateAge(user.birthdate)} tuổi
          </span>
        </div>
      </div>
        <div className="flex items-center gap-2 py-2">
          <UserCheck className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Tham gia: {formatDate(user.registrationDate)}
          </span>
        </div>
                <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Sinh: {formatDate(user.birthdate)}
          </span>
        </div>
      </div>


      {/* Statistics Section */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-card-foreground">
              {user.friendCount || 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Bạn bè</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <FileText className="w-4 h-4 text-green-500" />
            <span className="font-bold text-card-foreground">
              {user.postCount || 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Bài viết</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MessageCircle className="w-4 h-4 text-purple-500" />
            <span className="font-bold text-card-foreground">
              {user.messageCount || 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Tin nhắn</p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <MessageSquareText className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">
              {user.commentCount || 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Bình luận</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Phone className="w-3 h-3 text-green-400" />
            <span className="text-xs font-medium text-muted-foreground">
              {user.callCount || 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Cuộc gọi</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Send className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">
              {user.requestSentCount || 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Đã gửi</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Inbox className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-medium text-muted-foreground">
              {user.requestReceivedCount || 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Đã nhận</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Upload className="w-3 h-3 text-indigo-400" />
            <span className="text-xs font-medium text-muted-foreground">
              {user.uploadedFileCount || 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Tệp tải lên</p>
        </div>
      </div>

      {/* Block count if exists */}
      {user.blockCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-center gap-1">
            <UserX className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {user.blockCount} người bị chặn
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <main className="max-w-6xl mx-auto mt-4 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={goBackToAdmin}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Admin
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-card-foreground">
              Tất cả người dùng ({users.length})
            </h2>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Users List */}
        <section>
          {loading && users.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="animate-pulse">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
              
              {loadingMore && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-6">
                      <div className="animate-pulse">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 bg-muted rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Load More Button or End Message */}
              <div className="flex justify-center py-8">
                {hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        Tải thêm người dùng
                        <span className="text-sm opacity-80">({users.length})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-card rounded-full px-6 py-3 shadow-sm border border-border">
                    <p className="text-muted-foreground text-sm font-medium">
                      🎉 Đã hiển thị hết người dùng!
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center max-w-md">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  Không có người dùng nào
                </h3>
                <p className="text-muted-foreground">
                  Hiện tại chưa có người dùng nào để hiển thị.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default UsersPage;