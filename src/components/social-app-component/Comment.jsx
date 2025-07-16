import Image from "next/image";
import { useCallback, useState } from "react";
import {
    Heart,
    MessageCircle,
    ChevronDown,
    ChevronUp,
    Edit,
    Check,
    X,
} from "lucide-react";
import Avatar from "../ui-components/Avatar";
import FilePreviewInChat from "../ui-components/FilePreviewInChat";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import toast from "react-hot-toast";
import { getUserId } from "@/utils/axios";
import {renderTextWithLinks} from "@/hooks/renderTextWithLinks";
// Configure dayjs with relativeTime plugin
dayjs.extend(relativeTime);

const isVideo = (url = "") => /\.(mp4|webm|ogg)$/i.test(url);

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

// Edit Comment Form Component
export const EditCommentForm = ({
                                    comment,
                                    onSave,
                                    onCancel,
                                    isReply = false,
                                }) => {
    const [editContent, setEditContent] = useState(comment.content);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!editContent.trim()) {
            toast.error("Nội dung không được để trống");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(comment.id, editContent);
        } catch (error) {
            console.error("Error saving edit:", error);
        } finally {
            setIsSubmitting(false);
        }
    }, [editContent, comment.id, onSave]);

    return (
        <div className="mt-2">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={`bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none ${
                isReply ? 'text-xs' : 'text-sm'
            }`}
            rows={3}
            autoFocus
            style={{ minHeight: '60px' }}
        />
                <div className="flex items-center gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
                    >
                        <X size={12} />
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !editContent.trim()}
                        className="text-xs text-blue-500 font-semibold hover:opacity-80 disabled:opacity-50 flex items-center gap-1"
                    >
                        <Check size={12} />
                        {isSubmitting ? "Đang lưu..." : "Lưu"}
                    </button>
                </div>
            </form>
        </div>
    );
};

