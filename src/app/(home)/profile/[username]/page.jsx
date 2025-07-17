"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ProfileHeader from "@/components/social-app-component/ProfileHeader";
import api, {setUserName} from "@/utils/axios";
import PostCard from "@/components/social-app-component/PostCard";
import usePostActions from "@/hooks/usePostAction";
import PostSkeleton from "@/components/social-app-component/PostCardSkeleton";
import {pageMetadata, usePageMetadata} from "@/utils/clientMetadata";

export default function ProfilePage() {
  const { username: routeUsername } = useParams();
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [files, setFiles] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  // Infinity scroll states
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Intersection Observer refs
  const observerRef = useRef(null);
  const loadMoreTriggerRef = useRef(null);

  const LIMIT = 20;
  const { toggleLike } = usePostActions({ posts, setPosts });

  usePageMetadata(pageMetadata.profile());

  // Memoize filtered posts to avoid unnecessary recalculations
  const filteredPosts = useMemo(() => {
    if (!posts.length || !profileData) return [];

    // If it's own profile, show all posts
    if (isOwnProfile) return posts;

    // If user is friend, show public and friend posts
    if (profileData.isFriend) {
      return posts.filter(
          (post) => post.privacy === "PUBLIC" || post.privacy === "FRIEND"
      );
    }

    // If not friend, only show PUBLIC posts
    return posts.filter((post) => post.privacy === "PUBLIC");
  }, [posts, profileData, isOwnProfile]);

  // Optimize username effect with early return
  useEffect(() => {
    const storedUsername = localStorage.getItem("userName");
    if (!storedUsername) return;

    setIsOwnProfile(storedUsername === routeUsername);
  }, [routeUsername]);

  // Optimize profile fetch with abort controller
  useEffect(() => {
    if (!routeUsername) return;

    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        const res = await api.get(`/v1/users/${routeUsername}`, {
          signal: controller.signal,
        });
        if (res.data.code === 200) {
          setProfileData(res.data.body);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch profile:", error);
        }
      }
    };

    fetchProfile();

    return () => controller.abort();
  }, [routeUsername]);

  // Handle username change with useCallback
  const handleUsernameChange = useCallback(
      (oldUsername, newUsername) => {
        console.log("Username changed from", oldUsername, "to", newUsername);

        // if (isOwnProfile) {
        //   setUserName(newUsername);
        // }
        // router.replace(`/profile/${newUsername}`);
        window.location.href = `/profile/${newUsername}`;
      },
      [ router]
  );

  // Optimize fetch posts with abort controller and better state management
  const fetchPosts = useCallback(
      async (skipValue = 0, isLoadMore = false) => {
        if (!routeUsername) return;

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

          const res = await api.get(
              `/v1/posts/of-user/${routeUsername}?skip=${skipValue}&limit=${LIMIT}`,
              { signal: abortControllerRef.current.signal }
          );
          console.log(res)
          if (res.data.code === 200) {
            const newPosts = res.data.body || [];

            // Use functional update to avoid stale closure
            setPosts((prevPosts) => {
              if (isLoadMore) {
                // Prevent duplicate posts
                const existingIds = new Set(prevPosts.map((p) => p.id));
                const uniqueNewPosts = newPosts.filter(
                    (p) => !existingIds.has(p.id)
                );
                return [...prevPosts, ...uniqueNewPosts];
              } else {
                return newPosts;
              }
            });

            // Update hasMore based on returned data
            setHasMore(newPosts.length === LIMIT);

            console.log(`Loaded ${newPosts.length} posts, skip: ${skipValue}`);
          }
        } catch (error) {
          if (!abortControllerRef.current.signal.aborted) {
            console.error("Lỗi khi tải bài viết:", error);
          }
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
      },
      [routeUsername]
  );

  // Initial posts load with cleanup
  useEffect(() => {
    if (!routeUsername) return;

    console.log("Initial posts load...");
    fetchPosts(0, false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [routeUsername, fetchPosts]);

  const handlePostDeleted = useCallback((deletedPostId) => {
    setPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== deletedPostId)
    );
  }, []);

  // Intersection Observer callback
  const handleIntersection = useCallback((entries) => {
    const [entry] = entries;

    // Kiểm tra có đang intersecting và các điều kiện khác
    if (entry.isIntersecting &&
        activeTab === "posts" &&
        !loadingMore &&
        hasMore &&
        !loading) {

      console.log("Loading more profile posts via Intersection Observer...");
      fetchPosts(posts.length, true);
    }
  }, [activeTab, loadingMore, hasMore, loading, posts.length, fetchPosts]);

  // Setup Intersection Observer
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null, // Use viewport as root
      rootMargin: '200px', // Trigger 200px before element enters viewport
      threshold: 0.1 // Trigger when 10% of element is visible
    });

    // Start observing if trigger element exists
    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection]);

  // Optimize files fetch with abort controller
  useEffect(() => {
    if (!routeUsername || activeTab !== "file") return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("Không có token đăng nhập");
      return;
    }

    const controller = new AbortController();

    const fetchFiles = async () => {
      try {
        const res = await api.get(`/v1/posts/files/${routeUsername}`, {
          signal: controller.signal,
        });
        if (res.data.code === 200) {
          setFiles(res.data.body);
          console.log(res.data.body);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Lỗi khi tải files:", error);
        }
      }
    };

    fetchFiles();

    return () => controller.abort();
  }, [routeUsername, activeTab]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Memoized skeleton components - using the same pattern as HomePage
  const ProfileHeaderSkeleton = useMemo(
      () => (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-pulse">
            <div className="px-6 pt-6 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-20">
                <div className="w-32 h-32 bg-gray-300 dark:bg-gray-600 rounded-full border-4 border-white dark:border-gray-800 mb-4 sm:mb-0"></div>
                <div className="flex-1 sm:pb-4">
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2"></div>
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mt-4"></div>
                  <div className="flex space-x-8 mt-4">
                    <div className="text-center">
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-12 mb-1"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                    </div>

                    <div className="text-center">
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-12 mb-1"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                    </div>
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
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700">

              </div>
            </div>
          </div>
      ),
      []
  );

  // Memoized loading skeletons - using the same pattern as HomePage
  const loadingSkeletons = useMemo(() =>
      Array.from({ length: 5 }).map((_, index) => (
          <PostSkeleton key={index} />
      )), []
  );

  const loadingMoreSkeletons = useMemo(() =>
      Array.from({ length: 3 }).map((_, index) => (
          <PostSkeleton key={`loading-${index}`} />
      )), []
  );

  return (
      <main className="max-w-4xl mx-auto mt-4 flex-col justify-center items-center">
        {/* Profile Header Section */}
        {profileData ? (
            <ProfileHeader
                profileData={profileData}
                isOwnProfile={isOwnProfile}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onProfileUpdate={(updatedData) =>
                    setProfileData((prev) => ({ ...prev, ...updatedData }))
                }
                onUsernameChange={handleUsernameChange}
            />
        ) : (
            ProfileHeaderSkeleton
        )}

        {/* Content Section */}
        <div className="w-full flex flex-col items-center justify-center">
          <section
              ref={containerRef}
              className="flex flex-col w-full items-center justify-center mt-6 space-y-4"
          >
            {activeTab === "posts" ? (
                <>
                  {loading && posts.length === 0 ? (
                      <div className="space-y-6 w-full flex flex-col items-center px-8">
                        {loadingSkeletons}
                      </div>
                  ) : filteredPosts.length > 0 ? (
                      <>
                        {filteredPosts.map((post) => (
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
                            <div className="w-full space-y-6">
                              {loadingMoreSkeletons}
                            </div>
                        )}

                        {/* Intersection Observer Trigger Element */}
                        {hasMore && !loading && (
                            <div
                                ref={loadMoreTriggerRef}
                                className="w-full h-10 flex items-center justify-center"
                            >
                              {/* Optional: Add loading indicator */}
                              <div className="text-gray-400 text-sm">
                                Loading more posts...
                              </div>
                            </div>
                        )}

                        {!hasMore && posts.length > 0 && (
                            <div className="flex justify-center py-8">
                              <div className="bg-white dark:bg-gray-800 rounded-full px-6 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                  🎉 You've reached the end!
                                </p>
                              </div>
                            </div>
                        )}
                      </>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {isOwnProfile ? "No posts yet" : "No posts to show"}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            {isOwnProfile
                                ? "Share your first post to get started!"
                                : "This user hasn't shared any posts that you can see."}
                          </p>
                        </div>
                      </div>
                  )}
                </>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  {files.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Media Files
                          </h3>
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {files.length} files
                    </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {files.map((url, index) => {
                            const isVideo =
                                url.toLowerCase().endsWith(".mp4") ||
                                url.toLowerCase().includes(".mov");
                            return (
                                <div
                                    key={index}
                                    className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-square"
                                >
                                  {isVideo ? (
                                      <video
                                          src={url}
                                          controls
                                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                      />
                                  ) : (
                                      <img
                                          src={url}
                                          alt={`media-${index}`}
                                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                      />
                                  )}
                                </div>
                            );
                          })}
                        </div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                          <svg
                              className="w-8 h-8 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                          >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          No media files
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-center">
                          No photos or videos have been shared yet.
                        </p>
                      </div>
                  )}
                </div>
            )}
          </section>
        </div>
      </main>
  );
}