"use client"

import { useEffect, useState } from "react"
import Avatar from "../ui-components/Avatar"
import Card from "../ui-components/Card"
import { Heart, MessageCircle, SendHorizonal, MoreVertical, Share2 } from "lucide-react"
import ImageView from "../ui-components/ImageView"
import PostModal from "./PostModal"
import EditPostModal from "./EditPostModal"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import api from "@/utils/axios"
import Modal from "../ui-components/Modal"

dayjs.extend(relativeTime)

export default function PostCard({ post, liked, onLikeToggle, size = "default", className = "" }) {
  const [isMobile, setIsMobile] = useState(undefined)
  const [activeImageIndex, setActiveImageIndex] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [originalPostData, setOriginalPostData] = useState(null)
  const [loadingOriginalPost, setLoadingOriginalPost] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareContent, setShareContent] = useState("")
  const [sharePrivacy, setSharePrivacy] = useState("FRIEND")
  const [isSharing, setIsSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentPost, setCurrentPost] = useState(post)

  const router = useRouter()
  const isModalOpen = activeImageIndex !== null || showModal
  
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 640)
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  useEffect(() => {
    if (isModalOpen) {
      if (currentPost.sharedPost) {
        fetchOriginalPost()
      } else {
        fetchComments()
      }
    }
  }, [isModalOpen])

  const fetchOriginalPost = async () => {
    if (loadingOriginalPost || originalPostData) return
    setLoadingOriginalPost(true)
    try {
      const res = await api.get(`/v1/posts/${currentPost.originalPost.id}`)
      setOriginalPostData(res.data.body)
      // Also fetch comments for the original post
      fetchCommentsForPost(currentPost.originalPost.id)
    } catch (err) {
      toast.error("Không thể tải bài viết gốc")
      console.error(err)
    } finally {
      setLoadingOriginalPost(false)
    }
  }

  const fetchComments = async () => {
    if (loadingComments || comments.length > 0) return
    fetchCommentsForPost(currentPost.id)
  }

  const fetchCommentsForPost = async (postId) => {
    if (loadingComments || comments.length > 0) return
    setLoadingComments(true)
    try {
      const res = await api.get(`/v1/comments/of-post/${postId}`, {
        params: { page: 0, size: 50 }
      })
      console.log(res)
      setComments(res.data.body || [])
    } catch (err) {
      toast.error("Không thể tải bình luận")
      console.error(err)
    } finally {
      setLoadingComments(false)
    }
  }

  if (isMobile === undefined) return null

  const avatarSize = size === "compact" ? (isMobile ? 28 : 32) : size === "large" ? (isMobile ? 36 : 48) : (isMobile ? 32 : 40)
  const padding = size === "compact" ? "p-2 sm:p-3" : size === "large" ? "p-5" : "p-4"
  const spacing = size === "compact" ? "gap-2 mb-1" : size === "large" ? "gap-4 mb-3" : "gap-3 mb-2"

  const textSizes = {
    username: size === "compact" ? "text-sm" : size === "large" ? "text-base" : "text-sm",
    time: "text-xs text-[var(--muted-foreground)]",
    content: "text-sm text-[var(--foreground)]",
    likes: "text-xs text-[var(--muted-foreground)] mt-1",
    viewAll: "text-xs text-[var(--muted-foreground)] mt-2 hover:underline",
    comment: "text-sm text-[var(--foreground)] mt-1"
  }

  const handleEdit = () => {
    setShowOptions(false)
    setShowEditModal(true)
  }

  const handlePostUpdated = (updatedPost) => {
    setCurrentPost(updatedPost)
  }

  const handleShare = (e) => {
    setShowShareModal(true)
  }

  const handleSharePost = async () => {
    if (isSharing) return
    setIsSharing(true)
    try {
      await api.post("/v1/posts/share", {
        content: shareContent,
        privacy: sharePrivacy,
        originalPostId: currentPost.id,
      })
      toast.success("Chia sẻ bài viết thành công!")
      setShowShareModal(false)
      setShareContent("")
      setSharePrivacy("FRIEND")
    } catch (err) {
      toast.error("Lỗi khi chia sẻ bài viết!")
      console.error(err)
    } finally {
      setIsSharing(false)
    }
  }

  const handleDeletePost = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return
    setDeleting(true)
    try {
      await api.delete(`/v1/posts/${currentPost.id}`)
      toast.success("Đã xóa bài viết!")
      router.refresh?.() || window.location.reload()
    } catch (err) {
      toast.error("Không thể xóa bài viết!")
      console.error(err)
    } finally {
      setDeleting(false)
      setShowOptions(false)
    }
  }

  // Function to open modal - unified logic
  const openModal = () => {
    setShowModal(true)
    if (currentPost.sharedPost) {
      fetchOriginalPost()
    } else {
      fetchComments()
    }
  }

  const handleCardClick = (e) => {
    // Không mở modal nếu đang click vào button hoặc đang trong mode edit
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('textarea')) {
      return
    }
    openModal()
  }

  const handleProfileClick = (e) => {
    e.stopPropagation() // Ngăn không cho bubble up tới card click
    router.push(`/profile/${currentPost.author?.username}`)
  }

  const handleOriginalProfileClick = (e) => {
    e.stopPropagation()
    router.push(`/profile/${currentPost.originalPost?.author?.username}`)
  }

  // Handler for MessageCircle button
  const handleMessageCircleClick = (e) => {
    e.stopPropagation()
    openModal()
  }

  const renderPrivacyIcon = (privacy) => {
    switch (privacy) {
      case "PUBLIC": return "🌍"
      case "FRIEND": return "👥"
      case "PRIVATE": return "🔒"
      default: return ""
    }
  }

  const renderSharedPostContent = () => {
    if (!currentPost.sharedPost) return null

    if (!currentPost.originalPostCanView) {
      return (
        <div className="mt-3 p-4 border border-[var(--border)] rounded-lg bg-[var(--card)]/50">
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[var(--muted-foreground)]">
              Bài viết hiện không khả dụng
            </p>
          </div>
        </div>
      )
    }

    else {
      return (
      <div className="mt-3 p-4 border border-[var(--border)] rounded-lg bg-[var(--card)]/50">
        {/* Original post author info */}
        <div className="flex items-center gap-2 mb-3 cursor-pointer hover:underline" onClick={handleOriginalProfileClick}>
          <Avatar
            src={currentPost.originalPost.author?.profilePictureUrl}
            alt={currentPost.originalPost.author?.username || ""}
            size={32}
          />
          <div>
            <p className="font-semibold text-sm text-[var(--card-foreground)]">
              {currentPost.originalPost.author?.familyName + " " + currentPost.originalPost.author?.givenName}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {dayjs(currentPost.originalPost.createdAt).fromNow()} {renderPrivacyIcon(currentPost.originalPost.privacy)}
            </p>
          </div>
        </div>

        {/* Original post content */}
        {currentPost.originalPost.content && (
          <p className="text-sm text-[var(--card-foreground)] mb-3">
            {currentPost.originalPost.content}
          </p>
        )}

        {/* Original post images */}
        {Array.isArray(currentPost.originalPost.files) && currentPost.originalPost.files.length > 0 && (
          <div onClick={(e) => e.stopPropagation()}>
            <ImageView
              images={currentPost.originalPost.files}
              isActive={!isModalOpen}
              onImageClick={(i) => {
                setActiveImageIndex(i)
                setShowModal(true)
              }}
            />
          </div>
        )}
      </div>
    )
    }
  }

  // For shared posts, we need to use the fetched original post data which has complete interaction info
  const getPostForModal = () => {
    if (currentPost.sharedPost && originalPostData) {
      return originalPostData
    }
    return currentPost
  }

  const getPostForInteractions = () => {
    if (currentPost.sharedPost && originalPostData) {
      return originalPostData
    }
    return currentPost.sharedPost ? currentPost.originalPost : currentPost
  }

  return (
    <>
      <Card 
        className={`bg-[var(--card)] text-[var(--card-foreground)] rounded-xl shadow-sm ${padding} w-full ${className} cursor-pointer hover:bg-[var(--card)]/90 transition-colors`}
        onClick={handleCardClick}
      >
        <div className={`flex items-start justify-between ${spacing} relative`}>
          <div
            className="flex items-center gap-2 cursor-pointer hover:underline"
            onClick={handleProfileClick}
          >
            <Avatar
              src={currentPost.author?.profilePictureUrl}
              alt={currentPost.author?.username || ""}
              size={avatarSize}
            />
            <div>
              <p className={`font-semibold ${textSizes.username}`}>
                {currentPost.author?.familyName + " " + currentPost.author?.givenName}
                {currentPost.sharedPost && (
                  <>
                    {" đã chia sẻ một bài viết"}
                    <Share2 className="inline w-4 h-4 ml-1 text-[var(--muted-foreground)]" />
                  </>
                )}
              </p>
              <p className={textSizes.time}>
                {dayjs(currentPost.createdAt).fromNow()} {renderPrivacyIcon(currentPost.privacy)}
              </p>
              {currentPost.author?.mutualFriendsCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {currentPost.author.mutualFriendsCount} bạn chung
                </p>
              )}
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setShowOptions(!showOptions)
              }} 
              className="text-xl text-[var(--muted-foreground)] hover:bg-[var(--input)] rounded-full p-1"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showOptions && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[var(--background)] border rounded shadow z-10">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit()
                  }} 
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--input)]"
                >
                  ✏️ Chỉnh sửa
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeletePost()
                  }} 
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--input)] disabled:opacity-50"
                  disabled={deleting}
                >
                  🗑️ {deleting ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current post content (share comment) */}
        {currentPost.content && (
          <div onClick={(e) => {
            e.stopPropagation()
            openModal()
          }}>
            <p className={`${textSizes.content} ${spacing}`}>
              {currentPost.content}
            </p>
          </div>
        )}
        
        {/* Shared post content */}
        {renderSharedPostContent()}
        
        {/* Current post images (if not a shared post) */}
        {!currentPost.sharedPost && Array.isArray(currentPost.files) && currentPost.files.length > 0 && (
          <div onClick={(e) => e.stopPropagation()}>
            <ImageView
              images={currentPost.files}
              isActive={!isModalOpen}
              onImageClick={(i) => {
                setActiveImageIndex(i)
                setShowModal(true)
              }}
            />
          </div>
        )}

        <div className="flex mt-3 gap-4 text-[var(--muted-foreground)]">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onLikeToggle()
            }} 
            className="p-2 rounded-full hover:bg-[var(--input)]"
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          </button>
          <button 
            onClick={handleMessageCircleClick}
            className="p-2 rounded-full hover:bg-[var(--input)]"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              handleShare()
            }}
            className="p-2 rounded-full hover:bg-[var(--input)]"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>

        <p className={textSizes.likes}>
          {currentPost.likeCount} lượt thích
        </p>

        {(currentPost.sharedPost ? (originalPostData?.latestComment || currentPost.originalPost?.latestComment) : currentPost.latestComment) && (
          <div className={textSizes.comment}>
            <span className="font-semibold">
              {currentPost.sharedPost ? 
                (originalPostData?.latestComment?.user || currentPost.originalPost?.latestComment?.user) : 
                currentPost.latestComment?.user}
            </span>
            <span className="ml-2">
              {currentPost.sharedPost ? 
                (originalPostData?.latestComment?.content || currentPost.originalPost?.latestComment?.content) : 
                currentPost.latestComment?.content}
            </span>
          </div>
        )}

        <button
          className={textSizes.viewAll}
          onClick={(e) => {
            e.stopPropagation()
            openModal()
          }}
        >
          Xem tất cả {currentPost.sharedPost ? (originalPostData?.commentCount || currentPost.originalPost?.commentCount || 0) : currentPost.commentCount} bình luận
        </button>
      </Card>

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        post={currentPost}
        onPostUpdated={handlePostUpdated}
      />

      {/* Post Modal */}
      {isModalOpen && (
        <PostModal
          post={getPostForModal()}
          liked={currentPost.sharedPost ? (originalPostData?.liked || false) : liked}
          likeCount={currentPost.sharedPost ? (originalPostData?.likeCount || 0) : currentPost.likeCount}
          activeIndex={activeImageIndex}
          comments={comments}
          loadingComments={loadingComments || loadingOriginalPost}
          onFetchComments={currentPost.sharedPost ? () => fetchCommentsForPost(currentPost.originalPost.id) : fetchComments}
          onClose={() => {
            setActiveImageIndex(null)
            setShowModal(false)
            // Reset original post data to allow fresh fetch next time
            if (currentPost.sharedPost) {
              setOriginalPostData(null)
              setComments([])
            }
          }}
          onLikeToggle={() => onLikeToggle(currentPost.sharedPost ? currentPost.originalPost.id : currentPost.id)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <Modal isOpen={showShareModal} size="medium" onClose={() => setShowShareModal(false)}>
          <div className="p-4 w-full max-w-md mx-auto">
            <h2 className="text-lg font-semibold mb-2">Chia sẻ bài viết</h2>

            <label className="block text-sm mb-1">Privacy</label>
            <select
              className="w-full mb-3 p-2 border rounded"
              value={sharePrivacy}
              onChange={(e) => setSharePrivacy(e.target.value)}
            >
              <option value="PUBLIC">🌍 Public</option>
              <option value="FRIEND">👥 Friends</option>
              <option value="PRIVATE">🔒 Only me</option>
            </select>

            <label className="block text-sm mb-1">Bạn muốn nói gì không?</label>
            <textarea
              className="w-full mb-3 p-2 border rounded resize-none"
              placeholder="Viết điều gì đó..."
              rows={3}
              value={shareContent}
              onChange={(e) => setShareContent(e.target.value)}
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-3 py-1 border rounded"
                disabled={isSharing}
              >Hủy</button>
              <button
                onClick={handleSharePost}
                className="px-3 py-1 bg-[var(--primary)] text-white rounded disabled:opacity-50"
                disabled={isSharing}
              >{isSharing ? "Đang chia sẻ..." : "Chia sẻ"}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}