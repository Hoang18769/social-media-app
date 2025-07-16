"use client"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { throttle } from "lodash"
import PostCard from "@/components/social-app-component/PostCard"
import api from "@/utils/axios"
import toast from "react-hot-toast"
import usePostActions from "@/hooks/usePostAction"
import PostSkeleton from "@/components/social-app-component/PostCardSkeleton";
import {pageMetadata, updatePageMetadata, usePageMetadata} from "@/utils/clientMetadata";


export default function HomePage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)
  const containerRef = useRef(null)
  const abortControllerRef = useRef(null)
  const isInitialLoadRef = useRef(true)
  
  const LIMIT = 20
  const { toggleLike } = usePostActions({ posts, setPosts })
  usePageMetadata(pageMetadata.home());

  // Lấy thông tin user một lần khi component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem("userName")
      const storedUserId = localStorage.getItem("userId")
      
      if (storedUsername && storedUserId) {
        setCurrentUser({
          username: storedUsername,
          id: storedUserId
        })
      }
    }
  }, [])

  // Memoize filtered posts
  const filteredPosts = useMemo(() => {
    if (!posts.length || !currentUser) {
      return []
    }

    return posts.filter(post => {
      // Always show own posts regardless of privacy
      if (post.author?.username === currentUser.username || 
          post.author?.id === currentUser.id) {
        return true
      }

      // For other users' posts, apply privacy rules
      switch (post.privacy) {
        case 'PUBLIC':
          return true
        case 'FRIEND':
          return post.author?.isFriend === true
        case 'PRIVATE':
          return false
        default:
          return true
      }
    })
  }, [posts, currentUser])

  // Fetch posts function với cải thiện abort controller handling
  const fetchPosts = useCallback(async (skipValue = 0, isLoadMore = false) => {
    try {
      // Chỉ cancel request cũ nếu đây không phải là initial load
      // và nếu có request đang pending
      if (abortControllerRef.current && !isInitialLoadRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const res = await api.get(
        `/v1/posts/newsfeed?skip=${skipValue}&limit=${LIMIT}`,
        { signal: abortControllerRef.current.signal }
      )
      
      const newPosts = res.data.body || []
      
      // If no new posts or less than LIMIT, no more data
      if (newPosts.length === 0 || newPosts.length < LIMIT) {
        setHasMore(false)
      }

      if (isLoadMore) {
        // Sử dụng functional update để tránh stale closure
        setPosts(prevPosts => {
          // Tránh duplicate posts
          const existingIds = new Set(prevPosts.map(p => p.id))
          const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id))
          return [...prevPosts, ...uniqueNewPosts]
        })
        setSkip(prevSkip => prevSkip + newPosts.length)
      } else {
        setPosts(newPosts)
        setSkip(newPosts.length)
      }
      
      console.log(`Loaded ${newPosts.length} posts, skip: ${skipValue}`)
      
      // Đánh dấu initial load đã hoàn thành
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false
      }
    } catch (err) {
      // Ignore abort errors và chỉ show toast nếu không phải abort error
      if (err.name !== 'AbortError') {
        console.error("Failed to fetch newsfeed:", err)
        // Chỉ show toast error nếu không phải là initial load hoặc theme change
        if (!isInitialLoadRef.current) {
          toast.error("Failed to load posts.")
        }
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Throttled scroll handler
  const throttledScrollHandler = useMemo(
    () => throttle(() => {
      const scrollContainer = document.querySelector('main')
      
      if (!scrollContainer || loadingMore || !hasMore) {
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight * 100

      // Load more when scroll reaches 80%
      if (scrollPercentage >= 80) {
        console.log('Loading more posts at 80%...')
        fetchPosts(skip, true)
      }
    }, 200), // Throttle to 200ms
    [loadingMore, hasMore, skip, fetchPosts]
  )

  // Add scroll event listener
  useEffect(() => {
    const scrollContainer = document.querySelector('main')
    
    if (!scrollContainer) {
      // Retry after a short delay
      const timer = setTimeout(() => {
        const retryContainer = document.querySelector('main')
        if (retryContainer) {
          retryContainer.addEventListener('scroll', throttledScrollHandler, { passive: true })
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }

    scrollContainer.addEventListener('scroll', throttledScrollHandler, { passive: true })
    
    return () => {
      scrollContainer.removeEventListener('scroll', throttledScrollHandler)
      throttledScrollHandler.cancel()
    }
  }, [throttledScrollHandler])

  // Initial load - chỉ load khi có currentUser
  useEffect(() => {
    if (currentUser && isInitialLoadRef.current) {
      fetchPosts(0, false)
    }
    
    return () => {
      // Cleanup: chỉ abort nếu component unmount hoàn toàn
      if (abortControllerRef.current && !document.body.contains(containerRef.current)) {
        abortControllerRef.current.abort()
      }
    }
  }, [currentUser, fetchPosts])

  // Memoized skeleton component

  // Memoized loading skeletons
  const loadingSkeletons = useMemo(() => 
    Array.from({ length: 3 }).map((_, index) => (
      <PostSkeleton key={index} />
    )), [PostSkeleton]
  )

  const loadingMoreSkeletons = useMemo(() => 
    Array.from({ length: 3 }).map((_, index) => (
      <PostSkeleton key={`loading-${index}`} />
    )), [PostSkeleton]
  )

  // Memoized render logic
  const renderContent = useMemo(() => {
    // Không render gì nếu chưa có currentUser
    if (!currentUser) {
      return (
        <div className=" space-y-6 w-full flex flex-col items-center px-8">
          {loadingSkeletons}
        </div>
      )
    }

    if (loading) {
      return (
        <div className=" space-y-6 w-full flex flex-col items-center px-8">
          {loadingSkeletons}
        </div>
      )
    }

    if (filteredPosts.length > 0) {
      return (
        <>
          {filteredPosts.map((post, index) => (
              <PostCard
                  key={post.id}
                  post={post}
                  liked={post.liked}
                  likeCount={post.likeCount}
                  onLikeToggle={() => toggleLike(post.id)}
                  isOwnPost={post.author?.username === currentUser?.username ||
                      post.author?.id === currentUser?.id}
                  isPriority={index < 3} // Posts với index 0, 1, 2 sẽ có priority
              />
          ))}
          
          {/* Loading more skeleton */}
          {loadingMore && (
            <div className="w-full space-y-6">
              {loadingMoreSkeletons}
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
      )
    }

    if (posts.length > 0) {
      // All posts were filtered out due to privacy
      return (
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
      )
    }

    // No posts at all
    return (
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
    )
  }, [loading, filteredPosts, posts.length, loadingMore, hasMore, currentUser, loadingSkeletons, loadingMoreSkeletons, toggleLike])

  return (
    <div ref={containerRef} className="p-6 space-y-6 flex flex-col items-center">
      {renderContent}
    </div>
  )
}