// Comment Actions Component - Updated with Edit button
export const CommentActions = ({
                                   comment,
                                   onLike,
                                   onReply,
                                   onToggleReplies,
                                   onEdit,
                                   showReplies,
                                   onDelete,
                                   canDeleteComment,
                                   canEditComment,
                                   isReply = false,
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

    const handleEdit = useCallback(() => {
        onEdit(comment.id);
    }, [comment.id, onEdit]);

    const handleDelete = useCallback(() => {
        if (window.confirm(isReply ? "Bạn có chắc muốn xóa phản hồi này?" : "Bạn có chắc muốn xóa bình luận này?")) {
            onDelete(comment.id);
        }
    }, [comment.id, onDelete, isReply]);

    return (
        <div className={`flex items-center gap-4 text-xs text-[var(--muted-foreground)] ${isReply ? 'gap-2' : ''}`}>
            <button
                className="hover:underline flex items-center gap-1 transition-colors"
                onClick={handleLike}
            >
                <Heart
                    size={isReply ? 12 : 14}
                    className={
                        comment.liked ? "fill-red-500 text-red-500" : "hover:text-red-500"
                    }
                />
                {comment.likeCount || 0}
            </button>

            {!isReply && (
                <button
                    className="hover:underline flex items-center gap-1"
                    onClick={handleReply}
                >
                    <MessageCircle size={14} />
                    Trả lời
                </button>
            )}

            {!isReply && (comment.replyCount || 0) > 0 && (
                <button
                    className="hover:underline flex items-center gap-1 text-blue-500"
                    onClick={handleToggleReplies}
                >
                    {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {comment.replyCount} phản hồi
                </button>
            )}

            {canEditComment && (
                <button
                    className="hover:underline text-blue-500 flex items-center gap-1"
                    onClick={handleEdit}
                >
                    <Edit size={isReply ? 12 : 14} />
                    Sửa
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

// Single Comment Component - Updated with Edit functionality
export const Comment = ({
                            comment,
                            comments,
                            onReply,
                            replyingTo,
                            onCancelReply,
                            isOwnPost,
                            handleReplySubmit,
                            useForm,
                        }) => {
    // State for editing
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingReplyId, setEditingReplyId] = useState(null);

    // Kiểm tra xem comment có phải của user hiện tại không
    const currentUserId = getUserId();
    const isOwnComment = comment.author?.id === currentUserId;

    // Kiểm tra quyền xóa comment: nếu là comment của bản thân hoặc bài viết của bản thân
    const canDeleteComment = isOwnComment || isOwnPost;

    // Kiểm tra quyền sửa comment: chỉ chủ comment mới được sửa
    const canEditComment = isOwnComment;

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

    // Handle reply deletion
    const handleDeleteReply = useCallback(async (replyId) => {
        try {
            if (comments.deleteComment) {
                await comments.deleteComment(replyId);
            } else {
                console.warn("deleteComment function not provided");
                toast.error("Không thể xóa phản hồi");
            }
        } catch (error) {
            console.error("Error deleting reply:", error);
            toast.error("Có lỗi xảy ra khi xóa phản hồi");
        }
    }, [comments.deleteComment]);

    // Handle reply like with proper optimistic update
    const handleLikeReply = useCallback(async (replyId, isLiked) => {
        console.log("handleLikeReply called:", { replyId, isLiked });
        try {
            await comments.likeComment(replyId, isLiked);
            console.log("Reply like successful");
        } catch (error) {
            console.error("Error liking reply:", error);
            toast.error("Có lỗi xảy ra khi thích phản hồi");
        }
    }, [comments.likeComment]);

    // Handle edit comment
    const handleEditComment = useCallback((commentId) => {
        setEditingCommentId(commentId);
        setEditingReplyId(null); // Close any reply editing
    }, []);

    const handleEditReply = useCallback((replyId) => {
        setEditingReplyId(replyId);
        setEditingCommentId(null); // Close any comment editing
    }, []);

    // Handle save edit
    const handleSaveEdit = useCallback(async (commentId, newContent) => {
        try {
            await comments.editComment(commentId, newContent);
            setEditingCommentId(null);
            setEditingReplyId(null);
        } catch (error) {
            console.error("Error saving edit:", error);
        }
    }, [comments.editComment]);

    // Handle cancel edit
    const handleCancelEdit = useCallback(() => {
        setEditingCommentId(null);
        setEditingReplyId(null);
    }, []);

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

                {/* Comment Content - Edit mode or display mode */}
                {editingCommentId === comment.id ? (
                    <EditCommentForm
                        comment={comment}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                        isReply={false}
                    />
                ) : (
                    <div className="text-sm mb-1 whitespace-pre-wrap break-words">
                        {renderTextWithLinks(comment.content)}
                    </div>
                )}

                {comment.fileUrl && (
                    <div className="mb-1">
                        <MediaDisplay url={comment.fileUrl} alt="comment media" />
                    </div>
                )}

                {/* Main comment actions with edit functionality */}
                <CommentActions
                    comment={comment}
                    onLike={comments.likeComment}
                    onReply={onReply}
                    onToggleReplies={comments.toggleReplies}
                    onEdit={handleEditComment}
                    showReplies={showReplies}
                    onDelete={comments.deleteComment}
                    canDeleteComment={canDeleteComment}
                    canEditComment={canEditComment}
                    isReply={false}
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

                                    // Kiểm tra quyền xóa reply: nếu là reply của bản thân hoặc bài viết của bản thân
                                    const canDeleteReply = isOwnReply || isOwnPost;

                                    // Kiểm tra quyền sửa reply: chỉ chủ reply mới được sửa
                                    const canEditReply = isOwnReply;

                                    return (
                                        <div key={reply.id} className="flex gap-2 text-sm">
                                            <Avatar
                                                src={reply.author?.profilePictureUrl}
                                                alt={reply.author?.username}
                                                size={24}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between">
                                                    <p className="font-semibold text-xs">
                                                        {reply.author?.givenName} {reply.author?.familyName}
                                                    </p>
                                                    <span className="text-xs text-[var(--muted-foreground)]">
                {dayjs(reply.createdAt).fromNow()}
              </span>
                                                </div>

                                                {/* Reply Content - Edit mode or display mode */}
                                                {editingReplyId === reply.id ? (
                                                    <EditCommentForm
                                                        comment={reply}
                                                        onSave={handleSaveEdit}
                                                        onCancel={handleCancelEdit}
                                                        isReply={true}
                                                    />
                                                ) : (
                                                    <div className="text-xs mb-1 whitespace-pre-wrap break-words overflow-hidden">
                                                        {renderTextWithLinks(reply.content)}
                                                    </div>
                                                )}

                                                {reply.fileUrl && (
                                                    <div className="mb-1">
                                                        <MediaDisplay
                                                            url={reply.fileUrl}
                                                            alt="reply media"
                                                            className="max-h-40"
                                                        />
                                                    </div>
                                                )}

                                                {/* Reply Actions with edit functionality */}
                                                <CommentActions
                                                    comment={reply}
                                                    onLike={handleLikeReply}
                                                    onReply={() => {}} // Không cho phép reply trên reply
                                                    onToggleReplies={() => {}} // Không có nested replies
                                                    onEdit={handleEditReply}
                                                    showReplies={false}
                                                    onDelete={handleDeleteReply}
                                                    canDeleteComment={canDeleteReply}
                                                    canEditComment={canEditReply}
                                                    isReply={true}
                                                />
                                            </div>
                                        </div>                                    );
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