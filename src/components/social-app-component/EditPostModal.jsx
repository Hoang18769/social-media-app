"use client";

import { useState, useRef, useEffect } from "react";
import Modal from "../ui-components/Modal";
import ImagePreview from "../ui-components/ImagePreview";
import toast from "react-hot-toast";
import api from "@/utils/axios";

export default function EditPostModal({ isOpen, onClose, post, onPostUpdated }) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const [newContent, setNewContent] = useState("");
  const [newPrivacy, setNewPrivacy] = useState("PUBLIC");
  
  // Array chứa URLs của files cũ cần xóa
  const [filesToDelete, setFilesToDelete] = useState([]);
  
  // Array chứa files mới từ local
  const [newFiles, setNewFiles] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(null);

  const handleContentChange = (e) => {
    setNewContent(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 96)}px`; // min height 96px (4 rows)
    }
  };

  // Reset state khi modal mở/đóng hoặc post thay đổi
  useEffect(() => {
    if (isOpen && post) {
      setNewContent(post.content || "");
      setNewPrivacy(post.privacy || "PUBLIC");
      setFilesToDelete([]);
      setNewFiles([]);
    } else if (!isOpen) {
      // Reset khi đóng modal
      setFilesToDelete([]);
      setNewFiles([]);
      setZoomIndex(null);
    }
  }, [isOpen, post]);

  // Auto-resize textarea khi content thay đổi từ useEffect
  useEffect(() => {
    if (textareaRef.current && newContent) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 96)}px`;
    }
  }, [newContent]);

  // Tạo combined array để hiển thị trong ImagePreview
  const displayMedia = [
    // Files cũ (chưa bị xóa)
    ...(post?.files || [])
      .filter(url => !filesToDelete.includes(url))
      .map(url => ({
        preview: url,
        type: url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') ? "video" : "image",
        isOld: true,
        url: url,
      })),
    // Files mới
    ...newFiles.map(fileObj => ({
      preview: fileObj.preview,
      type: fileObj.type,
      isOld: false,
      file: fileObj.file,
    }))
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setNewFiles(prev => [...prev, ...files]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setNewFiles(prev => [...prev, ...files]);
  };

  const handleAddFiles = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveMedia = (index) => {
    const item = displayMedia[index];
    
    if (item.isOld) {
      // Nếu là file cũ, thêm URL vào danh sách cần xóa
      setFilesToDelete(prev => [...prev, item.url]);
    } else {
      // Nếu là file mới, xóa khỏi array newFiles
      const newFileIndex = newFiles.findIndex(f => f.preview === item.preview);
      if (newFileIndex !== -1) {
        setNewFiles(prev => prev.filter((_, i) => i !== newFileIndex));
      }
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      let updatedPost = { ...post };
      
      // Kiểm tra xem có thay đổi gì không
      const hasContentChange = newContent !== post.content;
      const hasPrivacyChange = newPrivacy !== post.privacy;
      const hasFileChanges = canEditFiles && (filesToDelete.length > 0 || newFiles.length > 0);
      
      // 1. Update privacy nếu có thay đổi
      if (hasPrivacyChange) {
        const privacyRes = await api.patch(`/v1/posts/update-privacy/${post.id}?privacy=${newPrivacy}`);
        
        if (privacyRes.data.code !== 200) {
          throw new Error(privacyRes.data.message || "Lỗi khi cập nhật privacy!");
        }
        updatedPost.privacy = newPrivacy;
      }
      
      // 2. Update content và files nếu có thay đổi
      if (hasContentChange || hasFileChanges) {
        const formData = new FormData();
        
        // Thêm content
        formData.append("content", newContent);
        
        // Thêm các URL file cần xóa
        if (canEditFiles) {
          filesToDelete.forEach((url) => formData.append("deleteOldFileUrls", url));
          
          // Thêm các file mới
          newFiles.forEach((fileObj) => formData.append("newFiles", fileObj.file));
        }
        
        const contentRes = await api.patch(`/v1/posts/update-content/${post.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        
        if (contentRes.data.code !== 200) {
          throw new Error(contentRes.data.message || "Lỗi khi cập nhật content!");
        }
        
        // Cập nhật post data
        updatedPost.content = newContent;
        
        // Cập nhật files nếu có thay đổi
        if (canEditFiles && hasFileChanges) {
          // Files còn lại sau khi xóa
          const remainingOldFiles = (post.files || []).filter(url => !filesToDelete.includes(url));
          // Files mới từ server response
          const newFilesFromServer = contentRes.data.body?.files || [];
          // Combine lại
          updatedPost.files = [...remainingOldFiles, ...newFilesFromServer];
        }
      }
      
      toast.success("Cập nhật bài viết thành công!");
      onPostUpdated?.(updatedPost);
      onClose();
      
    } catch (error) {
      toast.error(error.message || "Lỗi kết nối hoặc máy chủ.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra xem có phải shared post không
  const isSharedPost = post?.sharedPost;
  
  // Kiểm tra quyền chỉnh sửa (có thể thêm logic kiểm tra user ownership)
  const canEditFiles = !isSharedPost; // Chỉ cho phép edit files nếu không phải shared post

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="relative">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-lg font-semibold">
              {isSharedPost ? "Chỉnh sửa bài chia sẻ" : "Chỉnh sửa bài viết"}
            </h2>
            <button onClick={onClose} className="text-xl text-gray-400 hover:text-[var(--foreground)]">
              ✕
            </button>
          </div>

          {/* Layout giống NewPostModal */}
          {canEditFiles && displayMedia.length === 0 ? (
            <div
              onClick={handleAddFiles}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-lg p-10 text-gray-500 hover:border-[var(--primary)] cursor-pointer transition-colors space-y-2"
            >
              <p className="text-sm">Chọn ảnh hoặc video, hoặc kéo thả vào đây</p>
              <div className="text-4xl">📁</div>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                
                ref={fileInputRef}
                onChange={handleFileChange}
                hidden
              />
            </div>
          ) : (
            <div className={`flex flex-col ${canEditFiles && displayMedia.length > 0 ? 'md:flex-row' : ''} gap-6 p-4`}>
              {/* Media preview - chỉ hiển thị nếu được phép edit files */}
              {canEditFiles && displayMedia.length > 0 && (
                <div className="md:w-1/2 w-full">
                  <ImagePreview
                    images={displayMedia}
                    onImageClick={(i) => setZoomIndex(i)}
                    onDelete={handleRemoveMedia}
                    onAdd={handleAddFiles}
                  />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    hidden
                  />
                </div>
              )}

              {/* Form inputs */}
              <div className={`${canEditFiles && displayMedia.length > 0 ? 'md:w-1/2' : ''} w-full flex flex-col gap-4`}>
                <div>
                  <label className="block text-sm font-medium mb-1">Privacy</label>
                  <select
                    value={newPrivacy}
                    onChange={(e) => setNewPrivacy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)]"
                  >
                    <option value="PUBLIC">🌍 Public</option>
                    <option value="FRIEND">👥 Friends</option>
                    <option value="PRIVATE">🔒 Only me</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {isSharedPost ? "Nội dung chia sẻ" : "Content"}
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={newContent}
                    onChange={handleContentChange}
                    rows={4}
                    placeholder={isSharedPost ? "Bạn muốn nói gì về bài viết này?" : "Viết điều gì đó..."}
                    className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)] resize-none overflow-hidden"
                    style={{ minHeight: '96px' }}
                  />
                </div>

                {/* Hiển thị thông tin bài gốc nếu là shared post */}
                {isSharedPost && post.originalPost && (
                  <div className="p-3 border rounded-md bg-[var(--muted)]/20">
                    <p className="text-sm text-[var(--muted-foreground)] mb-1">Bài viết gốc:</p>
                    <p className="text-sm font-medium">
                      {post.originalPost.author?.familyName} {post.originalPost.author?.givenName}
                    </p>
                    {post.originalPost.content && (
                      <p className="text-sm mt-1">{post.originalPost.content}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end mt-auto">
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang lưu..." : "💾 Lưu"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form cho trường hợp không có media (giống NewPostModal) */}
          {canEditFiles && displayMedia.length === 0 && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Privacy</label>
                <select
                  value={newPrivacy}
                  onChange={(e) => setNewPrivacy(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)]"
                >
                  <option value="PUBLIC">🌍 Public</option>
                  <option value="FRIEND">👥 Friends</option>
                  <option value="PRIVATE">🔒 Only me</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">What's on your mind?</label>
                <textarea
                  ref={textareaRef}
                  value={newContent}
                  onChange={handleContentChange}
                  rows={4}
                  placeholder="Viết điều gì đó..."
                  className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)] resize-none overflow-hidden"
                  style={{ minHeight: '96px' }}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Đang lưu..." : "💾 Lưu"}
                </button>
              </div>
            </div>
          )}

          {/* Form cho shared post không được phép edit files */}
          {!canEditFiles && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Privacy</label>
                <select
                  value={newPrivacy}
                  onChange={(e) => setNewPrivacy(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)]"
                >
                  <option value="PUBLIC">🌍 Public</option>
                  <option value="FRIEND">👥 Friends</option>
                  <option value="PRIVATE">🔒 Only me</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nội dung chia sẻ
                </label>
                <textarea
                  ref={textareaRef}
                  value={newContent}
                  onChange={handleContentChange}
                  rows={4}
                  placeholder="Bạn muốn nói gì về bài viết này?"
                  className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)] resize-none overflow-hidden"
                  style={{ minHeight: '96px' }}
                />
              </div>

              {/* Hiển thị thông tin bài gốc */}
              {post?.originalPost && (
                <div className="p-3 border rounded-md bg-[var(--muted)]/20">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Bài viết gốc:</p>
                  <p className="text-sm font-medium">
                    {post.originalPost.author?.familyName} {post.originalPost.author?.givenName}
                  </p>
                  {post.originalPost.content && (
                    <p className="text-sm mt-1">{post.originalPost.content}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Đang lưu..." : "💾 Lưu"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal zoom preview */}
      {zoomIndex !== null && canEditFiles && (
        <Modal isOpen={zoomIndex !== null} onClose={() => setZoomIndex(null)}>
          <div className="relative w-full h-[80vh] flex items-center justify-center bg-black">
            {displayMedia[zoomIndex]?.type === "video" ? (
              <video 
                src={displayMedia[zoomIndex].preview} 
                className="max-h-full max-w-full" 
                controls 
                autoPlay 
              />
            ) : (
              <img
                src={displayMedia[zoomIndex].preview}
                className="max-h-full max-w-full object-contain"
                alt={`Preview ${zoomIndex}`}
              />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}