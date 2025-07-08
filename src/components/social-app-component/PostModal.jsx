"use client";

import { useState, useCallback, useMemo } from "react";
import { Heart, MessageCircle, SendHorizonal } from "lucide-react";
import Avatar from "../ui-components/Avatar";
import Modal from "../ui-components/Modal";
import FilePreviewInChat from "../ui-components/FilePreviewInChat";
import MediaCarousel from "../ui-components/MediaCarousel";
import { Comment } from "./Comment";
import { useRouter } from "next/navigation";
import { useComments, useForm } from "@/hooks/useComment";
import api from "@/utils/axios";
import toast from "react-hot-toast";

// Main Post Modal Component
export default function PostModal({
  post,
  liked,
  likeCount,
  comments = [],
  loadingComments = false,
  activeIndex = 0,
  isOwnPost,
  onClose,
  onLikeToggle,
  onCommentSubmit,
  onCommentUpdate,
}) {
  // Determine what content and media to display
  const isSharedPost = post?.sharedPost;
  const displayPost = isSharedPost ? post.originalPost : post;
    const router = useRouter()

  // Handle media from both regular posts and shared posts
  let media = [];
  if (isSharedPost && post.originalPost) {
    media = post.originalPost.files || post.originalPost.images || [];
  } else {
    media = post?.files || post?.images || [];
  }
  const hasMedia = Array.isArray(media) && media.length > 0;
  
  const [page, setPage] = useState({ index: activeIndex, direction: 0 });
  const [replyingTo, setReplyingTo] = useState(null);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isSharedContentExpanded, setIsSharedContentExpanded] = useState(false);
  
  console.log("PostModal initialized with post:", post);
  console.log("Media found:", media);
  console.log("Comments received:", comments);
  console.log("Post ID for comments:", post.id);
  console.log("Is shared post:", isSharedPost);
  if (isSharedPost) {
    console.log("Original post ID:", post.originalPost?.id);
  }
  const commentsManager = useComments(comments, post);
 const handleProfileClick = (e, post) => {
    e.stopPropagation() // Ngăn không cho bubble up tới card click
    router.push(`/profile/${post.author?.username}`)
  }
  // Function to detect and convert links in text
  const renderTextWithLinks = (text) => {
    if (!text) return text;
    
    // Regex to match URLs (including domain.extension pattern)
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
    
    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex) || [];
    
    return parts.map((part, index) => {
      if (index === parts.length - 1) {
        return part;
      }
      
      const url = matches[index];
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      
      return (
        <span key={index}>
          {part}
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>
        </span>
      );
    });
  };

  // Function to check if content should be truncated
  const shouldTruncateContent = (content, maxLength = 200) => {
    return content && content.length > maxLength;
  };

  // Function to get truncated content
  const getTruncatedContent = (content, maxLength = 200) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  // Handle reply submission
  const handleReplySubmit = useCallback(async (content, file, commentId) => {
    try {
      console.log("Submitting reply:", { content, file, commentId });
      
      const formData = new FormData();
      formData.append("originalCommentId", commentId);
      formData.append("content", content);
      if (file) {
        formData.append("file", file);
      }

      const res = await api.post(`/v1/comments/reply`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log("Reply response:", res.data);
      const newReply = res.data.body;
      
      // Add reply to local state
      commentsManager.addReply(commentId, newReply);
      
      // Close reply form
      setReplyingTo(null);
      
      toast.success("Đã trả lời bình luận");
    } catch (error) {
      console.error("Error submitting reply:", error);
      toast.error("Lỗi khi gửi phản hồi");
      throw error; // Re-throw so form can handle it
    }
  }, [commentsManager]);

  // Memoize the onSubmit function to prevent form re-creation
  const handleMainCommentSubmit = useCallback(async (content, file) => {
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("postId", post.id); // Always use the main post ID for comments
      if (file) formData.append("file", file);

      const res = await api.post("/v1/comments", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const newComment = res.data.body;

      // Call the parent callback if provided
      if (onCommentSubmit) onCommentSubmit(newComment);
      
      // Add to local comments state
      commentsManager.addComment(newComment);
      
      toast.success("Đã gửi bình luận");
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Lỗi khi gửi bình luận");
      throw error; // Re-throw to be handled by the form hook
    }
  }, [post.id, onCommentSubmit, commentsManager]);

  const mainCommentForm = useForm(handleMainCommentSubmit);

  const handleReply = useCallback((commentId) => {
    console.log("Starting reply to comment:", commentId);
    setReplyingTo(commentId);
  }, []);

  const handleCancelReply = useCallback(() => {
    console.log("Cancelling reply");
    setReplyingTo(null);
  }, []);

  // Memoized components to prevent unnecessary re-renders
  const PostHeader = useMemo(() => (
    <div className="flex flex-col gap-3 p-4 border-b border-[var(--border)]"
                onClick={handleProfileClick}
>
    
      {/* Show the person who shared the post first (if it's a shared post) */}
      {isSharedPost && (
        <div className="flex items-center gap-3"
                  onClick={(e)=>handleProfileClick(e,post)}>
          <Avatar
            src={post.author?.profilePictureUrl}
            alt={post.author?.username}
          />
          <div>
            <p className="font-semibold text-sm">
              {post.author?.givenName} {post.author?.familyName}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Đã chia sẻ • {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
      
      {/* Show shared post content if exists */}
      {isSharedPost && post.content && (
        <div className="ml-12">
          <div className="text-sm">
            {shouldTruncateContent(post.content) && !isSharedContentExpanded ? (
              <>
                {renderTextWithLinks(getTruncatedContent(post.content))}
                <button
                  onClick={() => setIsSharedContentExpanded(true)}
                  className="text-blue-500 hover:text-blue-700 ml-2 text-sm"
                >
                  Xem thêm
                </button>
              </>
            ) : (
              <>
                {renderTextWithLinks(post.content)}
                {shouldTruncateContent(post.content) && (
                  <button
                    onClick={() => setIsSharedContentExpanded(false)}
                    className="text-blue-500 hover:text-blue-700 ml-2 text-sm"
                  >
                    Thu gọn
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Show original post author */}
      <div className={`flex items-center gap-3 ${isSharedPost ? 'ml-4 p-3 border border-[var(--border)] rounded-lg bg-[var(--muted)]/20' : ''}`}
                  onClick={(e)=>handleProfileClick(e,displayPost)}
>
        <Avatar
          src={displayPost.author?.profilePictureUrl}
          alt={displayPost.author?.username}
        />
        <div>
          <p className="font-semibold text-sm">
            {displayPost.author?.givenName} {displayPost.author?.familyName}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {new Date(displayPost.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  ), [post, displayPost, isSharedPost, isSharedContentExpanded]);

  const PostContent = useMemo(() => {
    if (!displayPost?.content) return null;
    
    return (
      <div className={`p-4 border-b border-[var(--border)] ${isSharedPost ? 'ml-4 mr-4 p-3 border border-[var(--border)] rounded-lg bg-[var(--muted)]/20' : ''}`}>
        <div className="text-sm mb-4">
          {shouldTruncateContent(displayPost.content) && !isContentExpanded ? (
            <>
              {renderTextWithLinks(getTruncatedContent(displayPost.content))}
              <button
                onClick={() => setIsContentExpanded(true)}
                className="text-blue-500 hover:text-blue-700 ml-2 text-sm"
              >
                Xem thêm
              </button>
            </>
          ) : (
            <>
              {renderTextWithLinks(displayPost.content)}
              {shouldTruncateContent(displayPost.content) && (
                <button
                  onClick={() => setIsContentExpanded(false)}
                  className="text-blue-500 hover:text-blue-700 ml-2 text-sm"
                >
                  Thu gọn
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }, [displayPost?.content, isSharedPost, isContentExpanded]);

  const PostActions = useMemo(() => (
    <div className="border-b border-[var(--border)]">
      <div className="flex gap-4 text-[var(--muted-foreground)] items-center p-3">
        <button onClick={onLikeToggle}>
          <Heart
            className={`h-5 w-5 ${
              liked ? "fill-red-500 text-red-500" : ""
            }`}
          />
        </button>
        <button>
          <MessageCircle className="h-5 w-5" />
        </button>
        <button>
          <SendHorizonal className="h-5 w-5" />
        </button>
      </div>
      <p className="text-xs px-4 pb-2">{likeCount} lượt thích</p>
    </div>
  ), [liked, likeCount, onLikeToggle]);

  // Memoized comments section
  const CommentsSection = useMemo(() => (
    <div className="p-4 space-y-2">
      <p className="text-sm font-semibold">Bình luận ({commentsManager.localComments.length})</p>
      {loadingComments ? (
        <p className="text-xs text-muted">Đang tải bình luận...</p>
      ) : commentsManager.localComments.length === 0 ? (
        <p className="text-xs text-muted">Chưa có bình luận nào</p>
      ) : (
        <div className="space-y-4 mb-4">
          {commentsManager.localComments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              post={post}
              isOwnPost={isOwnPost}
              comments={commentsManager}
              onReply={handleReply}
              replyingTo={replyingTo}
              onCancelReply={handleCancelReply}
              handleReplySubmit={handleReplySubmit}
              useForm={useForm}
            />
          ))}
        </div>
      )}
    </div>
  ), [loadingComments, commentsManager.localComments, post, commentsManager, handleReply, replyingTo, handleCancelReply, handleReplySubmit]);

  // Memoized comment input
  const CommentInput = useMemo(() => (
    <div className="flex-shrink-0 bg-[var(--card)] border-t border-[var(--border)]">
      {mainCommentForm.file && (
        <div className="p-4">
          <FilePreviewInChat
            selectedFile={mainCommentForm.file}
            filePreview={mainCommentForm.previewUrl}
            onCancel={mainCommentForm.removeFile}
          />
        </div>
      )}

      <form
        onSubmit={mainCommentForm.submit}
        className="flex items-center gap-2 p-4"
      >
        <input
          type="text"
          placeholder="Viết bình luận..."
          value={mainCommentForm.content}
          onChange={(e) => mainCommentForm.setContent(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm p-2"
        />
        <label className="text-sm text-blue-500 cursor-pointer hover:underline">
          + Ảnh
          <input
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={mainCommentForm.handleFileChange}
          />
        </label>
        <button
          type="submit"
          disabled={
            mainCommentForm.isSubmitting ||
            (!mainCommentForm.content.trim() && !mainCommentForm.file)
          }
          className="text-blue-500 text-sm font-semibold hover:opacity-80 disabled:opacity-50"
        >
          {mainCommentForm.isSubmitting ? "Đang gửi..." : "Gửi"}
        </button>
      </form>
    </div>
  ), [mainCommentForm]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size={hasMedia ? undefined : "small"}
    >
      <div
        className={`flex flex-col w-full ${
          hasMedia ? "md:flex-row h-[90vh]" : "h-[80vh]"
        } bg-[var(--card)] text-[var(--card-foreground)] rounded-xl overflow-hidden`}
      >
        {/* Layout for posts without media - Updated for full scrollable content */}
        {!hasMedia && (
          <div className="flex flex-col w-full h-full">
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
              {PostHeader}
              {PostContent}
              {PostActions}
              {CommentsSection}
            </div>
            {/* Fixed comment input at bottom */}
            {CommentInput}
          </div>
        )}

        {/* Layout for posts with media */}
        {hasMedia && (
          <>
            {/* Desktop Layout */}
            <div className="hidden md:flex md:w-3/5 md:h-full">
              <MediaCarousel media={media} page={page} setPage={setPage} />
            </div>

            {/* Sidebar - Desktop */}
            <div className="hidden md:flex md:flex-col md:w-2/5 md:h-full md:border-l md:border-[var(--border)]">
              <div className="flex-1 overflow-y-auto">
                {PostHeader}
                {PostContent}
                {PostActions}
                {CommentsSection}
              </div>
              {CommentInput}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}