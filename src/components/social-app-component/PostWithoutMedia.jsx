import { Heart, MessageCircle, SendHorizonal } from "lucide-react";
import Avatar from "../ui-components/Avatar";
import FilePreviewInChat from "../ui-components/FilePreviewInChat";
import dayjs from "dayjs";

// Component for Media Display
const MediaDisplay = ({ url, alt, className }) => {
  const isVideo = (url = "") => /\.(mp4|webm|ogg)$/i.test(url);
  
  return isVideo(url) ? (
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
};

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

export default function PostWithoutMediaLayout({
  post,
  liked,
  likeCount,
  localComments,
  loadingComments,
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
  content,
  setContent,
  file,
  previewUrl,
  isSubmitting,
  onLikeToggle,
  handleCommentLike,
  handleReplyClick,
  handleReplyCancel,
  handleReplySubmit,
  handleToggleReplies,
  handleDeleteComment,
  handleSubmit,
  handleFileChange,
  handleRemoveFile,
}) {
  return (
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
      <p className="text-xs px-4">{likeCount} lượt thích</p>

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
  );
}