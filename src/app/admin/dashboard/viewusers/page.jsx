"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Loader2 } from 'lucide-react';
import api from "@/utils/axios";
import UserHeader from '@/components/social-app-component/UserHeader';
import { useRouter } from 'next/navigation';
const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentSkip, setCurrentSkip] = useState(0);
  const [error, setError] = useState("");
  const router=useRouter();
  // Refs for optimization
  const abortControllerRef = useRef(null);
  
  const LIMIT = 20;
  const goToProfile = (username) => {
    if (username) router.push(`/profile/${username}`);
  };
  // Fetch users function with axios
  const fetchUsers = useCallback(async (skipValue = 0, isLoadMore = false) => {
    const token = localStorage.getItem("accessToken");
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

      const res = await api.get(
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



  return (
    <main className="max-w-4xl mx-auto mt-4 px-4">
      <div className="space-y-6 flex flex-col items-center">
        {/* Container wrapper for centering */}
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                All Users ({users.length})
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
          <section className="space-y-4">
            {loading && users.length === 0 ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="animate-pulse flex items-center">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mr-4"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length > 0 ? (
              <div className="flex flex-col items-start">
                {users.map((user, index) => (
                   <div
                                    key={user.id}
                                    className="flex items-center justify-between gap-2 cursor-pointer"
                                    onClick={() => goToProfile(user.username)}
                                  >
                                    <UserHeader
                                      user={{
                                        familyName: user.familyName,
                                        givenName: user.givenName,
                                        profilePictureUrl: user.profilePictureUrl,
                                        lastOnline: user.isOnline ? "Online" : user.lastOnline,
                                      }}
                                      showOptions={false}
                                      className="p-0"
                                    />
                                  </div>
                ))}
                
                {loadingMore && (
                  <div className="space-y-4 w-full">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="animate-pulse flex items-center">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mr-4"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More Users
                          <span className="text-sm opacity-80">({users.length})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-full px-6 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        🎉 Đã hiển thị hết người dùng!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No users available
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    There are no users to display at the moment.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default UsersPage;