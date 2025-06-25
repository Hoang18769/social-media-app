"use client";

import React, { useRef, useState } from "react";
import Modal from "@/components/ui-components/Modal";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import ImagePreview from "../ui-components/ImagePreview";

export default function NewPostModal({ isOpen, onClose }) {
  const fileInputRef = useRef(null);
  const [media, setMedia] = useState([]);
  const [privacy, setPrivacy] = useState("PUBLIC");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(null); // 🔍 index để zoom

  const handleMediaSelect = (files) => {
    const mediaFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    const newMedia = mediaFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));

    setMedia((prev) => [...prev, ...newMedia]);
  };

  const handleFileChange = (e) => {
    handleMediaSelect(Array.from(e.target.files));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleMediaSelect(Array.from(e.dataTransfer.files));
  };

  const handleClickUploadArea = () => fileInputRef.current?.click();

  const handleRemoveMedia = (index) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if ((media.length === 0 && !content.trim()) || !privacy || isLoading) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("content", content);
    formData.append("privacy", privacy);
    media.forEach((item) => formData.append("files", item.file));

    try {
      const res = await api.post("/v1/posts/post", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.code === 200) {
        toast.success("Đăng bài thành công");
        onClose?.();
        setMedia([]);
        setContent("");
        setPrivacy("PUBLIC");
      } else {
        toast.error(res.data.message || "Có lỗi xảy ra, vui lòng thử lại");
      }
    } catch (err) {
      toast.error("Lỗi kết nối hoặc máy chủ.");
      console.error("❌ Error posting:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="relative">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-lg font-semibold">New post</h2>
            <button
              onClick={onClose}
              className="text-xl text-gray-400 hover:text-[var(--foreground)]"
            >
              ✕
            </button>
          </div>

          {media.length === 0 ? (
            <div
              onClick={handleClickUploadArea}
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
            <div className="flex flex-col md:flex-row gap-6 p-4">
              <div className="md:w-1/2 w-full">
                <ImagePreview
                  images={media}
                  onImageClick={(i) => setZoomIndex(i)} // ⚡ xử lý zoom
                  onDelete={handleRemoveMedia}
                  onAdd={handleClickUploadArea}
                />
              </div>

              <div className="md:w-1/2 w-full flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Privacy</label>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)]"
                  >
                    <option value="PUBLIC">🌍 Public</option>
                    <option value="FRIEND">👥 Friends</option>
                    <option value="PRIVATE">🔒 Only me</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Caption</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    placeholder="Viết điều gì đó..."
                    className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)] resize-none"
                  />
                </div>

                <div className="flex justify-end mt-auto">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Nếu không có media */}
          {media.length === 0 && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Privacy</label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
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
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Viết điều gì đó..."
                  className="w-full px-3 py-2 border rounded-md bg-[var(--input)] text-[var(--foreground)] resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || (!content.trim() && media.length === 0)}
                  className="px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 🔍 Modal zoom ảnh/video */}
      {zoomIndex !== null && (
        <Modal isOpen={zoomIndex !== null} onClose={() => setZoomIndex(null)}>
          <div className="relative w-full h-[80vh] flex items-center justify-center bg-black">
            {media[zoomIndex]?.type === "video" ? (
              <video
                src={media[zoomIndex].preview}
                className="max-h-full max-w-full"
                controls
                autoPlay
              />
            ) : (
              <img
                src={media[zoomIndex].preview}
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
