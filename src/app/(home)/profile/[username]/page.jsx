"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ProfileHeader from "@/components/social-app-component/ProfileHeader";
import api from "@/utils/axios";
import PostCard from "@/components/social-app-component/PostCard";
import usePostActions from "@/hooks/usePostAction";

export default function ProfilePage() {
  const { username: routeUsername } = useParams();
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [files, setFiles] = useState([]);
  const [localUsername, setLocalUsername] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  
  // Infinity scroll states
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const LIMIT = 20;
  const { toggleLike } = usePostActions({ posts, setPosts });

  // Memoize filtered posts to avoid unnecessary recalculations
  const filteredPosts = useMemo(() => {
    if (!posts.length || !profileData) return [];

    // If it's own profile, show all posts
    if (isOwnProfile) return posts;

    // If user is friend, show public and friend posts
    if (profileData.isFriend) {
      return posts.filter(post => 
        post.privacy === 'PUBLIC' || post.privacy === 'FRIEND'
      );
    }

    // If not friend, only show PUBLIC posts
    return posts.filter(post => post.privacy === 'PUBLIC');
  }, [posts, profileData, isOwnProfile]);

  // Optimize username effect with early return
  useEffect(() => {
    const storedUsername = localStorage.getItem("userName");
    if (!storedUsername) return;
    
    setLocalUsername(storedUsername);
    setIsOwnProfile(storedUsername === routeUsername);
  }, [routeUsername]);

  // Optimize profile fetch with abort controller
  useEffect(() => {
    if (!routeUsername) return;
    
    const controller = new AbortController();
    
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/v1/users/${routeUsername}`, {
          signal: controller.signal
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
  const handleUsernameChange = useCallback((oldUsername, newUsername) => {
    console.log("Username changed from", oldUsername, "to", newUsername);
    
    if (isOwnProfile) {
      localStorage.setItem("userName", newUsername);
      setLocalUsername(newUsername);
    }
    
    router.replace(`/profile/${newUsername}`);
  }, [isOwnProfile, router]);

  // Optimize fetch posts with abort controller and better state management
  const fetchPosts = useCallback(async (skipValue = 0, isLoadMore = false) => {
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
      
      if (res.data.code === 200) {
        const newPosts = res.data.body || [];
        
        // Use functional update to avoid stale closure
        setPosts(prevPosts => {
          if (isLoadMore) {
            // Prevent duplicate posts
            const existingIds = new Set(prevPosts.map(p => p.id));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
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
  }, [routeUsername]);

  // Initial posts load with cleanup
  useEffect(() => {
    if (!routeUsername) return;
    
    console.log('Initial posts load...');
    fetchPosts(0, false);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [routeUsername, fetchPosts]);

  // Throttled scroll handler for better performance
  const handleScroll = useCallback(() => {
    if (activeTab !== "posts" || loadingMore || !hasMore || loading) {
      return;
    }

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Throttle scroll events
    scrollTimeoutRef.current = setTimeout(() => {
      const scrollContainer = document.querySelector('main');
      if (!scrollContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight * 100;

      if (scrollPercentage >= 80) {
        console.log('Loading more profile posts at 80%...');
        fetchPosts(posts.length, true);
      }
    }, 100); // Throttle by 100ms

  }, [loadingMore, hasMore, loading, posts.length, fetchPosts, activeTab]);

  // Optimize scroll listener with passive option
  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    
    if (!scrollContainer) {
      const timer = setTimeout(() => {
        const retryContainer = document.querySelector('main');
        if (retryContainer) {
          console.log('Adding scroll listener to main container for profile...');
          retryContainer.addEventListener('scroll', handleScroll, { passive: true });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }

    console.log('Adding scroll listener to main container for profile...');
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      console.log('Removing scroll listener from main container for profile...');
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

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
          signal: controller.signal
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

  const handleImageClick = useCallback((index) => {
    setActiveImageIndex(index);
    console.log(`Clicked on image at index: ${index}`);
  }, []);

  // Optimize like toggle with immediate UI update
  const handleToggleLike = useCallback(async (postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;

        const liked = post.liked;
        const updatedPost = {
          ...post,
          liked: !liked,
          likeCount: post.likeCount + (liked ? -1 : 1),
        };

        // Fire and forget API call
        (async () => {
          try {
            if (liked) {
              await api.delete(`/v1/posts/unlike/${postId}`);
            } else {
              await api.post(`/v1/posts/like/${postId}`);
            }
          } catch (err) {
            console.error("Toggle like failed:", err);
            // Optionally revert the optimistic update here
          }
        })();

        return updatedPost;
      })
    );
  }, []);

  // Memoized skeleton components
  const ProfileHeaderSkeleton = useMemo(() => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-pulse">
      <div className="h-48 md:h-64 bg-gray-300 dark:bg-gray-600"></div>
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-20">
          <div className="w-32 h-32 bg-gray-300 dark:bg-gray-600 rounded-full border-4 border-white dark:border-gray-800 mb-4 sm:mb-0"></div>
          <div className="flex-1 sm:pb-4">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2"></div>
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-4"></div>
            <div className="flex space-x-8 mb-4">
              <div className="text-center">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-12 mb-1"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
              <div className="text-center">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-12 mb-1"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
              </div>
              <div className="text-center">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-12 mb-1"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 pt-4">
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  ), []);

  const PostSkeleton = useMemo(() => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
        </div>
        <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/5"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/5"></div>
      </div>
      <div className="h-64 sm:h-80 bg-gray-300 dark:bg-gray-600 rounded-lg mb-4"></div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
            </div>
          </div>
          <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    </div>
  ), []);

  const PostsLoadingSkeleton = useMemo(() => ({ count = 3 }) => (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`skeleton-${index}`}>{PostSkeleton}</div>
      ))}
    </div>
  ), [PostSkeleton]);

  return (
    <main className="max-w-4xl mx-auto mt-4">
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
      <section ref={containerRef} className="mt-6 space-y-4">
        {activeTab === "posts" ? (
          <>
            {loading && posts.length === 0 ? (
              <PostsLoadingSkeleton count={5} />
            ) : filteredPosts.length > 0 ? (
              <>
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id || Math.random().toString(36)}
                    post={post}
                    liked={post.liked}
                    likeCount={post.likeCount}
                    onLikeToggle={() => toggleLike(post.id)}
                    isOwnProfile={isOwnProfile}
                    isFriend={profileData?.isFriend}
                  />
                ))}
                
                {loadingMore && <PostsLoadingSkeleton count={3} />}
                
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
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {isOwnProfile ? "No posts yet" : "No posts to show"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {isOwnProfile ? "Share your first post to get started!" : "This user hasn't shared any posts that you can see."}
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
                            onClick={() => handleImageClick(index)}
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
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
    </main>
  );
}