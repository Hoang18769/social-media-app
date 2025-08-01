"use client"

import { useEffect, useState, memo, useCallback, lazy, Suspense } from "react"
import Avatar from "../ui-components/Avatar"
import Card from "../ui-components/Card"
import { Heart, MessageCircle, SendHorizonal, MoreVertical, Share2 } from "lucide-react"
import ImageView from "../ui-components/ImageView"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import api from "@/utils/axios"
import { getUserId } from "@/utils/axios"
import Modal from "../ui-components/Modal"
import {isAdmin} from "@/hooks/isAdmin"
import { renderTextWithLinks} from "@/hooks/renderTextWithLinks";
import adminApi from "@/utils/adminInterception";

// Dynamic imports for heavy components
const PostModal = lazy(() => import("./PostModal"))
const EditPostModal = lazy(() => import("./EditPostModal"))
const SharePostModal = lazy(() => import("./SharePostModal"))

dayjs.extend(relativeTime)

const PostCard = memo(function PostCard({
                                            post,
                                            liked,
                                            onLikeToggle,
                                            onPostDeleted,
                                            isPriority = false,
                                            isAdmin = false,
                                            size = "default",
                                            className = ""
                                        }) {
    const [isMobile, setIsMobile] = useState(undefined)
    const [activeImageIndex, setActiveImageIndex] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [showOptions, setShowOptions] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [comments, setComments] = useState([])
    const [loadingComments, setLoadingComments] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [currentPost, setCurrentPost] = useState(post)
    const [currentCommentFilter, setCurrentCommentFilter] = useState('RELEVANT') // New state for comment filter
    // Content expansion states
    const [isContentExpanded, setIsContentExpanded] = useState(false)
    const [isOriginalContentExpanded, setIsOriginalContentExpanded] = useState(false)

    // Optimistic UI state for like
    const [optimisticLiked, setOptimisticLiked] = useState(liked)
    const [optimisticLikeCount, setOptimisticLikeCount] = useState(post.likeCount || 0)
    const [isLiking, setIsLiking] = useState(false)

    const router = useRouter()
    const isModalOpen = activeImageIndex !== null || showModal

    // Check if current post is owned by current user
    const currentUserId = getUserId()
    const isOwnPost = currentPost.author?.id === currentUserId || isAdmin

    // Show more options if it's user's own post OR if user is admin
    const showMoreOptions = isOwnPost

    useEffect(() => {
        const checkScreenSize = () => setIsMobile(window.innerWidth < 640)
        checkScreenSize()
        window.addEventListener("resize", checkScreenSize)
        return () => window.removeEventListener("resize", checkScreenSize)
    }, [])

    useEffect(() => {
        if (isModalOpen && comments.length === 0) {
            fetchComments(currentCommentFilter)
        }
    }, [isModalOpen])

    // Update optimistic state when props change
    useEffect(() => {
        setOptimisticLiked(liked)
        setOptimisticLikeCount(post.likeCount || 0)
        setCurrentPost(post)
    }, [liked, post])

    // Memoized functions to prevent unnecessary re-renders
    const shouldTruncateContent = (content, maxLength = 200) => {
        return content && content.length > maxLength
    }

    const getTruncatedContent = (content, maxLength = 200) => {
        if (!content) return ''
        return content.length > maxLength ? content.substring(0, maxLength) + '...' : content
    }

    // Updated fetchComments to support filter parameter
    const fetchComments = useCallback(async (filterType = 'RELEVANT') => {
        setLoadingComments(true)
        try {
            let res;

            if (isAdmin) {
                res = await adminApi.get(`/v1/comments/of-post/${currentPost.id}`, {
                    params: { type: filterType }
                })
            } else {
                res = await api.get(`/v1/comments/of-post/${currentPost.id}`, {
                    params: { type: filterType }
                })
            }
            console.log('Fetched comments with filter:', filterType, res.data)
            setComments(res.data.body || [])
        } catch (err) {
            toast.error("Không thể tải bình luận")
            console.error(err)
            // Don't reset comments on error to prevent modal disappearing
        } finally {
            setLoadingComments(false)
        }
    }, [currentPost.id])

    // Handler for comment filter change
    const handleCommentFilterChange = useCallback((filterType) => {
        console.log('Comment filter changed to:', filterType)
        setCurrentCommentFilter(filterType)
        // Don't reset comments immediately, let fetchComments handle it
        fetchComments(filterType)
    }, [fetchComments])

    // Handler for comment submission
    const handleCommentSubmit = useCallback((newComment) => {
        // Add new comment to the list
        setComments(prevComments => [newComment, ...prevComments])

        // Update post comment count optimistically
        setCurrentPost(prevPost => ({
            ...prevPost,
            commentCount: (prevPost.commentCount || 0) + 1
        }))
    }, [])

    // Optimistic like handler
    const handleLikeToggle = useCallback(async () => {
        if (isLiking) return

        setIsLiking(true)

        const prevLiked = optimisticLiked
        const prevLikeCount = optimisticLikeCount

        // Update optimistically
        const newLiked = !prevLiked
        const newLikeCount = prevLikeCount + (newLiked ? 1 : -1)

        setOptimisticLiked(newLiked)
        setOptimisticLikeCount(newLikeCount)

        try {
            // Call parent handler if it exists
            if (onLikeToggle) {
                const response = await onLikeToggle()

                // Check if response indicates failure
                if (response && response.data && response.data.code !== 200) {
                    // Rollback on failure
                    setOptimisticLiked(prevLiked)
                    setOptimisticLikeCount(prevLikeCount)
                    toast.error("Không thể thực hiện thao tác")
                }
            }
        } catch (error) {
            // Rollback on error
            setOptimisticLiked(prevLiked)
            setOptimisticLikeCount(prevLikeCount)
            toast.error("Có lỗi xảy ra khi thực hiện thao tác")
            console.error("Like error:", error)
        } finally {
            setIsLiking(false)
        }
    }, [isLiking, optimisticLiked, optimisticLikeCount, onLikeToggle])

    const handleEdit = () => {
        setShowOptions(false)
        setShowEditModal(true)
    }

    const handlePostUpdated = useCallback((updatedPost) => {
        setCurrentPost(updatedPost)
    }, [])

    const handleShare = () => {
        setShowShareModal(true)
    }

    const handleDeletePost = useCallback(async () => {
        const confirmMessage = isAdmin && !isOwnPost
            ? "Bạn có chắc chắn muốn xóa bài viết này với tư cách admin không?"
            : "Bạn có chắc chắn muốn xóa bài viết này không?"

        if (!confirm(confirmMessage)) return
        setDeleting(true)
        try {
            if(isAdmin){
                await adminApi.delete(`/v1/posts/${currentPost.id}`)
            }
            else{
                await api.delete(`/v1/posts/${currentPost.id}`)
            }
            toast.success("Đã xóa bài viết!")

            // Thay vì refresh, gọi callback để cập nhật state
            if (onPostDeleted) {
                onPostDeleted(currentPost.id)
            }
        } catch (err) {
            toast.error("Không thể xóa bài viết!")
            console.error(err)
        } finally {
            setDeleting(false)
            setShowOptions(false)
        }
    }, [isAdmin, isOwnPost, currentPost.id, onPostDeleted])

    // Function to open modal - unified logic
    const openModal = useCallback(() => {
        setShowModal(true)
        // Fetch comments with current filter
        fetchComments(currentCommentFilter)
    }, [fetchComments, currentCommentFilter])

    const handleCardClick = (e) => {
        // Không mở modal nếu đang click vào button hoặc đang trong mode edit
        if (e.target.closest('button') || e.target.closest('select') || e.target.closest('textarea') || e.target.closest('a')) {
            return
        }
        openModal()
    }

    const handleProfileClick = (e) => {
        e.stopPropagation() // Ngăn không cho bubble up tới card click
        router.push(`/profile/${currentPost.author?.username}`)
    }

    const handleOriginalProfileClick = useCallback((e) => {
        e.stopPropagation()
        router.push(`/profile/${currentPost.originalPost?.author?.username}`)
    }, [router, currentPost.originalPost?.author?.username])

    // Handler for MessageCircle button
    const handleMessageCircleClick = useCallback((e) => {
        e.stopPropagation()
        openModal()
    }, [openModal])

    const renderPrivacyIcon = (privacy) => {
        switch (privacy) {
            case "PUBLIC": return "🌍"
            case "FRIEND": return "👥"
            case "PRIVATE": return "🔒"
            default: return ""
        }
    }

    const handleImageClick = useCallback((i) => {
        setActiveImageIndex(i)
        setShowModal(true)
    }, [])

    const handleCloseModal = useCallback(() => {
        setActiveImageIndex(null)
        setShowModal(false)
        // Reset comments and filter when closing modal
        setComments([])
        setCurrentCommentFilter('RELEVANT')
    }, [])

    const renderSharedPostContent = useCallback(() => {
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

                {/* Original post content with truncation */}
                {currentPost.originalPost.content && (
                    <pre className="text-sm text-[var(--card-foreground)] mb-3 whitespace-pre-wrap break-words">
                        {shouldTruncateContent(currentPost.originalPost.content) && !isOriginalContentExpanded ? (
                            <>
                                {renderTextWithLinks(getTruncatedContent(currentPost.originalPost.content))}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsOriginalContentExpanded(true)
                                    }}
                                    className="text-blue-500  hover:underline hover:text-blue-700 ml-2 text-sm"
                                >
                                    Xem thêm
                                </button>
                            </>
                        ) : (
                            <>
                                {renderTextWithLinks(currentPost.originalPost.content)}
                                {shouldTruncateContent(currentPost.originalPost.content) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setIsOriginalContentExpanded(false)
                                        }}
                                        className="text-blue-500 hover:text-blue-700 ml-2 text-sm"
                                    >
                                        Thu gọn
                                    </button>
                                )}
                            </>
                        )}
                    </pre>
                )}

                {/* Original post images */}
                {Array.isArray(currentPost.originalPost.files) && currentPost.originalPost.files.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()}>
                        <ImageView
                            images={currentPost.originalPost.files}
                            isActive={!isModalOpen}
                            priority={isPriority}
                            onImageClick={handleImageClick}
                        />
                    </div>
                )}
            </div>
        )
    }, [currentPost, isOriginalContentExpanded, handleOriginalProfileClick, renderPrivacyIcon, shouldTruncateContent, getTruncatedContent, isModalOpen, isPriority, handleImageClick])

    if (isMobile === undefined) return null

    return (
        <>
            <Card
                className={`my-2 text-[var(--card-foreground)] rounded-xl shadow-sm 
                    ${size === "compact" ? "p-2 sm:p-3" : size === "large" ? "p-5" : "p-4"} 
                    w-full ${className} cursor-pointer hover:bg-[var(--card)]/90 transition-colors`}
                onClick={handleCardClick}
            >
                <div className={`flex items-start justify-between relative
                    ${size === "compact" ? "gap-2 mb-1" : size === "large" ? "gap-4 mb-3" : "gap-3 mb-2"}`}>
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:underline"
                        onClick={handleProfileClick}
                    >
                        <Avatar
                            src={currentPost.author?.profilePictureUrl}
                            alt={currentPost.author?.username || ""}
                            size={size === "compact" ? (isMobile ? 28 : 32) : size === "large" ? (isMobile ? 36 : 48) : (isMobile ? 32 : 40)}
                        />
                        <div>
                            <p className={`font-semibold 
                                ${size === "compact" ? "text-sm" : size === "large" ? "text-base" : "text-sm"}`}>
                                {currentPost.author?.familyName + " " + currentPost.author?.givenName}
                                {currentPost.sharedPost && (
                                    <>
                                        {" đã chia sẻ một bài viết"}
                                        <Share2 className="inline w-4 h-4 ml-1 text-[var(--muted-foreground)]" />
                                    </>
                                )}
                            </p>
                            <p className="text-xs">
                                {dayjs(currentPost.createdAt).fromNow()} {renderPrivacyIcon(currentPost.privacy)}
                            </p>
                            {currentPost.author?.mutualFriendsCount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {currentPost.author.mutualFriendsCount} bạn chung
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Show options menu if it's the user's own post OR if user is admin */}
                    {showMoreOptions && (
                        <div className="relative">
                            <button
                                aria-label="More options"
                                title="More options"
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
                                    {/* Only show edit button for own posts */}
                                    {isOwnPost && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEdit()
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--input)]"
                                        >
                                            ✏️ Chỉnh sửa
                                        </button>
                                    )}
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
                    )}
                </div>

                {/* Current post content (share comment) with truncation */}
                {currentPost.content && (
                    <div onClick={(e) => {
                        e.stopPropagation()
                        openModal()
                    }}>
                        <pre className={`text-sm break-words whitespace-pre-wrap
                            ${size === "compact" ? "gap-2 mb-1" : size === "large" ? "gap-4 mb-3" : "gap-3 mb-2"}`}>
                            {shouldTruncateContent(currentPost.content) && !isContentExpanded ? (
                                <>
                                    {renderTextWithLinks(getTruncatedContent(currentPost.content))}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setIsContentExpanded(true)
                                        }}
                                        className="text-blue-500 hover:text-blue-700 ml-2 text-sm"
                                    >
                                        Xem thêm
                                    </button>
                                </>
                            ) : (
                                <>
                                    {renderTextWithLinks(currentPost.content)}
                                    {shouldTruncateContent(currentPost.content) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setIsContentExpanded(false)
                                            }}
                                            className="text-blue-500 hover:text-blue-700 ml-2 text-sm"
                                        >
                                            Thu gọn
                                        </button>
                                    )}
                                </>
                            )}
                        </pre>
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
                            priority={isPriority}
                            onImageClick={handleImageClick}
                        />
                    </div>
                )}
                {!isAdmin &&
                    (<div className="flex mt-3 gap-4 text-[var(--muted-foreground)]">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleLikeToggle()
                        }}
                        className={`p-2 rounded-full hover:bg-[var(--input)] transition-colors ${isLiking ? 'opacity-70' : ''}`}
                        disabled={isLiking}
                        aria-label={optimisticLiked ? "Unlike post" : "Like post"}
                        title={optimisticLiked ? "Unlike post" : "Like post"}
                    >
                        <Heart className={`h-5 w-5 transition-colors ${optimisticLiked ? "fill-red-500 text-red-500" : ""}`} />
                    </button>

                    <button
                        onClick={handleMessageCircleClick}
                        className="p-2 rounded-full hover:bg-[var(--input)]"
                        aria-label="Comment on post"
                        title="Comment on post"
                    >
                        <MessageCircle className="h-5 w-5" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleShare()
                        }}
                        className="p-2 rounded-full hover:bg-[var(--input)]"
                        aria-label="Share post"
                        title="Share post"
                    >
                        <SendHorizonal className="h-5 w-5" />
                    </button>
                </div>)
                }

                <p className="text-xs mt-1">
                    {optimisticLikeCount} lượt thích
                </p>

                <button
                    className="text-xs mt-2 hover:underline"
                    onClick={(e) => {
                        e.stopPropagation()
                        openModal()
                    }}
                >
                    Xem tất cả {currentPost.commentCount || 0} bình luận
                </button>
            </Card>

            {/* Lazy loaded modals - only render when needed */}
            {showEditModal && isOwnPost && (
                <Suspense fallback={<div>Loading...</div>}>
                    <EditPostModal
                        isOpen={showEditModal}
                        onClose={() => setShowEditModal(false)}
                        post={currentPost}
                        onPostUpdated={handlePostUpdated}
                    />
                </Suspense>
            )}

            {/* Post Modal - only render when needed */}
            {isModalOpen && (
                <Suspense fallback={<div>Loading...</div>}>
                    <PostModal
                        post={currentPost}
                        liked={optimisticLiked}
                        likeCount={optimisticLikeCount}
                        activeIndex={activeImageIndex}
                        comments={comments}
                        loadingComments={loadingComments}
                        isOwnPost={isOwnPost}
                        isAdmin={isAdmin}
                        onClose={handleCloseModal}
                        onLikeToggle={handleLikeToggle}
                        onCommentSubmit={handleCommentSubmit}
                        onCommentFilterChange={handleCommentFilterChange}
                    />
                </Suspense>
            )}

            {/* Share Modal - only render when needed */}
            {showShareModal && (
                <Suspense fallback={<div>Loading...</div>}>
                    <SharePostModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        post={currentPost}
                    />
                </Suspense>
            )}
        </>
    )
})

export default PostCard