import { useState } from "react";
import api from "@/utils/axios";
import toast from "react-hot-toast";

export default function CommentForm({ postId, onCommentAdded }) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.post("/v1/comments", { content, postId });
      onCommentAdded(res.data);
      setContent("");
    } catch {
      toast.error("Lỗi gửi bình luận");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Viết bình luận..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm p-2"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="text-sm text-blue-500 font-semibold hover:opacity-80 disabled:opacity-50"
      >
        {isSubmitting ? "Đang gửi..." : "Gửi"}
      </button>
    </form>
  );
}
