"use client";

import Avatar from "./ui-components/Avatar";
import { Heart, MessageCircle, SendHorizonal } from "lucide-react";
import dayjs from "dayjs";
import CommentActions from "./PostModal/CommentActions";
import ReplyForm from "./PostModal/ReplyForm";
import FilePreviewInChat from "../ui-components/FilePreviewInChat";

export default function PostWithoutMedia({
  post,
  liked,
  likeCount,
  localComments,
  showReplies,
  repliesData,
  loadingReplies,
  replyingTo,
  replyContent,
  setReplyContent,
  replyFile,
  setReplyFile,
  replyPreviewUrl,
  setReplyPreviewUrl,
  isSubmittingReply,
  handleReplySubmit,
  handleReplyCancel,
  handleReplyClick,
  handleCommentLike,
  handleDeleteComment,
  handleToggleReplies,
  file,
  previewUrl,
  handleRemoveFile,
  content,
  setContent,
  isSubmitting,
  handleFileChange,
  handleCommentSubmit,
  loadingComments,
}) {
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
    
  return (
    <div className="flex flex-col w-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
        <Avatar src={post.author?.profilePictureUrl} alt={post.author?.username} />
        <div>
          <p className="font-semibold text-sm">
            {post.author?.givenName} {post.author?.familyName}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {dayjs(post.createdAt).fromNow()}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm mb-4">{post.content}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 text-[var(--muted-foreground)] p-4 border-b border-[var(--border)]">
        <button onClick={handleCommentLike} className="p-2 rounded-full hover:bg-[var(--input)]">
          <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
        </button>
        <button className="p-2 rounded-full hover:bg-[var(--input)]">
          <MessageCircle className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-full hover:bg-[var(--input)]">
          <SendHorizonal className="h-5 w-5" />
        </button>
      </div>
      <p className="text-xs px-4 mt-2">{likeCount} lượt thích</p>

      {/* Comment list */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        <p className="text-sm font-semibold mb-2">Bình luận</p>
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
                    onLike={handleCommentLike}
                    onReply={handleReplyClick}
                    onToggleReplies={handleToggleReplies}
                    showReplies={showReplies[comment.id]}
                    onDelete={handleDeleteComment}
                    isOwnComment={comment.author?.id === post.author?.id}
                  />

                  {showReplies[comment.id] && (
                    <div className="mt-3 pl-4 border-l-2 border-[var(--border)]">
                      {loadingReplies[comment.id] ? (
                        <p className="text-xs text-[var(--muted-foreground)]">Đang tải phản hồi...</p>
                      ) : (
                        <div className="space-y-3">
                          {repliesData[comment.id]?.map((reply) => (
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

      {/* Preview file */}
      {file && (
        <div className="p-4">
          <FilePreviewInChat selectedFile={file} filePreview={previewUrl} onCancel={handleRemoveFile} />
        </div>
      )}

      {/* Comment input */}
      <form onSubmit={handleCommentSubmit} className="border-t border-[var(--border)] pt-2 flex items-center gap-2 p-4">
        <input
          type="text"
          placeholder="Viết bình luận..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm p-2"
        />
        <label className="text-sm text-blue-500 cursor-pointer hover:underline">
          + Ảnh
          <input type="file" accept="image/*,video/*" hidden onChange={handleFileChange} />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="text-blue-500 text-sm font-semibold hover:opacity-80"
        >
          {isSubmitting ? "Đang gửi..." : "Gửi"}
        </button>
      </form>
    </div>
  );
}
