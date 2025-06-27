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
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

const isVideo = (url = "") => /\.(mp4|webm|ogg)$/i.test(url);

// Hook for managing comments
const useComments = (initialComments, post) => {
  const [localComments, setLocalComments] = useState(initialComments);
  const [repliesData, setRepliesData] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});

  useEffect(() => {
    setLocalComments(initialComments);
  }, [initialComments]);

  const likeComment = async (commentId, isCurrentlyLiked) => {
    try {
      const endpoint = isCurrentlyLiked
        ? `/v1/comments/unlike/${commentId}`
        : `/v1/comments/like/${commentId}`;

      if (isCurrentlyLiked) {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint);
      }

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
    } catch (err) {
      toast.error("Lỗi khi thích bình luận");
    }
  };

  const toggleReplies = async (commentId) => {
    if (showReplies[commentId]) {
      setShowReplies((prev) => ({ ...prev, [commentId]: false }));
      return;
    }

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
  };

  const deleteComment = async (commentId) => {
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

  const addComment = (comment) => {
    setLocalComments((prev) => [comment, ...prev]);
  };

  const addReply = (commentId, reply) => {
    setLocalComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, replyCount: comment.replyCount + 1 }
          : comment
      )
    );

    if (showReplies[commentId]) {
      setRepliesData((prev) => ({
        ...prev,
        [commentId]: [reply, ...(prev[commentId] || [])],
      }));
    }
  };

  return {
    localComments,
    repliesData,
    showReplies,
    loadingReplies,
    likeComment,
    toggleReplies,
    deleteComment,
    addComment,
    addReply,
  };
};

// Hook for form management
const useForm = (onSubmit) => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const reset = () => {
    setContent("");
    removeFile();
  };

  const submit = async (e, ...args) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, file, ...args);
      reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    content,
    setContent,
    file,
    previewUrl,
    isSubmitting,
    handleFileChange,
    removeFile,
    submit,
  };
};

// Media Display Component
const MediaDisplay = ({ url, alt, className = "" }) =>
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

// Comment Actions Component
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

// Reply Form Component
const ReplyForm = ({
  commentId,
  authorName,
  onSubmit,
  onCancel,
  form,
}) => (
  <div className="mt-3 pl-4 border-l-2 border-[var(--border)]">
    {form.file && (
      <div className="mb-2">
        <FilePreviewInChat
          selectedFile={form.file}
          filePreview={form.previewUrl}
          onCancel={form.removeFile}
        />
      </div>
    )}

    <form
      onSubmit={(e) => form.submit(e, commentId)}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={`Trả lời ${authorName}...`}
          value={form.content}
          onChange={(e) => form.setContent(e.target.value)}
          className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          autoFocus
        />
        <label className="text-xs text-blue-500 cursor-pointer hover:underline">
          + File
          <input
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={form.handleFileChange}
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
          disabled={form.isSubmitting || (!form.content.trim() && !form.file)}
          className="text-xs text-blue-500 font-semibold hover:opacity-80 disabled:opacity-50"
        >
          {form.isSubmitting ? "Đang gửi..." : "Trả lời"}
        </button>
      </div>
    </form>
  </div>
);

