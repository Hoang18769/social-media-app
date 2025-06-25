"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import PostCard from "@/components/social-app-component/PostCard"
import api from "@/utils/axios"
import toast from "react-hot-toast"
import usePostActions from "@/hooks/usePostAction"

export default function HomePage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const containerRef = useRef(null)
  
  const LIMIT = 20
  const { toggleLike } = usePostActions({ posts, setPosts })

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
      console.log('Skip scroll:', { loadingMore, hasMore })
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
    <div className="w-full max-w-2xl bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-20"></div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-gray-300 rounded w-full"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
      
      {/* Image skeleton */}
      <div className="h-64 bg-gray-300 rounded-lg mb-4"></div>
      
      {/* Actions skeleton */}
      <div className="flex items-center space-x-6">
        <div className="h-8 bg-gray-300 rounded w-16"></div>
        <div className="h-8 bg-gray-300 rounded w-20"></div>
        <div className="h-8 bg-gray-300 rounded w-16"></div>
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
      {posts.length > 0 ? (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={post.liked}
              likeCount={post.likeCount}
              onLikeToggle={() => toggleLike(post.id)}
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
          {!hasMore && posts.length > 0 && (
            <div className="flex justify-center py-4">
              <p className="text-muted-foreground">No more posts to load.</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500">Chưa có bài viết nào.</p>
      )}
    </div>
  )
}