import Image from "next/image";
import { useCallback } from "react";
import {
  Heart,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Avatar from "../ui-components/Avatar";
import FilePreviewInChat from "../ui-components/FilePreviewInChat";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { getUserId } from "@/utils/axios";

const isVideo = (url = "") => /\.(mp4|webm|ogg)$/i.test(url);

// Admin check function
const isAdmin = () => {
  try {
    const userRole = localStorage.getItem('userRole')
    return userRole === 'ADMIN'
  } catch (error) {
    console.error('Error checking admin role:', error)
    return false
  }
}

// Media Display Component
export const MediaDisplay = ({ url, alt, className = "" }) =>
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

// Comment Actions Component - Memoized to prevent re-render
export const CommentActions = ({
  comment,
  onLike,
  onReply,
  onToggleReplies,
  showReplies,
  onDelete,
  canDeleteComment,
}) => {
  const handleLike = useCallback(() => {
    onLike(comment.id, comment.liked);
  }, [comment.id, comment.liked, onLike]);

  const handleReply = useCallback(() => {
    onReply(comment.id);
  }, [comment.id, onReply]);

  const handleToggleReplies = useCallback(() => {
    onToggleReplies(comment.id);
  }, [comment.id, onToggleReplies]);

  const handleDelete = useCallback(() => {
    onDelete(comment.id);
  }, [comment.id, onDelete]);

  return (
    <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
      <button
        className="hover:underline flex items-center gap-1 transition-colors"
        onClick={handleLike}
      >
        <Heart
          size={14}
          className={
            comment.liked ? "fill-red-500 text-red-500" : "hover:text-red-500"
          }
        />
        {comment.likeCount || 0}
      </button>

      <button
        className="hover:underline flex items-center gap-1"
        onClick={handleReply}
      >
        <MessageCircle size={14} />
        Trả lời
      </button>

      {(comment.replyCount || 0) > 0 && (
        <button
          className="hover:underline flex items-center gap-1 text-blue-500"
          onClick={handleToggleReplies}
        >
          {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {comment.replyCount} phản hồi
        </button>
      )}

      {canDeleteComment && (
        <button
          className="hover:underline text-red-500"
          onClick={handleDelete}
        >
          Xóa
        </button>
      )}
    </div>
  );
};

// Reply Form Component - Memoized
export const ReplyForm = ({
  commentId,
  authorName,
  onSubmit,
  onCancel,
  form,
}) => {
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.content.trim() && !form.file) {
      toast.error("Vui lòng nhập nội dung phản hồi");
      return;
    }
    onSubmit(form.content, form.file, commentId);
  }, [form.content, form.file, commentId, onSubmit]);

  return (
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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
};

// Single Comment Component - Memoized
export const Comment = ({
  comment,
  post,
  comments,
  onReply,
  replyingTo,
  onCancelReply,
  isOwnPost,
  handleReplySubmit,
  useForm,
}) => {
  // Kiểm tra xem comment có phải của user hiện tại không
  const currentUserId = getUserId();
  const isOwnComment = comment.author?.id === currentUserId;
  
  // Kiểm tra quyền xóa comment: nếu là comment của bản thân hoặc bài viết của bản thân hoặc là admin
  const canDeleteComment = isOwnComment || isOwnPost || isAdmin();
  
  const showReplies = comments.showReplies[comment.id];
  const isLoadingReplies = comments.loadingReplies[comment.id];
  const replies = comments.repliesData[comment.id];

  // Create a separate form instance for this comment's replies
  const replyForm = useForm(() => {});

  const onReplySubmit = useCallback(async (content, file, commentId) => {
    if (!content.trim() && !file) {
      toast.error("Vui lòng nhập nội dung phản hồi");
      return;
    }

    replyForm.isSubmitting = true;
    try {
      await handleReplySubmit(content, file, commentId);
      replyForm.reset();
    } catch (error) {
      console.error("Error in reply submit:", error);
    } finally {
      replyForm.isSubmitting = false;
    }
  }, [handleReplySubmit, replyForm]);

  return (
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
          showReplies={showReplies}
          onDelete={comments.deleteComment}
          canDeleteComment={canDeleteComment}
        />

        {/* Replies */}
        {showReplies && (
          <div className="mt-3 pl-4 border-l-2 border-[var(--border)]">
            {isLoadingReplies ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                Đang tải phản hồi...
              </p>
            ) : (
              <div className="space-y-3">
                {replies?.map((reply) => {
                  // Kiểm tra xem reply có phải của user hiện tại không
                  const isOwnReply = reply.author?.id === currentUserId;
                  
                  // Kiểm tra quyền xóa reply: nếu là reply của bản thân hoặc bài viết của bản thân hoặc là admin
                  const canDeleteReply = isOwnReply || isOwnPost || isAdmin();
                  
                  return (
                    <div key={reply.id} className="flex gap-2 text-sm">
                      <Avatar
                        src={reply.author?.profilePictureUrl}
                        alt={reply.author?.username}
                        size={24}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
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
                          
                          {/* Nút xóa cho reply nếu có quyền xóa */}
                          {canDeleteReply && (
                            <button
                              className="text-xs text-red-500 hover:underline ml-2"
                              onClick={() => comments.deleteReply && comments.deleteReply(reply.id)}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reply Form */}
        {replyingTo === comment.id && (
          <ReplyForm
            commentId={comment.id}
            authorName={comment.author?.givenName}
            onSubmit={onReplySubmit}
            onCancel={onCancelReply}
            form={replyForm}
          />
        )}
      </div>
    </div>
  );
};