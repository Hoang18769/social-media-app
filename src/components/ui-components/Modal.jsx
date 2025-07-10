"use client"

import { X } from "lucide-react"
import React, { useEffect } from "react"

export default function Modal({
  isOpen,
  onClose,
  children,
  size = "large" // "small", "medium", "large"
}) {
  // ESC để đóng modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      window.addEventListener("keydown", handleEsc)
      document.body.style.overflow = "hidden" // 🚫 Ngăn cuộn nền
    }

    return () => {
      window.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = "" // ✅ Khôi phục khi đóng modal
    }
  }, [isOpen, onClose])

  // Hàm lấy class width theo size
  const getWidthClass = () => {
    switch (size) {
      case "small":
        return "w-full max-w-md" // ~448px
      case "medium":
        return "w-full max-w-2xl" // ~672px
      case "large":
      default:
        return "w-full max-w-5xl" // ~1024px
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay mờ & chặn click */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Nút đóng */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-muted-foreground hover:text-foreground z-20"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Nội dung modal */}
      <div
        className={`relative z-10 ${getWidthClass()} h-[90vh] max-h-[90vh] rounded-xl bg-[var(--card)] text-[var(--card-foreground)] shadow-xl flex flex-col pointer-events-auto`}
        onClick={(e) => e.stopPropagation()} // ⛔ Chặn lan click
      >
        {/* Nội dung có thể cuộn */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}