import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import adminApi from "@/utils/adminInterception";

// Hook for managing comments
export const useComments = (initialComments, post) => {
  const [localComments, setLocalComments] = useState(initialComments);
  const [repliesData, setRepliesData] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  
  // Ref để chặn multiple clicks
  const isLikingRef = useRef({});

  useEffect(() => {
    setLocalComments(initialComments);
  }, [initialComments]);

  const likeComment = useCallback(async (commentId, isCurrentlyLiked) => {
    // Chặn multiple clicks
    if (isLikingRef.current[commentId]) return;
    
    // Lưu trạng thái ban đầu
    const wasLiked = isCurrentlyLiked;
    
    // ✅ OPTIMISTIC UPDATE - Cập nhật UI ngay lập tức
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

    // Update replies
    setRepliesData((prevReplies) => {
      const updatedReplies = { ...prevReplies };
      
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
          
          if (updatedRepliesForComment.some(reply => reply.id === commentId)) {
            updatedReplies[parentCommentId] = updatedRepliesForComment;
          }
        }
      });
      
      return updatedReplies;
    });

    // Đánh dấu đang xử lý
    isLikingRef.current[commentId] = true;

    // 🔄 API CALL trong background
    try {
      const endpoint = wasLiked
        ? `/v1/comments/unlike/${commentId}`
        : `/v1/comments/like/${commentId}`;

      if (wasLiked) {
        const res = await api.delete(endpoint);
        console.log("✅ Unlike comment successful", res);
      } else {
        const res = await api.post(endpoint);
        console.log("✅ Like comment successful", res);
      }
    } catch (err) {
      console.error("❌ Toggle comment like failed:", err);
      toast.error("Lỗi khi thích bình luận");
      
      // 🔄 ROLLBACK - Khôi phục trạng thái ban đầu
      // Rollback main comments
      setLocalComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                liked: wasLiked, // Khôi phục trạng thái ban đầu
                likeCount: wasLiked
                  ? comment.likeCount + 1 // Rollback: từ giảm về tăng
                  : comment.likeCount - 1, // Rollback: từ tăng về giảm
              }
            : comment
        )
      );

      // Rollback replies
      setRepliesData((prevReplies) => {
        const updatedReplies = { ...prevReplies };
        
        Object.keys(updatedReplies).forEach(parentCommentId => {
          const replies = updatedReplies[parentCommentId];
          if (replies && Array.isArray(replies)) {
            const updatedRepliesForComment = replies.map(reply =>
              reply.id === commentId
                ? {
                    ...reply,
                    liked: wasLiked, // Khôi phục trạng thái ban đầu
                    likeCount: wasLiked
                      ? reply.likeCount + 1 // Rollback
                      : reply.likeCount - 1, // Rollback
                  }
                : reply
            );
            
            if (updatedRepliesForComment.some(reply => reply.id === commentId)) {
              updatedReplies[parentCommentId] = updatedRepliesForComment;
            }
          }
        });
        
        return updatedReplies;
      });
    } finally {
      // Bỏ đánh dấu đang xử lý
      isLikingRef.current[commentId] = false;
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
      const token = localStorage.getItem("admin_accessToken")
      if(token){
         await adminApi.delete(`/v1/comments/${commentId}`);
      }
      else
      {
         await api.delete(`/v1/comments/${commentId}`);
      }
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

  const editComment = useCallback(async (commentId, newContent) => {
    // Lưu nội dung cũ để rollback nếu cần
    let originalContent = '';
    
    // ✅ OPTIMISTIC UPDATE - Cập nhật UI ngay lập tức
    // Update main comments
    setLocalComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          originalContent = comment.content; // Lưu nội dung cũ
          return { ...comment, content: newContent };
        }
        return comment;
      })
    );

    // Update replies
    setRepliesData((prevReplies) => {
      const updatedReplies = { ...prevReplies };
      
      Object.keys(updatedReplies).forEach(parentCommentId => {
        const replies = updatedReplies[parentCommentId];
        if (replies && Array.isArray(replies)) {
          const updatedRepliesForComment = replies.map(reply => {
            if (reply.id === commentId) {
              if (!originalContent) originalContent = reply.content; // Lưu nội dung cũ
              return { ...reply, content: newContent };
            }
            return reply;
          });
          
          if (updatedRepliesForComment.some(reply => reply.id === commentId)) {
            updatedReplies[parentCommentId] = updatedRepliesForComment;
          }
        }
      });
      
      return updatedReplies;
    });

    // 🔄 API CALL trong background
    try {
      const res = await api.patch(`/v1/comments/${commentId}`, {
        content: newContent
      });
      console.log("✅ Edit comment successful", res);
      toast.success("Đã cập nhật bình luận");
    } catch (err) {
      console.error("❌ Edit comment failed:", err);
      toast.error("Lỗi khi sửa bình luận");
      
      // 🔄 ROLLBACK - Khôi phục nội dung ban đầu
      // Rollback main comments
      setLocalComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, content: originalContent }
            : comment
        )
      );

      // Rollback replies
      setRepliesData((prevReplies) => {
        const updatedReplies = { ...prevReplies };
        
        Object.keys(updatedReplies).forEach(parentCommentId => {
          const replies = updatedReplies[parentCommentId];
          if (replies && Array.isArray(replies)) {
            const updatedRepliesForComment = replies.map(reply =>
              reply.id === commentId
                ? { ...reply, content: originalContent }
                : reply
            );
            
            if (updatedRepliesForComment.some(reply => reply.id === commentId)) {
              updatedReplies[parentCommentId] = updatedRepliesForComment;
            }
          }
        });
        
        return updatedReplies;
      });
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
    editComment,       // 🆕 New edit method
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