"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ProfileHeader from "@/components/social-app-component/ProfileHeader";
import api, { setUserName } from "@/utils/axios";
import PostCard from "@/components/social-app-component/PostCard";
import usePostActions from "@/hooks/usePostAction";
import PostSkeleton from "@/components/social-app-component/PostCardSkeleton";
import { pageMetadata, usePageMetadata } from "@/utils/clientMetadata";

const LIMIT = 20;

export default function ProfilePage() {
  const { username: routeUsername } = useParams();
  const router = useRouter();

  // State management
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [files, setFiles] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Refs
  const abortControllerRef = useRef(null);
  const observerRef = useRef(null);
  const loadMoreTriggerRef = useRef(null);

  const { toggleLike } = usePostActions({ posts, setPosts });
  usePageMetadata(pageMetadata.profile());

  // Helper function for abort controller cleanup
  const cleanupAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Check if own profile
  useEffect(() => {
    const storedUsername = localStorage.getItem("userName");
    if (storedUsername) {
      setIsOwnProfile(storedUsername === routeUsername);
    }
  }, [routeUsername]);

  // Fetch profile data
  useEffect(() => {
    if (!routeUsername) return;

    const controller = new AbortController();
    api.get(`/v1/users/${routeUsername}`, { signal: controller.signal })
        .then(res => {
          if (res.data.code === 200) {
            setProfileData(res.data.body);
          }
        })
        .catch(error => {
          if (!controller.signal.aborted) {
            console.error("Failed to fetch profile:", error);
          }
        });

    return () => controller.abort();
  }, [routeUsername]);

  // Fetch posts function
  const fetchPosts = useCallback(async (skipValue = 0, isLoadMore = false) => {
    if (!routeUsername) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("Không có token đăng nhập");
      return;
    }

    cleanupAbortController();
    abortControllerRef.current = new AbortController();

    try {
      isLoadMore ? setLoadingMore(true) : setLoading(true);

      const res = await api.get(
          `/v1/posts/of-user/${routeUsername}?skip=${skipValue}&limit=${LIMIT}`,
          { signal: abortControllerRef.current.signal }
      );

      if (res.data.code === 200) {
        const newPosts = res.data.body || [];

        setPosts(prevPosts => {
          if (isLoadMore) {
            const existingIds = new Set(prevPosts.map(p => p.id));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
            return [...prevPosts, ...uniqueNewPosts];
          }
          return newPosts;
        });

        setHasMore(newPosts.length === LIMIT);
      }
    } catch (error) {
      if (!abortControllerRef.current.signal.aborted) {
        console.error("Lỗi khi tải bài viết:", error);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [routeUsername, cleanupAbortController]);

  // Initial posts load
  useEffect(() => {
    if (routeUsername) {
      fetchPosts(0, false);
    }
    return cleanupAbortController;
  }, [routeUsername, fetchPosts, cleanupAbortController]);

  // Fetch files when on file tab
  useEffect(() => {
    if (!routeUsername || activeTab !== "file") return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const controller = new AbortController();
    api.get(`/v1/posts/files/${routeUsername}`, { signal: controller.signal })
        .then(res => {
          if (res.data.code === 200) {
            setFiles(res.data.body);
          }
        })
        .catch(error => {
          if (!controller.signal.aborted) {
            console.error("Lỗi khi tải files:", error);
          }
        });

    return () => controller.abort();
  }, [routeUsername, activeTab]);

  // Intersection Observer for infinite scroll
  const handleIntersection = useCallback((entries) => {
    const [entry] = entries;
    if (entry.isIntersecting && activeTab === "posts" && !loadingMore && hasMore && !loading) {
      fetchPosts(posts.length, true);
    }
  }, [activeTab, loadingMore, hasMore, loading, posts.length, fetchPosts]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    });

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection]);

  // Event handlers
  const handleUsernameChange = useCallback((oldUsername, newUsername) => {
    console.log("Username changed from", oldUsername, "to", newUsername);
    window.location.href = `/profile/${newUsername}`;
  }, []);

  const handlePostDeleted = useCallback((deletedPostId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Memoized values
  const filteredPosts = useMemo(() => {
    if (!posts.length || !profileData) return [];

    if (isOwnProfile) return posts;

    const allowedPrivacy = profileData.isFriend ? ["PUBLIC", "FRIEND"] : ["PUBLIC"];
    return posts.filter(post => allowedPrivacy.includes(post.privacy));
  }, [posts, profileData, isOwnProfile]);

  const ProfileHeaderSkeleton = useMemo(() => (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-pulse">
        <div className="px-6 pt-6 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-20">
            <div className="w-32 h-32 bg-gray-300 dark:bg-gray-600 rounded-full border-4 border-white dark:border-gray-800 mb-4 sm:mb-0"></div>
            <div className="flex-1 sm:pb-4">
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2"></div>
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mt-4"></div>
              <div className="flex space-x-8 mt-4">
                {[1, 2].map(i => (
                    <div key={i} className="text-center">
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-12 mb-1"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                    </div>
                ))}
              </div>
              <div className="flex space-x-3 mt-4">
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          </div>
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700"></div>
        </div>
      </div>
  ), []);

  const loadingSkeletons = useMemo(() =>
      Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />), []
  );

  const loadingMoreSkeletons = useMemo(() =>
      Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={`loading-${i}`} />), []
  );

  // Render helpers
  const renderEmptyState = (title, description) => (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
          <p className="text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
  );

  const renderFiles = () => (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {files.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Media Files</h3>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {files.length} files
            </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {files.map((url, index) => {
                  const isVideo = url.toLowerCase().match(/\.(mp4|mov)$/);
                  return (
                      <div key={index} className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-square">
                        {isVideo ? (
                            <video src={url} controls className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                        ) : (
                            <img src={url} alt={`media-${index}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                        )}
                      </div>
                  );
                })}
              </div>
            </div>
        ) : (
            renderEmptyState("No media files", "No photos or videos have been shared yet.")
        )}
      </div>
  );

  return (
      <main className="max-w-4xl mx-auto mt-4 flex-col justify-center items-center">
        {/* Profile Header */}
        {profileData ? (
            <ProfileHeader
                profileData={profileData}
                isOwnProfile={isOwnProfile}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onProfileUpdate={(updatedData) => setProfileData(prev => ({ ...prev, ...updatedData }))}
                onUsernameChange={handleUsernameChange}
            />
        ) : (
            ProfileHeaderSkeleton
        )}

        {/* Content Section */}
        <div className="w-full flex flex-col items-center justify-center">
          <section className="flex flex-col w-full items-center justify-center mt-6 space-y-4">
            {activeTab === "posts" ? (
                <>
                  {loading && posts.length === 0 ? (
                      <div className="space-y-6 w-full flex flex-col items-center px-8">
                        {loadingSkeletons}
                      </div>
                  ) : filteredPosts.length > 0 ? (
                      <>
                        {filteredPosts.map(post => (
                            <PostCard
                                key={post.id || Math.random().toString(36)}
                                post={post}
                                liked={post.liked}
                                likeCount={post.likeCount}
                                onLikeToggle={() => toggleLike(post.id)}
                                onPostDeleted={handlePostDeleted}
                                isOwnProfile={isOwnProfile}
                                isFriend={profileData?.isFriend}
                            />
                        ))}

                        {loadingMore && (
                            <div className="w-full space-y-6">{loadingMoreSkeletons}</div>
                        )}

                        {hasMore && !loading && (
                            <div ref={loadMoreTriggerRef} className="w-full h-10 flex items-center justify-center">
                              <div className="text-gray-400 text-sm">Xem thêm ...</div>
                            </div>
                        )}

                        {!hasMore && posts.length > 0 && (
                            <div className="flex justify-center py-8">
                              <div className="bg-white dark:bg-gray-800 rounded-full px-6 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">🎉 Bạn đã xem tất cả!</p>
                              </div>
                            </div>
                        )}
                      </>
                  ) : (
                      renderEmptyState(
                          isOwnProfile ? "Chưa tải lên bài viết nào" : "Không có bài viết nào",
                          isOwnProfile ? "Hãy tải lên bài viết đầu tiên của bạn!" : "Người dùng này chưa tải lên bài viết nào"
                      )
                  )}
                </>
            ) : (
                renderFiles()
            )}
          </section>
        </div>
      </main>
  );
}