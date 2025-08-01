"use client"

import api from "@/utils/axios"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import PostCard from "@/components/social-app-component/PostCard"
import usePostActions from "@/hooks/usePostAction"
import toast from "react-hot-toast"
import adminApi from "@/utils/adminInterception";

export default function ViewPostPage() {
  const router = useRouter()

  // Core states
  const [posts, setPosts] = useState([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [error, setError] = useState("")

  // Pagination states
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentSkip, setCurrentSkip] = useState(0)

  // Refs for optimization
  const abortControllerRef = useRef(null)
  const hasInitialized = useRef(false) // ✅ Thêm ref để track initialization

  const LIMIT = 20

  // Use the same hook as ProfilePage for consistency
  const { toggleLike } = usePostActions({ posts, setPosts })

  // Memoize current user để tránh re-calculation
  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return null

    const storedUsername = localStorage.getItem("userName")
    const storedUserId = localStorage.getItem("userId")

    if (storedUsername && storedUserId) {
      return {
        username: storedUsername,
        id: storedUserId
      }
    }
    return null
  }, [])

  // Handle post deletion - consistent with ProfilePage
  const handlePostDeleted = useCallback((deletedPostId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId))
    setTotalPosts(prev => Math.max(0, prev - 1))
  }, [])

  // ✅ Tách fetchTotalPosts ra khỏi useCallback dependencies
  const fetchTotalPosts = useCallback(async () => {
    const controller = new AbortController()

    try {
      const res = await adminApi.get("/v1/statistics/posts", {
        signal: controller.signal
      })
      setTotalPosts(res.data.body?.totalPosts || 0)
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("Error fetching total posts:", err)
      }
    }

    return () => controller.abort()
  }, []) // ✅ Không có dependencies

  // ✅ Tách fetchPosts ra khỏi useCallback dependencies
  const fetchPosts = useCallback(async (skipValue = 0, isLoadMore = false) => {
    const token = localStorage.getItem("admin_accessToken")
    if (!token) {
      console.warn("Không có token đăng nhập")
      return
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError("")

      const res = await adminApi.get(
          `/v1/posts?skip=${skipValue}&limit=${LIMIT}`,
          { signal: abortControllerRef.current.signal }
      )
      console.log(res.data.body)
      if (res.data.code === 200) {
        const newPosts = res.data.body || []

        // Use functional update to avoid stale closure
        setPosts(prevPosts => {
          if (isLoadMore) {
            // Prevent duplicate posts
            const existingIds = new Set(prevPosts.map(p => p.id))
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id))
            return [...prevPosts, ...uniqueNewPosts]
          } else {
            return newPosts
          }
        })

        // Update hasMore and currentSkip based on returned data
        setHasMore(newPosts.length === LIMIT)
        setCurrentSkip(skipValue + newPosts.length)

        console.log(`Loaded ${newPosts.length} posts, skip: ${skipValue}`)
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(`Không thể tải danh sách posts: ${err.message}`)
        console.error("Lỗi khi tải bài viết:", err)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, []) // ✅ Không có dependencies

  // Handle load more button click
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(currentSkip, true)
    }
  }, [currentSkip, hasMore, loadingMore, fetchPosts])

  // ✅ Sử dụng useEffect với empty dependency array và hasInitialized ref
  useEffect(() => {
    if (hasInitialized.current) return // ✅ Prevent double initialization

    console.log('Initial posts and stats load...')
    hasInitialized.current = true // ✅ Mark as initialized

    fetchTotalPosts()
    fetchPosts(0, false)

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, []) // ✅ Empty dependency array

  const handleBackToStats = useCallback(() => {
    router.back()
  }, [router])

  // Memoized skeleton components for better performance
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
  ), [])

  const PostsLoadingSkeleton = useMemo(() => {
    const Component = ({ count = 3 }) => (
        <div className="space-y-6">
          {Array.from({ length: count }).map((_, index) => (
              <div key={`skeleton-${index}`}>{PostSkeleton}</div>
          ))}
        </div>
    )
    Component.displayName = "PostsLoadingSkeleton"
    return Component
  }, [PostSkeleton])

  return (
      <main className="max-w-4xl mx-auto mt-4 px-4">
        <div className="space-y-6 flex flex-col items-center">
          {/* Container wrapper for centering */}
          <div className="w-full max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <button
                    onClick={handleBackToStats}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Statistics
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  All Posts ({totalPosts})
                </h2>
              </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Posts List */}
            <section className="space-y-4">
              {loading && posts.length === 0 ? (
                  <PostsLoadingSkeleton count={5} />
              ) : posts.length > 0 ? (
                  <div className="flex flex-col items-center">
                    {posts.reduce((acc, post) => {
                      if (!acc.some(p => p.id === post.id)) acc.push(post);
                      return acc;
                    }, []).map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            liked={post.liked}
                            likeCount={post.likeCount}
                            onLikeToggle={() => toggleLike(post.id)}
                            onPostDeleted={handlePostDeleted}
                            isAdmin={true}
                            isOwnProfile={currentUser?.username === post.user?.username}
                            isFriend={post.user?.isFriend}
                        />
                    ))}

                    {loadingMore && <PostsLoadingSkeleton count={3} />}

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
                                  Load More Posts
                                  <span className="text-sm opacity-80">({posts.length} / {totalPosts})</span>
                                </>
                            )}
                          </button>
                      ) : (
                          <div className="bg-white dark:bg-gray-800 rounded-full px-6 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                              🎉 Bạn đã xem hết bài viết!
                            </p>
                          </div>
                      )}
                    </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No posts available
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        There are no posts to display at the moment.
                      </p>
                    </div>
                  </div>
              )}
            </section>
          </div>
        </div>
      </main>
  )
}