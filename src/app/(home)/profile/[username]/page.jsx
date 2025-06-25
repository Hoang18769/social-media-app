"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import ProfileHeader from "@/components/social-app-component/ProfileHeader";
import api from "@/utils/axios";
import PostCard from "@/components/social-app-component/PostCard";
import usePostActions from "@/hooks/usePostAction";

export default function ProfilePage() {
  const { username: routeUsername } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [files, setFiles] = useState([]);
  const [localUsername, setLocalUsername] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  
  // Infinity scroll states
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const containerRef = useRef(null);
  
  const LIMIT = 20;
  const { toggleLike } = usePostActions({ posts, setPosts });

  useEffect(() => {
    const storedUsername = localStorage.getItem("userName");
    if (storedUsername) {
      setLocalUsername(storedUsername);
      setIsOwnProfile(storedUsername === routeUsername);
    }
  }, [routeUsername]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!routeUsername) return;
      try {
        const res = await api.get(`/v1/users/${routeUsername}`);
        if (res.data.code === 200) {
          setProfileData(res.data.body);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    fetchProfile();
  }, [routeUsername]);

  // Fetch posts function with pagination
  const fetchPosts = useCallback(async (skipValue = 0, isLoadMore = false) => {
    if (!routeUsername) return;
    
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("Không có token đăng nhập");
      return;
    }

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await api.get(`/v1/posts/of-user/${routeUsername}?skip=${skipValue}&limit=${LIMIT}`);
      
      if (res.data.code === 200) {
        const newPosts = res.data.body || [];
        
        // If no new posts or less than LIMIT, no more data
        if (newPosts.length === 0 || newPosts.length < LIMIT) {
          setHasMore(false);
        }

        if (isLoadMore) {
          // Append new posts to existing ones
          setPosts(prevPosts => [...prevPosts, ...newPosts]);
        } else {
          // Replace posts (initial load)
          setPosts(newPosts);
          setHasMore(newPosts.length === LIMIT); // Reset hasMore for initial load
        }
        
        console.log(`Loaded ${newPosts.length} posts, skip: ${skipValue}, total posts: ${isLoadMore ? posts.length + newPosts.length : newPosts.length}`);
      }
    } catch (error) {
      console.error("Lỗi khi tải bài viết:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [routeUsername, posts.length]);

  // Initial posts load
  useEffect(() => {
    if (routeUsername) {
      console.log('Initial posts load...');
      fetchPosts(0, false);
    }
  }, [routeUsername]);

  // Filter posts based on privacy and friendship status
  useEffect(() => {
    if (!posts.length || !profileData) {
      setFilteredPosts([]);
      return;
    }

    const filterPosts = () => {
      // If it's own profile, show all posts
      if (isOwnProfile) {
        return posts;
      }

      // If user is friend, show public and friend posts
      if (profileData.isFriend) {
        return posts.filter(post => 
          post.privacy === 'PUBLIC' || post.privacy === 'FRIEND'
        );
      }

      // If not friend, only show PUBLIC posts
      return posts.filter(post => post.privacy === 'PUBLIC');
    };

    setFilteredPosts(filterPosts());
  }, [posts, profileData, isOwnProfile]);

  // Infinity scroll handler for main container
  const handleScroll = useCallback(() => {
    // Only handle scroll for posts tab
    if (activeTab !== "posts") return;
    
    // Get the main scroll container (parent of this component)
    const scrollContainer = document.querySelector('main');
    
    if (!scrollContainer) {
      console.log('Scroll container not found');
      return;
    }

    // Prevent multiple calls
    if (loadingMore || !hasMore || loading) {
      console.log('Skip scroll:', { loadingMore, hasMore, loading });
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

    // Calculate scroll percentage
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight * 100;

    console.log('Profile scroll percentage:', scrollPercentage.toFixed(2) + '%', {
      scrollTop,
      scrollHeight,
      clientHeight,
      postsLength: posts.length
    });

    // Load more when scroll reaches 80%
    if (scrollPercentage >= 80) {
      console.log('Loading more profile posts at 80%...');
      const newSkip = posts.length;
      fetchPosts(newSkip, true);
    }
  }, [loadingMore, hasMore, loading, posts.length, fetchPosts, activeTab]);

  // Add scroll event listener to main container
  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    
    if (!scrollContainer) {
      console.log('Main container not found, retrying...');
      // Retry after a short delay
      const timer = setTimeout(() => {
        const retryContainer = document.querySelector('main');
        if (retryContainer) {
          console.log('Adding scroll listener to main container for profile...');
          retryContainer.addEventListener('scroll', handleScroll);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }

    console.log('Adding scroll listener to main container for profile...');
    scrollContainer.addEventListener('scroll', handleScroll);
    
    return () => {
      console.log('Removing scroll listener from main container for profile...');
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!routeUsername || activeTab !== "file") return;
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.warn("Không có token đăng nhập");
        return;
      }

      try {
        const res = await api.get(`/v1/posts/files/${routeUsername}`);
        if (res.data.code === 200) {
          setFiles(res.data.body);
          console.log(res.data.body)
        }
      } catch (error) {
        console.error("Lỗi khi tải files:", error);
      }
    };

    fetchFiles();
  }, [routeUsername, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleImageClick = (index) => {
    setActiveImageIndex(index);
    console.log(`Clicked on image at index: ${index}`);
  };

  const handleToggleLike = async (postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;

        const liked = post.liked;
        const updatedPost = {
          ...post,
          liked: !liked,
          likeCount: post.likeCount + (liked ? -1 : 1),
        };

        (async () => {
          try {
            if (liked) {
              await api.delete(`/v1/posts/unlike/${postId}`);
            } else {
              await api.post(`/v1/posts/like/${postId}`);
            }
          } catch (err) {
            console.error("Toggle like failed:", err);
          }
        })();

        return updatedPost;
      })
    );
  };

  // Profile header skeleton component
  const ProfileHeaderSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-pulse">
      {/* Cover photo skeleton */}
      <div className="h-48 md:h-64 bg-gray-300 dark:bg-gray-600"></div>
      
      <div className="px-6 pb-6">
        {/* Avatar and basic info */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-20">
          {/* Avatar skeleton */}
          <div className="w-32 h-32 bg-gray-300 dark:bg-gray-600 rounded-full border-4 border-white dark:border-gray-800 mb-4 sm:mb-0"></div>
          
          <div className="flex-1 sm:pb-4">
            {/* Name skeleton */}
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2"></div>
            {/* Username skeleton */}
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-4"></div>
            
            {/* Stats skeleton */}
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
            
            {/* Action buttons skeleton */}
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            </div>
          </div>
        </div>
        
        {/* Bio skeleton */}
        <div className="mt-6 space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
        
        {/* Tabs skeleton */}
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 pt-4">
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Post skeleton component
  const PostSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      {/* Post header skeleton */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
        </div>
        <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
      
      {/* Post content skeleton */}
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/5"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/5"></div>
      </div>
      
      {/* Post image skeleton */}
      <div className="h-64 sm:h-80 bg-gray-300 dark:bg-gray-600 rounded-lg mb-4"></div>
      
      {/* Post actions skeleton */}
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
  );

  // Posts loading skeleton
  const PostsLoadingSkeleton = ({ count = 3 }) => (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton key={`skeleton-${index}`} />
      ))}
    </div>
  );

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
        />
      ) : (
        <ProfileHeaderSkeleton />
      )}

      {/* Content Section */}
      <section ref={containerRef} className="mt-6 space-y-4">
        {activeTab === "posts" ? (
          <>
            {loading && posts.length === 0 ? (
              // Initial loading skeletons
              <PostsLoadingSkeleton count={5} />
            ) : filteredPosts.length > 0 ? (
              <>
                {filteredPosts
                  .slice()
                  .map((post) => (
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
                
                {/* Loading more skeleton */}
                {loadingMore && (
                  <PostsLoadingSkeleton count={3} />
                )}
                
                {/* No more posts indicator */}
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
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
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