// Single Comment Component
const Comment = ({
  comment,
  post,
  comments,
  onReply,
  replyingTo,
  onCancelReply,
  replyForm,
}) => (
  <div className="flex gap-3 text-sm">
    <Avatar
      src={comment.author?.profilePictureUrl}
      alt={comment.author?.username}
      size={32}
    />
    <div className="flex-1">
      <div className="flex justify-between">
        <p className="font-semibold">
          {comment.author?.givenName} {comment.author?.familyName}
        </p>
        <span className="text-xs text-[var(--muted-foreground)]">
          {dayjs(comment.createdAt).fromNow()}
        </span>
      </div>
      <p className="text-sm mb-1">{comment.content}</p>

      {comment.fileUrl && (
        <div className="mb-1">
          <MediaDisplay url={comment.fileUrl} alt="comment media" />
        </div>
      )}

      <CommentActions
        comment={comment}
        onLike={comments.likeComment}
        onReply={onReply}
        onToggleReplies={comments.toggleReplies}
        showReplies={comments.showReplies[comment.id]}
        onDelete={comments.deleteComment}
        isOwnComment={comment.author?.id === post.author.id}
      />

      {/* Replies */}
      {comments.showReplies[comment.id] && (
        <div className="mt-3 pl-4 border-l-2 border-[var(--border)]">
          {comments.loadingReplies[comment.id] ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Đang tải phản hồi...
            </p>
          ) : (
            <div className="space-y-3">
              {comments.repliesData[comment.id]?.map((reply) => (
                <div key={reply.id} className="flex gap-2 text-sm">
                  <Avatar
                    src={reply.author?.profilePictureUrl}
                    alt={reply.author?.username}
                    size={24}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-semibold text-xs">
                        {reply.author?.givenName} {reply.author?.familyName}
                      </p>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {dayjs(reply.createdAt).fromNow()}
                      </span>
                    </div>
                    <p className="text-xs mb-1">{reply.content}</p>
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
          onSubmit={async (content, file, commentId) => {
            const formData = new FormData();
            formData.append("originalCommentId", commentId);
            formData.append("content", content);
            if (file) formData.append("file", file);

            const res = await api.post(`/v1/comments/reply`, formData);
            comments.addReply(commentId, res.data);
            onCancelReply();
            toast.success("Đã trả lời bình luận");
          }}
          onCancel={onCancelReply}
          form={replyForm}
        />
      )}
    </div>
  </div>
);

// Media Carousel Component
const MediaCarousel = ({ media, page, setPage }) => {
  const [touchStartX, setTouchStartX] = useState(null);

  const showNext = () => {
    if (page.index < media.length - 1) {
      setPage({ index: page.index + 1, direction: 1 });
    }
  };

  const showPrev = () => {
    if (page.index > 0) {
      setPage({ index: page.index - 1, direction: -1 });
    }
  };

  const handleTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 50) showPrev();
    else if (deltaX < -50) showNext();
    setTouchStartX(null);
  };

  const currentMedia = media[page.index];

  return (
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
  );
};

// Main Post Modal Component
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
  const [replyingTo, setReplyingTo] = useState(null);

  const commentsManager = useComments(comments, post);

  const mainCommentForm = useForm(async (content, file) => {
    const formData = new FormData();
    formData.append("content", content);
    formData.append("postId", post.id);
    if (file) formData.append("file", file);

    const res = await api.post("/v1/comments", formData);
    if (onCommentSubmit) onCommentSubmit(res.data);
    commentsManager.addComment(res.data);
  });

  const replyForm = useForm(() => {});

  const handleReply = (commentId) => {
    setReplyingTo(commentId);
    replyForm.setContent("");
    replyForm.removeFile();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Shared content components
  const PostHeader = () => (
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
  );

  const PostContent = () => (
    <div className="p-4 border-b border-[var(--border)]">
      <p className="text-sm mb-4">{post.content}</p>
    </div>
  );

  const PostActions = () => (
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
  );

  const CommentsSection = () => (
    <div className="flex-1 p-4 space-y-2 overflow-y-auto">
      <p className="text-sm font-semibold">Bình luận</p>
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
              comments={commentsManager}
              onReply={handleReply}
              replyingTo={replyingTo}
              onCancelReply={handleCancelReply}
              replyForm={replyForm}
            />
          ))}
        </div>
      )}
    </div>
  );

  const CommentInput = () => (
    <>
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
        className="border-t border-[var(--border)] pt-2 flex items-center gap-2 p-4"
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
    </>
  );

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
            <PostHeader />
            <PostContent />
            <PostActions />
            <CommentsSection />
            <CommentInput />
          </div>
        )}

        {/* Layout for posts with media */}
        {hasMedia && (
          <>
            {/* Desktop Layout */}
            <div className="hidden md:flex md:w-2/3 md:h-full">
              <MediaCarousel media={media} page={page} setPage={setPage} />
            </div>

            {/* Sidebar - Desktop */}
            <div className="hidden md:flex md:flex-col md:w-1/3 md:h-full md:border-l md:border-[var(--border)]">
              <PostHeader />
              <PostContent />
              <PostActions />
              <CommentsSection />
              <CommentInput />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}