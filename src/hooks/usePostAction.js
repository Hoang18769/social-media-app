import { useCallback, useRef } from "react"
import api from "@/utils/axios"

export default function usePostActions({ posts, setPosts }) {
  const isLikingRef = useRef({})

  const toggleLike = useCallback((postId) => {
    if (isLikingRef.current[postId]) return // ⛔ Đang xử lý, chặn click tiếp
    const isArray = Array.isArray(posts)

    // Lấy trạng thái hiện tại TRƯỚC khi update UI
    const currentPost = isArray
        ? posts.find((p) => p.id === postId)
        : posts

    if (!currentPost) return


    const wasLiked = currentPost.liked // Lưu trạng thái ban đầu

    // Update UI ngay lập tức
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post

        return {
          ...post,
          liked: !post.liked,
          likeCount: post.likeCount + (post.liked ? -1 : 1),
        }
      })
    )

    isLikingRef.current[postId] = true

    // Gọi API với trạng thái ban đầu
    ;(async () => {
      try {
        if (wasLiked) {
          const res=await api.delete(`/v1/posts/unlike/${postId}`)
          console.log("✅ Unlike successful",res)
        } else {
          const res=await api.post(`/v1/posts/like/${postId}`)
          console.log("✅ Like successful",res)
        }
      } catch (err) {
        console.error("❌ Toggle like failed:", err)
        
        // Rollback nếu lỗi - khôi phục về trạng thái ban đầu
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id !== postId) return post

            return {
              ...post,
              liked: wasLiked, // Khôi phục trạng thái ban đầu
              likeCount: post.likeCount + (wasLiked ? 1 : -1), // Rollback likeCount
            }
          })
        )
      } finally {
        isLikingRef.current[postId] = false
      }
    })()
  }, [posts, setPosts])

  return { toggleLike }
}