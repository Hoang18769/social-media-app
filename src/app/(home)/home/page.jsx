"use client"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import PostCard from "@/components/social-app-component/PostCard"
import api from "@/utils/axios"
import toast from "react-hot-toast"
import usePostActions from "@/hooks/usePostAction"
import PostSkeleton from "@/components/social-app-component/PostCardSkeleton"
import { pageMetadata, usePageMetadata } from "@/utils/clientMetadata"

export default function HomePage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)
  const [filterType, setFilterType] = useState("RELEVANT")
  const containerRef = useRef(null)
  const abortControllerRef = useRef(null)
  const isInitialLoadRef = useRef(true)
  const isMountedRef = useRef(true)
  const router = useRouter()

  // Intersection Observer ref
  const loadMoreRef = useRef(null)
  const observerRef = useRef(null)

  const LIMIT = 20

  const { toggleLike } = usePostActions({ posts, setPosts })

  usePageMetadata(pageMetadata.home())

  // Component cleanup
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Cancel all requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Cleanup observer
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Get user info once when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUsername = localStorage.getItem("userName")
      const storedUserId = localStorage.getItem("userId")
      if (storedUsername && storedUserId) {
        setCurrentUser({
          username: storedUsername,
          id: storedUserId,
        })
      }
    }
  }, [])

  // Memoize filtered posts
  const filteredPosts = useMemo(() => {
    if (!posts.length || !currentUser) {
      return []
    }
    return posts.filter((post) => {
      if (post.author?.username === currentUser.username || post.author?.id === currentUser.id) {
        return true
      }
      switch (post.privacy) {
        case "PUBLIC":
          return true
        case "FRIEND":
          return post.author?.isFriend === true
        case "PRIVATE":
          return false
        default:
          return true
      }
    })
  }, [posts, currentUser])

  // Improved fetchPosts function with filter type
  const fetchPosts = useCallback(
      async (skipValue = 0, isLoadMore = false, type = filterType) => {
        // Check if component is still mounted
        if (!isMountedRef.current) {
          return
        }

        try {
          // Cancel old request if exists
          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }

          // Create new controller
          abortControllerRef.current = new AbortController()

          if (isLoadMore) {
            setLoadingMore(true)
          } else {
            setLoading(true)
          }

          const res = await api.get(`/v1/posts/newsfeed?skip=${skipValue}&limit=${LIMIT}&type=${type}`, {
            signal: abortControllerRef.current.signal,
          })

          // Check component mounted after request completes
          if (!isMountedRef.current) {
            return
          }

          const newPosts = res.data.body || []

          if (newPosts.length === 0 || newPosts.length < LIMIT) {
            setHasMore(false)
          }

          if (isLoadMore) {
            setPosts((prevPosts) => {
              const existingIds = new Set(prevPosts.map((p) => p.id))
              const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(p.id))
              return [...prevPosts, ...uniqueNewPosts]
            })
            setSkip((prevSkip) => prevSkip + newPosts.length)
          } else {
            setPosts(newPosts)
            setSkip(newPosts.length)
          }

          console.log(`Loaded ${newPosts.length} posts, skip: ${skipValue}, type: ${type}`)

          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false
          }
        } catch (err) {
          // 1. Not an AbortError
          // 2. Component is still mounted
          // 3. Not initial load
          if (err.name !== "AbortError" && isMountedRef.current && !isInitialLoadRef.current) {
            console.error("Failed to fetch newsfeed:", err)
            toast.error("Failed to load posts.")
          }
        } finally {
          // Only update state if component is still mounted
          if (isMountedRef.current) {
            setLoading(false)
            setLoadingMore(false)
          }
        }
      },
      [filterType],
  )

  // Handle filter change
  const handleFilterChange = useCallback(
      (newType) => {
        if (newType === filterType) return

        setFilterType(newType)
        setPosts([])
        setSkip(0)
        setHasMore(true)
        isInitialLoadRef.current = true

        // Fetch posts with new filter
        if (currentUser) {
          fetchPosts(0, false, newType)
        }
      },
      [filterType, currentUser, fetchPosts],
  )

  // Intersection Observer callback
  const handleIntersection = useCallback(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loadingMore && !loading && currentUser) {
          console.log("Loading more posts via Intersection Observer...")
          fetchPosts(skip, true)
        }
      },
      [hasMore, loadingMore, loading, currentUser, skip, fetchPosts],
  )

  // Setup Intersection Observer
  useEffect(() => {
    if (!loadMoreRef.current) return

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: "100px", // Start loading 100px before the element comes into view
      threshold: 0.1, // Trigger when 10% of the element is visible
    })

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleIntersection])

  // Initial load effect
  useEffect(() => {
    if (currentUser && isInitialLoadRef.current && isMountedRef.current) {
      fetchPosts(0, false)
    }
  }, [currentUser, fetchPosts])

  // Memoized loading skeletons
  const loadingSkeletons = useMemo(() => Array.from({ length: 3 }).map((_, index) => <PostSkeleton key={index} />), [])

  const loadingMoreSkeletons = useMemo(
      () => Array.from({ length: 3 }).map((_, index) => <PostSkeleton key={`loading-${index}`} />),
      [],
  )

  // Filter Toggle Component
  const FilterToggle = useMemo(() => {
    const filters = [
      { key: "RELEVANT", label: "Trang chủ", icon: "🏠" },
      { key: "TIME", label: "Mới nhất", icon: "⏰" },
      { key: "FRIEND_ONLY", label: "Bạn bè", icon: "👥" },
    ]

    return (
        <div className="w-full max-w-md mx-auto mb-2">
          <div className="bg-[var(--card)] p-1.5 rounded-full shadow-xl  border-gray-100 dark:border-gray-700">
            <div className="flex relative gap-1">
              {filters.map((filter, index) => (
                  <button
                      key={filter.key}
                      onClick={() => handleFilterChange(filter.key)}
                      className={`
          flex-1 relative z-10 px-4 text-sm font-semibold rounded-full 
          transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-[0.98]
          ${
                          filterType === filter.key
                              ? "text-[var(--foreground)] bg-[var(--background)] shadow-lg shadow-500/25"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }
        `}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-lg">{filter.icon}</span>
                      <span className="hidden sm:inline font-medium">{filter.label}</span>
                    </div>
                  </button>
              ))}
            </div>
          </div>

        </div>

    )
  }, [filterType, handleFilterChange])

  // Memoized render logic
  const renderContent = useMemo(() => {
    if (!currentUser) {
      return <div className="space-y-6 w-full flex flex-col items-center px-8">{loadingSkeletons}</div>
    }

    if (loading) {
      return <div className="space-y-6 w-full flex flex-col items-center px-8">{loadingSkeletons}</div>
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
                    isOwnPost={post.author?.username === currentUser?.username || post.author?.id === currentUser?.id}
                    isPriority={index < 3}
                />
            ))}
            {/* Intersection Observer target element */}
            {hasMore && (
                <div ref={loadMoreRef} className="w-full flex justify-center py-8">
                  {loadingMore && <div className="w-full space-y-6">{loadingMoreSkeletons}</div>}
                </div>
            )}
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
      return (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No visible posts</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Posts are available but not visible due to privacy settings.
              </p>
            </div>
          </div>
      )
    }

    return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No posts yet</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Follow friends or create your first post to see content here.
            </p>
          </div>
        </div>
    )
  }, [
    loading,
    filteredPosts,
    posts.length,
    loadingMore,
    hasMore,
    currentUser,
    loadingSkeletons,
    loadingMoreSkeletons,
    toggleLike,
  ])

  return (
      <div ref={containerRef} className="p-6 space-y-6 flex flex-col items-center">
        {FilterToggle}
        {renderContent}
      </div>
  )
}
