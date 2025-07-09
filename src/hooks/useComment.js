import { useState, useEffect, useCallback } from "react";
import api from "@/utils/axios";
import toast from "react-hot-toast";

// Hook for managing comments
export const useComments = (initialComments, post) => {
  const [localComments, setLocalComments] = useState(initialComments);
  const [repliesData, setRepliesData] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});

  useEffect(() => {
    setLocalComments(initialComments);
  }, [initialComments]);

  const likeComment = useCallback(async (commentId, isCurrentlyLiked) => {
    try {
      const endpoint = isCurrentlyLiked
        ? `/v1/comments/unlike/${commentId}`
        : `/v1/comments/like/${commentId}`;

      if (isCurrentlyLiked) {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint);
      }

      // Update main comments
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

      // Update replies if the liked item is a reply
      setRepliesData((prevReplies) => {
        const updatedReplies = { ...prevReplies };
        
        // Check each comment's replies for the liked reply
        Object.keys(updatedReplies).forEach(parentCommentId => {
          const replies = updatedReplies[parentCommentId];
          if (replies && Array.isArray(replies)) {
            const updatedRepliesForComment = replies.map(reply =>
              reply.id === commentId
                ? {
                    ...reply,
                    liked: !isCurrentlyLiked,
                    likeCount: isCurrentlyLiked
                      ? reply.likeCount - 1
                      : reply.likeCount + 1,
                  }
                : reply
            );
            
            // Only update if there was a change
            if (updatedRepliesForComment.some(reply => reply.id === commentId)) {
              updatedReplies[parentCommentId] = updatedRepliesForComment;
            }
          }
        });
        
        return updatedReplies;
      });
    } catch (err) {
      console.error("Error liking comment:", err);
      toast.error("Lỗi khi thích bình luận");
    }
  }, []);

  const toggleReplies = useCallback(async (commentId) => {
    if (showReplies[commentId]) {
      setShowReplies((prev) => ({ ...prev, [commentId]: false }));
      return;
    }

    if (!repliesData[commentId]) {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));
      try {
        const res = await api.get(`/v1/comments/of-comment/${commentId}`);
        console.log("Replies data:", res.data.body);
        setRepliesData((prev) => ({ ...prev, [commentId]: res.data.body }));
      } catch (err) {
        console.error("Error loading replies:", err);
        toast.error("Lỗi tải phản hồi");
        return;
      } finally {
        setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
      }
    }
    setShowReplies((prev) => ({ ...prev, [commentId]: true }));
  }, [showReplies, repliesData]);

  const deleteComment = useCallback(async (commentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) return;

    try {
      await api.delete(`/v1/comments/${commentId}`);
      
      // Remove from main comments
      setLocalComments((prev) =>
        prev.filter((comment) => comment.id !== commentId)
      );

      // Remove from replies
      setRepliesData((prevReplies) => {
        const updatedReplies = { ...prevReplies };
        
        Object.keys(updatedReplies).forEach(parentCommentId => {
          const replies = updatedReplies[parentCommentId];
          if (replies && Array.isArray(replies)) {
            updatedReplies[parentCommentId] = replies.filter(reply => reply.id !== commentId);
          }
        });
        
        return updatedReplies;
      });

      toast.success("Đã xóa bình luận");
    } catch (err) {
      console.error("Error deleting comment:", err);
      toast.error("Lỗi khi xóa bình luận");
    }
  }, []);

  const addComment = useCallback((comment) => {
    setLocalComments((prev) => [comment, ...prev]);
  }, []);

  const addReply = useCallback((commentId, reply) => {
    setLocalComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, replyCount: (comment.replyCount || 0) + 1 }
          : comment
      )
    );

    setRepliesData((prevReplies) => ({
      ...prevReplies,
      [commentId]: [reply, ...(prevReplies[commentId] || [])],
    }));
  }, []);

  // Add updateRepliesData method for external use
  const updateRepliesData = useCallback((commentId, newReplies) => {
    setRepliesData(prev => ({
      ...prev,
      [commentId]: newReplies
    }));
  }, []);

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
    updateRepliesData, // Export this for external use
    setRepliesData,    // Export this as well
  };
};

// Hook for form management
export const useForm = (onSubmit) => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = useCallback((e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  }, []);

  const removeFile = useCallback(() => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }, [previewUrl]);

  const reset = useCallback(() => {
    setContent("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const submit = useCallback(async (e, ...args) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, file, ...args);
      reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Lỗi khi gửi. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }, [content, file, onSubmit, reset]);

  return {
    content,
    setContent,
    file,
    previewUrl,
    isSubmitting,
    handleFileChange,
    removeFile,
    submit,
    reset,
  };
};