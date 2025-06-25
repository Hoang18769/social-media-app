"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  SendHorizonal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Avatar from "../ui-components/Avatar";
import Modal from "../ui-components/Modal";
import FilePreviewInChat from "../ui-components/FilePreviewInChat";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import api from "@/utils/axios";
import toast from "react-hot-toast";

const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const isVideo = (url = "") => /\.(mp4|webm|ogg)$/i.test(url);

// Component for Comment Actions
const CommentActions = ({
  comment,
  onLike,
  onReply,
  onToggleReplies,
  showReplies,
  onDelete,
  isOwnComment,
}) => (
  <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
    <button
      className="hover:underline flex items-center gap-1 transition-colors"
      onClick={() => onLike(comment.id, comment.liked)}
    >
      <Heart
        size={14}
        className={
          comment.liked ? "fill-red-500 text-red-500" : "hover:text-red-500"
        }
      />
      {comment.likeCount}
    </button>

    <button
      className="hover:underline flex items-center gap-1"
      onClick={() => onReply(comment.id)}
    >
      <MessageCircle size={14} />
      Trả lời
    </button>

    {comment.replyCount > 0 && (
      <button
        className="hover:underline flex items-center gap-1 text-blue-500"
        onClick={() => onToggleReplies(comment.id)}
      >
        {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {comment.replyCount} phản hồi
      </button>
    )}

    {isOwnComment && (
      <button
        className="hover:underline text-red-500"
        onClick={() => onDelete(comment.id)}
      >
        Xóa
      </button>
    )}
  </div>
);

// Component for Media Display
const MediaDisplay = ({ url, alt, className }) =>
  isVideo(url) ? (
    <video
      controls
      className={`rounded-lg max-h-60 w-full object-contain ${className}`}
      src={url}
    />
  ) : (
    <Image
      src={url}
      alt={alt}
      width={300}
      height={200}
      className={`rounded-lg max-h-60 w-auto object-contain ${className}`}
    />
  );

// Component for Reply Form
const ReplyForm = ({
  commentId,
  authorName,
  content,
  setContent,
  file,
  setFile,
  previewUrl,
  setPreviewUrl,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleFileRemove = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="mt-3 pl-4 border-l-2 border-[var(--border)]">
      {file && (
        <div className="mb-2">
          <FilePreviewInChat
            selectedFile={file}
            filePreview={previewUrl}
            onCancel={handleFileRemove}
          />
        </div>
      )}

      <form
        onSubmit={(e) => onSubmit(e, commentId)}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Trả lời ${authorName}...`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            autoFocus
          />
          <label className="text-xs text-blue-500 cursor-pointer hover:underline">
            + File
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={handleFileChange}
            />
          </label>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && !file)}
            className="text-xs text-blue-500 font-semibold hover:opacity-80 disabled:opacity-50"
          >
            {isSubmitting ? "Đang gửi..." : "Trả lời"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function PostModal({
  post,
  liked,
  likeCount,
  comments = [],
  loadingComments = false,
  activeIndex = 0,
  onClose,
  onLikeToggle,
  onCommentSubmit,
  onCommentUpdate,
}) {
  const media = post?.files || post?.images || [];
  const hasMedia = Array.isArray(media) && media.length > 0;

  const [page, setPage] = useState({ index: activeIndex, direction: 0 });
  const [touchStartX, setTouchStartX] = useState(null);

  // Main comment form state
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comments state
  const [localComments, setLocalComments] = useState(comments);
  const [repliesData, setRepliesData] = useState({}); // Store replies for each comment
  const [showReplies, setShowReplies] = useState({}); // Track which replies are shown
  const [loadingReplies, setLoadingReplies] = useState({}); // Track loading state for replies

  // Reply form state
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [replyPreviewUrl, setReplyPreviewUrl] = useState(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Update local comments when comments prop changes
  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  // Navigation functions
  const showNext = () => {
    if (hasMedia && page.index < media.length - 1) {
      setPage({ index: page.index + 1, direction: 1 });
    }
  };

  const showPrev = () => {
    if (hasMedia && page.index > 0) {
      setPage({ index: page.index - 1, direction: -1 });
    }
  };

  // Touch handlers
  const handleTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStartX === null || !hasMedia) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 50) showPrev();
    else if (deltaX < -50) showNext();
    setTouchStartX(null);
  };

  // File handlers for main comment
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  // Main comment submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("content", content);
      formData.append("postId", post.id);
      if (file) formData.append("file", file);

      const res = await api.post("/v1/comments", formData);
      if (onCommentSubmit) onCommentSubmit(res.data);

      setLocalComments((prev) => [res.data, ...prev]);
      setContent("");
      handleRemoveFile();
    } catch (err) {
      toast.error("Lỗi gửi bình luận");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Comment like handler
  const handleCommentLike = async (commentId, isCurrentlyLiked) => {
    try {
      const endpoint = isCurrentlyLiked
        ? `/v1/comments/unlike/${commentId}`
        : `/v1/comments/like/${commentId}`;

      if (isCurrentlyLiked) {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint);
      }

      // Update local state
      setLocalComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                liked: !isCurrentlyLiked,
                likeCount: isCurrentlyLiked
                  ? comment.likeCount - 1
                  : comment.likeCount + 1,
              }
            : comment
        )
      );

      if (onCommentUpdate) {
        onCommentUpdate(commentId, !isCurrentlyLiked);
      }
    } catch (err) {
      toast.error("Lỗi khi thích bình luận");
    }
  };

  // Reply handlers
  const handleReplyClick = (commentId) => {
    setReplyingTo(commentId);
    setReplyContent("");
    setReplyFile(null);
    setReplyPreviewUrl(null);
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
    setReplyContent("");
    setReplyFile(null);
    setReplyPreviewUrl(null);
  };

  const handleReplySubmit = async (e, commentId) => {
    e.preventDefault();
    if (!replyContent.trim() && !replyFile) return;

    try {
      setIsSubmittingReply(true);
      const formData = new FormData();
      formData.append("originalCommentId", commentId);
      formData.append("content", replyContent);
      if (replyFile) formData.append("file", replyFile);

      const res = await api.post(`/v1/comments/reply`, formData);

      // Update reply count
      setLocalComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, replyCount: comment.replyCount + 1 }
            : comment
        )
      );

      // Add to replies data if currently showing replies
      if (showReplies[commentId]) {
        setRepliesData((prev) => ({
          ...prev,
          [commentId]: [res.data, ...(prev[commentId] || [])],
        }));
      }

      handleReplyCancel();
      toast.success("Đã trả lời bình luận");
    } catch (err) {
      toast.error("Lỗi khi trả lời bình luận");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Toggle replies visibility
  const handleToggleReplies = async (commentId) => {
    const isCurrentlyShowing = showReplies[commentId];

    if (isCurrentlyShowing) {
      // Hide replies
      setShowReplies((prev) => ({ ...prev, [commentId]: false }));
    } else {
      // Show replies - fetch if not already loaded
      if (!repliesData[commentId]) {
        setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));
        try {
          const res = await api.get(`/v1/comments/of-comment/${commentId}`);
          setRepliesData((prev) => ({ ...prev, [commentId]: res.data.body }));
        } catch (err) {
          toast.error("Lỗi tải phản hồi");
          return;
        } finally {
          setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
        }
      }
      setShowReplies((prev) => ({ ...prev, [commentId]: true }));
    }
  };
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) return;

    try {
      await api.delete(`/v1/comments/${commentId}`);
      setLocalComments((prev) =>
        prev.filter((comment) => comment.id !== commentId)
      );
      toast.success("Đã xóa bình luận");
    } catch (err) {
      toast.error("Lỗi khi xóa bình luận");
    }
  };

  const currentMedia = hasMedia ? media[page.index] : null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size={hasMedia ? undefined : "small"}
    >
      <div
        className={`flex flex-col w-full ${
          hasMedia ? "md:flex-row h-[90vh]" : "h-auto max-h-[80vh]"
        } bg-[var(--card)] text-[var(--card-foreground)] rounded-xl overflow-hidden`}
      >
        {/* Layout for posts without media */}
        {!hasMedia && (
          <div className="flex flex-col w-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
              <Avatar
                src={post.author?.profilePictureUrl}
                alt={post.author?.username}
              />
              <div>
                <p className="font-semibold text-sm">
                  {post.author?.givenName} {post.author?.familyName}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm mb-4">{post.content}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 text-[var(--muted-foreground)] p-4 border-b border-[var(--border)]">
              <div>
                <button onClick={onLikeToggle}>
                  <Heart
                    className={`h-5 w-5 ${
                      liked ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                </button>
              </div>
              <button>
                <MessageCircle className="h-5 w-5" />
              </button>
              <button>
                <SendHorizonal className="h-5 w-5" />
              </button>
            </div>
                            <p className="text-xs">{likeCount} lượt thích</p>


            {/* Comments */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              <p className="text-sm font-semibold">Bình luận</p>
              {loadingComments ? (
                <p className="text-xs text-muted">Đang tải bình luận...</p>
              ) : localComments.length === 0 ? (
                <p className="text-xs text-muted">Chưa có bình luận nào</p>
              ) : (
                <div className="space-y-4 mb-4">
                  {localComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                      <Avatar
                        src={comment.author?.profilePictureUrl}
                        alt={comment.author?.username}
                        size={32}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-semibold">
                            {comment.author?.givenName}{" "}
                            {comment.author?.familyName}
                          </p>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {dayjs(comment.createdAt).fromNow()}
                          </span>
                        </div>
                        <p className="text-sm mb-1">{comment.content}</p>

                        {comment.fileUrl && (
                          <div className="mb-1">
                            <MediaDisplay
                              url={comment.fileUrl}
                              alt="comment media"
                            />
                          </div>
                        )}

                        <CommentActions
                          comment={comment}
                          onLike={handleCommentLike}
                          onReply={handleReplyClick}
                          onToggleReplies={handleToggleReplies}
                          showReplies={showReplies[comment.id]}
                          onDelete={handleDeleteComment}
                          isOwnComment={comment.author?.id === post.author.id}
                        />

                        {/* Replies */}
                        {showReplies[comment.id] && (
                          <div className="mt-3 pl-4 border-l-2 border-[var(--border)]">
                            {loadingReplies[comment.id] ? (
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Đang tải phản hồi...
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {repliesData[comment.id]?.map((reply) => (
                                  <div
                                    key={reply.id}
                                    className="flex gap-2 text-sm"
                                  >
                                    <Avatar
                                      src={reply.author?.profilePictureUrl}
                                      alt={reply.author?.username}
                                      size={24}
                                    />
                                    <div className="flex-1">
                                      <div className="flex justify-between">
                                        <p className="font-semibold text-xs">
                                          {reply.author?.givenName}{" "}
                                          {reply.author?.familyName}
                                        </p>
                                        <span className="text-xs text-[var(--muted-foreground)]">
                                          {dayjs(reply.createdAt).fromNow()}
                                        </span>
                                      </div>
                                      <p className="text-xs mb-1">
                                        {reply.content}
                                      </p>
                                      {reply.fileUrl && (
                                        <div className="mb-1">
                                          <MediaDisplay
                                            url={reply.fileUrl}
                                            alt="reply media"
                                            className="max-h-40"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <ReplyForm
                            commentId={comment.id}
                            authorName={comment.author?.givenName}
                            content={replyContent}
                            setContent={setReplyContent}
                            file={replyFile}
                            setFile={setReplyFile}
                            previewUrl={replyPreviewUrl}
                            setPreviewUrl={setReplyPreviewUrl}
                            isSubmitting={isSubmittingReply}
                            onSubmit={handleReplySubmit}
                            onCancel={handleReplyCancel}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* File Preview */}
            {file && (
              <div className="p-4">
                <FilePreviewInChat
                  selectedFile={file}
                  filePreview={previewUrl}
                  onCancel={handleRemoveFile}
                />
              </div>
            )}

            {/* Comment input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-[var(--border)] pt-2 flex items-center gap-2 p-4"
            >
              <input
                type="text"
                placeholder="Viết bình luận..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm p-2"
              />
              <label className="text-sm text-blue-500 cursor-pointer hover:underline">
                + Ảnh
                <input
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={handleFileChange}
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-blue-500 text-sm font-semibold hover:opacity-80"
              >
                Gửi
              </button>
            </form>
          </div>
        )}

        {/* Layout for posts with media */}
        {hasMedia && (
          <>
            {/* Desktop Layout */}
            <div className="hidden md:flex md:w-2/3 md:h-full">
              {/* Media section */}
              <div
                className="relative bg-black overflow-hidden w-full"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <AnimatePresence initial={false} custom={page.direction}>
                  <motion.div
                    key={page.index}
                    className="absolute inset-0"
                    custom={page.direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                  >
                    {isVideo(currentMedia) ? (
                      <video
                        autoPlay
                        controls
                        className="w-full h-full object-contain"
                        src={currentMedia}
                      />
                    ) : (
                      <Image
                        src={currentMedia}
                        alt={`Post media ${page.index + 1}`}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {page.index > 0 && (
                  <button
                    className="absolute top-1/2 left-2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
                    onClick={showPrev}
                  >
                    <ChevronLeft />
                  </button>
                )}
                {page.index < media.length - 1 && (
                  <button
                    className="absolute top-1/2 right-2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
                    onClick={showNext}
                  >
                    <ChevronRight />
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar - Desktop */}
            <div className="hidden md:flex md:flex-col md:w-1/3 md:h-full md:border-l md:border-[var(--border)]">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
                <Avatar
                  src={post.author?.profilePictureUrl}
                  alt={post.author?.username}
                />
                <div>
                  <p className="font-semibold text-sm">
                    {post.author?.givenName} {post.author?.familyName}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 border-b border-[var(--border)]">
                <p className="text-sm mb-4">{post.content}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-4 text-[var(--muted-foreground)] p-4 border-b border-[var(--border)]">
                <div>
                  <button onClick={onLikeToggle}>
                    <Heart
                      className={`h-5 w-5 ${
                        liked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </button>
                  <p className="text-xs">{likeCount} lượt thích</p>
                </div>
                <button>
                  <MessageCircle className="h-5 w-5" />
                </button>
                <button>
                  <SendHorizonal className="h-5 w-5" />
                </button>
              </div>

              {/* Comments */}
              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                <p className="text-sm font-semibold">Bình luận</p>
                {loadingComments ? (
                  <p className="text-xs text-muted">Đang tải bình luận...</p>
                ) : localComments.length === 0 ? (
                  <p className="text-xs text-muted">Chưa có bình luận nào</p>
                ) : (
                  <div className="space-y-4 mb-4">
                    {localComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 text-sm">
                        <Avatar
                          src={comment.author?.profilePictureUrl}
                          alt={comment.author?.username}
                          size={32}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <p className="font-semibold">
                              {comment.author?.givenName}{" "}
                              {comment.author?.familyName}
                            </p>
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {dayjs(comment.createdAt).fromNow()}
                            </span>
                          </div>
                          <p className="text-sm mb-1">{comment.content}</p>

                          {comment.fileUrl && (
                            <div className="mb-1">
                              <MediaDisplay
                                url={comment.fileUrl}
                                alt="comment media"
                              />
                            </div>
                          )}

                          <CommentActions
                            comment={comment}
                            onLike={handleCommentLike}
                            onReply={handleReplyClick}
                            onToggleReplies={handleToggleReplies}
                            showReplies={showReplies[comment.id]}
                            onDelete={handleDeleteComment}
                            isOwnComment={comment.author?.id === post.author.id}
                          />

                          {/* Replies */}
                          {showReplies[comment.id] && (
                            <div className="mt-3 pl-4 border-l-2 border-[var(--border)]">
                              {loadingReplies[comment.id] ? (
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  Đang tải phản hồi...
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {repliesData[comment.id]?.map((reply) => (
                                    <div
                                      key={reply.id}
                                      className="flex gap-2 text-sm"
                                    >
                                      <Avatar
                                        src={reply.author?.profilePictureUrl}
                                        alt={reply.author?.username}
                                        size={24}
                                      />
                                      <div className="flex-1">
                                        <div className="flex justify-between">
                                          <p className="font-semibold text-xs">
                                            {reply.author?.givenName}{" "}
                                            {reply.author?.familyName}
                                          </p>
                                          <span className="text-xs text-[var(--muted-foreground)]">
                                            {dayjs(reply.createdAt).fromNow()}
                                          </span>
                                        </div>
                                        <p className="text-xs mb-1">
                                          {reply.content}
                                        </p>
                                        {reply.fileUrl && (
                                          <div className="mb-1">
                                            <MediaDisplay
                                              url={reply.fileUrl}
                                              alt="reply media"
                                              className="max-h-40"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Reply Form */}
                          {replyingTo === comment.id && (
                            <ReplyForm
                              commentId={comment.id}
                              authorName={comment.author?.givenName}
                              content={replyContent}
                              setContent={setReplyContent}
                              file={replyFile}
                              setFile={setReplyFile}
                              previewUrl={replyPreviewUrl}
                              setPreviewUrl={setReplyPreviewUrl}
                              isSubmitting={isSubmittingReply}
                              onSubmit={handleReplySubmit}
                              onCancel={handleReplyCancel}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File Preview */}
              {file && (
                <div className="p-4">
                  <FilePreviewInChat
                    selectedFile={file}
                    filePreview={previewUrl}
                    onCancel={handleRemoveFile}
                  />
                </div>
              )}

              {/* Comment input */}
              <form
                onSubmit={handleSubmit}
                className="border-t border-[var(--border)] pt-2 flex items-center gap-2 p-4"
              >
                <input
                  type="text"
                  placeholder="Viết bình luận..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm p-2"
                />
                <label className="text-sm text-blue-500 cursor-pointer hover:underline">
                  + Ảnh
                  <input
                    type="file"
                    accept="image/*,video/*"
                    hidden
                    onChange={handleFileChange}
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting || (!content.trim() && !file)}
                  className="text-blue-500 text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
