"use client"

import { useRef, useEffect } from "react"

export default function ChatInput({
  input,
  setInput,
  isConnected,
  selectedFile,
  editingMessage,
  uploading,
  disabled = false,
  loading = false,
  onSend,
  onSendFile,
  onSaveEdit,
  onCancelEdit,
  onCancelFile,
  onFileSelect,
  onKeyDown,
  placeholder,
}) {
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto focus input when component mounts or editing mode changes
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [editingMessage, disabled])

  const handleSendClick = () => {
    if (disabled || loading) return

    if (selectedFile) {
      onSendFile()
    } else if (editingMessage) {
      onSaveEdit()
    } else {
      onSend()
    }
  }

  const handleFileClick = () => {
    if (disabled || loading) return
    fileInputRef.current?.click()
  }

  const renderSendButton = () => {
    if (loading) {
      return (
        <button
          disabled
          className="flex items-center justify-center w-10 h-10 bg-blue-500/50 text-white rounded-full cursor-not-allowed opacity-50"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </button>
      )
    }

    return (
      <button
        onClick={handleSendClick}
        disabled={disabled || !input.trim()}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
          disabled || !input.trim()
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    )
  }

  return (
    <div className="px-4 py-3 border-t border-[var(--border)] space-y-3">
      {/* Editing indicator */}
      {editingMessage && (
        <div className="flex items-center justify-between px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✏️</span>
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Đang sửa tin nhắn</span>
          </div>
          <button
            onClick={onCancelEdit}
            className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* File preview */}
      {selectedFile && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="text-lg">📎</span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">{selectedFile.name}</span>
          </div>
          <button
            onClick={onCancelFile}
            disabled={uploading}
            className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end space-x-3">
        {/* File upload button */}
        <button
          onClick={handleFileClick}
          disabled={disabled || loading}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
            disabled || loading
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          title="Đính kèm file"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        {/* Input field */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className={`w-full px-4 py-3 border border-[var(--border)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--background)] text-[var(--foreground)] transition-all ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            rows={1}
            style={{
              minHeight: "44px",
              maxHeight: "120px",
            }}
          />
        </div>

        {/* Send button */}
        {renderSendButton()}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" onChange={onFileSelect} className="hidden" accept="*/*" />
      </div>

      {/* Connection status */}
      {!isConnected && !loading && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-full">
            <span className="text-red-500">⚠️</span>
            <span className="text-xs font-medium text-red-500">Mất kết nối đến server</span>
          </div>
        </div>
      )}
    </div>
  )
}
