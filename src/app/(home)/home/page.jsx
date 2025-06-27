"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import PostCard from "@/components/social-app-component/PostCard"
import api from "@/utils/axios"
import toast from "react-hot-toast"
import usePostActions from "@/hooks/usePostAction"

export default function HomePage() {
  const [posts, setPosts] = useState([])
  const [filteredPosts, setFilteredPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)
  const containerRef = useRef(null)
  
  const LIMIT = 20
  const { toggleLike } = usePostActions({ posts, setPosts })

  // Get current user info
  useEffect(() => {
    const storedUsername = localStorage.getItem("userName")
    const storedUserId = localStorage.getItem("userId")
    if (storedUsername && storedUserId) {
      setCurrentUser({
        username: storedUsername,
        id: storedUserId
      })
    }
  }, [])

  // Fetch posts function
  const fetchPosts = useCallback(async (skipValue = 0, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const res = await api.get(`/v1/posts/newsfeed?skip=${skipValue}&limit=${LIMIT}`)
      const newPosts = res.data.body || []
      
      // If no new posts or less than LIMIT, no more data
      if (newPosts.length === 0 || newPosts.length < LIMIT) {
        setHasMore(false)
      }

      if (isLoadMore) {
        // Append new posts to existing ones
        setPosts(prevPosts => [...prevPosts, ...newPosts])
      } else {
        // Replace posts (initial load)
        setPosts(newPosts)
      }
      
      console.log(`Loaded ${newPosts.length} posts, skip: ${skipValue}, total posts: ${isLoadMore ? posts.length + newPosts.length : newPosts.length}`)
    } catch (err) {
      console.error("Failed to fetch newsfeed:", err)
      toast.error("Failed to load posts.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Filter posts based on privacy and user relationship
  useEffect(() => {
    if (!posts.length || !currentUser) {
      setFilteredPosts([])
      return
    }

    const filterPosts = () => {
      return posts.filter(post => {
        // Always show own posts regardless of privacy
        if (post.author?.username === currentUser.username || 
            post.author?.id === currentUser.id) {
          return true
        }

        // For other users' posts, apply privacy rules
        switch (post.privacy) {
          case 'PUBLIC':
            // Public posts are visible to everyone
            return true
            
          case 'FRIEND':
            // Friend posts are only visible if the author is a friend
            // Note: You might need to add isFriend field to post.author or fetch it separately
            return post.author?.isFriend === true
            
          case 'PRIVATE':
            // Private posts are never visible to others
            return false
            
          default:
            // Default to public if privacy field is missing
            return true
        }
      })
    }

    setFilteredPosts(filterPosts())
  }, [posts, currentUser])

  // Initial load
  useEffect(() => {
    console.log('Initial load...')
    fetchPosts(0, false)
  }, [fetchPosts])

  // Infinity scroll handler for main container
  const handleScroll = useCallback(() => {
    // Get the main scroll container (parent of this component)
    const scrollContainer = document.querySelector('main')
    
    if (!scrollContainer) {
      console.log('Scroll container not found')
      return
    }

    // Prevent multiple calls
    if (loadingMore || !hasMore) {
      ( { loadingMore, hasMore })
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer

    // Calculate scroll percentage
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight * 100

    console.log('Scroll percentage:', scrollPercentage.toFixed(2) + '%', {
      scrollTop,
      scrollHeight,
      clientHeight,
      postsLength: posts.length
    })

    // Load more when scroll reaches 80%
    if (scrollPercentage >= 80) {
      console.log('Loading more posts at 80%...')
      const newSkip = posts.length
      fetchPosts(newSkip, true)
    }
  }, [loadingMore, hasMore, posts.length, fetchPosts])

  // Add scroll event listener to main container
  useEffect(() => {
    const scrollContainer = document.querySelector('main')
    
    if (!scrollContainer) {
      console.log('Main container not found, retrying...')
      // Retry after a short delay
      const timer = setTimeout(() => {
        const retryContainer = document.querySelector('main')
        if (retryContainer) {
          console.log('Adding scroll listener to main container...')
          retryContainer.addEventListener('scroll', handleScroll)
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }

    console.log('Adding scroll listener to main container...')
    scrollContainer.addEventListener('scroll', handleScroll)
    
    return () => {
      console.log('Removing scroll listener from main container...')
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Post skeleton component
  const PostSkeleton = () => (
    <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
      </div>
      
      {/* Image skeleton */}
      <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded-lg mb-4"></div>
      
      {/* Actions skeleton */}
      <div className="flex items-center space-x-6">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6 flex flex-col items-center">
        {Array.from({ length: 5 }).map((_, index) => (
          <PostSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="p-6 space-y-6 flex flex-col items-center">
      {filteredPosts.length > 0 ? (
        <>
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={post.liked}
              likeCount={post.likeCount}
              onLikeToggle={() => toggleLike(post.id)}
              isOwnPost={post.author?.username === currentUser?.username || 
                        post.author?.id === currentUser?.id}
            />
          ))}
          
          {/* Loading more skeleton */}
          {loadingMore && (
            <div className="w-full space-y-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <PostSkeleton key={`loading-${index}`} />
              ))}
            </div>
          )}
          
          {/* No more posts indicator */}
          {!hasMore && filteredPosts.length > 0 && (
            <div className="flex justify-center py-8">
              <div className="bg-white dark:bg-gray-800 rounded-full px-6 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  🎉 You've caught up with all posts!
                </p>
              </div>
            </div>
          )}
        </>
      ) : posts.length > 0 ? (
        // All posts were filtered out due to privacy
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No visible posts
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Posts are available but not visible due to privacy settings.
            </p>
          </div>
        </div>
      ) : (
        // No posts at all
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Follow friends or create your first post to see content here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}