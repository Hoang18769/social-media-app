"use client";

import Image from "next/image";
import { X, Plus } from "lucide-react";

export default function ImagePreview({ images = [], onDelete, onAdd, onImageClick }) {
  if (!Array.isArray(images)) return null;

  const totalItems = images.length + 1;
  const gridCols =
    totalItems <= 1 ? "grid-cols-1" :
    totalItems === 2 ? "grid-cols-2" :
    totalItems <= 4 ? "grid-cols-3" :
    "grid-cols-4";

  const handleDeleteClick = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(index);
  };

  const handleImageClick = (e, index) => {
    // Kiểm tra nếu click vào nút delete thì không zoom
    if (e.target.closest('[data-delete-button]')) {
      return;
    }
    onImageClick?.(index);
  };

  return (
    <div className={`grid ${gridCols} gap-2 mt-2`}>
      {images.map((img, index) => (
        <div
          key={index}
          className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
          style={{ position: 'relative', isolation: 'isolate' }} // Tạo stacking context riêng
          onClick={(e) => handleImageClick(e, index)}
        >
          {/* Media content */}
          <div className="absolute inset-0" style={{ zIndex: 1 }}>
            {img.type === "video" ? (
              <video 
                src={img.preview} 
                className="object-cover w-full h-full"
                muted
              />
            ) : (
              <Image
                src={img.preview}
                alt={`Post image ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
                style={{ zIndex: 1 }}
              />
            )}
          </div>

          {/* Overlay hover */}
          <div 
            className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200"
            style={{ zIndex: 2 }}
          ></div>

          {/* Nút X - nằm trên cùng */}
          <div
            className="absolute top-0 right-0 p-2"
            style={{ zIndex: 10 }} // Z-index cao nhất
          >
            <button
              data-delete-button="true"
              onClick={(e) => handleDeleteClick(e, index)}
              className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
              style={{ 
                position: 'relative',
                zIndex: 1,
                minWidth: '28px',
                minHeight: '28px'
              }}
              title="Xóa ảnh/video"
              type="button"
            >
              <X className="w-4 h-4" style={{ position: 'relative', zIndex: 1 }} />
            </button>
          </div>

          {/* Video indicator */}
          {img.type === "video" && (
            <div 
              className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs"
              style={{ zIndex: 3 }}
            >
              📹 Video
            </div>
          )}
        </div>
      ))}

      {/* Nút thêm */}
      <button
        onClick={onAdd}
        className="aspect-square rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
        title="Thêm ảnh hoặc video"
        type="button"
      >
        <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mb-1" />
        <span className="text-xs text-gray-400 group-hover:text-blue-500">Thêm</span>
      </button>
    </div>
  );
}