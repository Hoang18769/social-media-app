import Avatar from "../../ui-components/Avatar";
import dayjs from "dayjs";

export default function CommentList({ comments, loading }) {
  if (loading) return <p className="text-xs text-[var(--muted-foreground)]">Đang tải bình luận...</p>;
  if (comments.length === 0) return <p className="text-xs text-[var(--muted-foreground)]">Chưa có bình luận nào</p>;

  return (
    <div className="space-y-3">
      {comments.map(comment => (
        <div key={comment.id} className="flex gap-2 text-sm">
          <Avatar src={comment.author?.profilePictureUrl} alt={comment.author?.username} size={24} />
          <div>
            <p className="font-semibold text-xs">
              {comment.author?.familyName} {comment.author?.givenName}
              <span className="ml-2 text-[var(--muted-foreground)] text-xs">{dayjs(comment.createdAt).fromNow()}</span>
            </p>
            <p className="text-xs">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
