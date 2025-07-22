"use client";

import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import clsx from "clsx";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  MoreVertical, Edit, Trash2, Download,
  FileText, Image, Film, Music, X,
  Check
} from "lucide-react";
import Avatar from "../ui-components/Avatar";
import {renderTextWithLinks} from "@/hooks/renderTextWithLinks";

dayjs.extend(relativeTime);

// Helper functions - moved outside component to prevent recreation
const getFilenameFromUrl = (url) => {
  if (!url) return 'Unknown file';
  const match = url.match(/\/([^\/]+\.(png|jpg|jpeg|gif|pdf|doc|docx|txt|zip|rar|mp4|mp3|wav|xlsx|ppt|pptx))/i);
  return match?.[1] || url.split('/').pop() || 'File đính kèm';
};

const getFileTypeFromUrl = (url) => {
  if (!url) return 'application/octet-stream';
  const extension = url.split('.').pop()?.toLowerCase();
  const mimeTypes = {
    'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
    'webp': 'image/webp', 'pdf': 'application/pdf', 'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain', 'zip': 'application/zip', 'rar': 'application/x-rar-compressed',
    'mp4': 'video/mp4', 'mp3': 'audio/mpeg', 'wav': 'audio/wav',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  return mimeTypes[extension] || 'application/octet-stream';
};

const isImageFile = (fileType) => fileType?.startsWith('image/');
const isVideoFile = (fileType) => fileType?.startsWith('video/');

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const truncateFilename = (filename, maxLength = 35) => {
  if (!filename || filename.length <= maxLength) return filename;

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return filename.substring(0, maxLength - 3) + '...';
  }

  const extension = filename.substring(lastDotIndex);
  const nameWithoutExt = filename.substring(0, lastDotIndex);
  const availableSpace = maxLength - extension.length - 3;

  if (availableSpace <= 0) {
    return '...' + extension;
  }

  return nameWithoutExt.substring(0, availableSpace) + '...' + extension;
};

// Memoized FileIcon component
const FileIcon = memo(({ fileType }) => {
  if (isImageFile(fileType)) return <Image className="w-5 h-5" />;
  if (isVideoFile(fileType)) return <Film className="w-5 h-5" />;
  if (fileType?.startsWith('audio/')) return <Music className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
});

FileIcon.displayName = 'FileIcon';

function MessageItem({
                       msg,
                       targetUser,
                       selectedMessage,
                       onMessageClick,
                       onEditMessage,
                       onDeleteMessage
                     }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [currentFileType, setCurrentFileType] = useState(null);
  const [popupPosition, setPopupPosition] = useState('bottom');
  const buttonRef = useRef(null);

  // Memoized computed values
  const computedValues = useMemo(() => {
    const isSelf = msg.sender?.id !== targetUser?.id;
    const isSelected = selectedMessage === msg.id;
    const timeSent = dayjs(msg.sentAt).fromNow();
    const isDeleted = msg.deleted === true;
    const isUpdated = msg.updated === true;
    const isReading = msg.isRead === true;
    const hasFile = msg.attachment || msg.attachedFile;
    const isFileOnlyMessage = (!msg.content || msg.content.trim() === '') && hasFile;
    const canEdit = msg.type !== "CALL" && !isFileOnlyMessage;
    const showMoreButton = msg.type !== "CALL";

    return {
      isSelf,
      isSelected,
      timeSent,
      isDeleted,
      isUpdated,
      isReading,
      hasFile,
      isFileOnlyMessage,
      canEdit,
      showMoreButton
    };
  }, [
    msg.sender?.id,
    targetUser?.id,
    selectedMessage,
    msg.id,
    msg.sentAt,
    msg.deleted,
    msg.updated,
    msg.isRead,
    msg.attachment,
    msg.attachedFile,
    msg.content,
    msg.type
  ]);

  const {
    isSelf, isSelected, timeSent, isDeleted, isUpdated,
    isReading, hasFile, isFileOnlyMessage, canEdit, showMoreButton
  } = computedValues;

  // Memoized event handlers
  const handlePreviewClick = useCallback((url, fileType) => {
    setCurrentFile(url);
    setCurrentFileType(fileType);
    setModalOpen(true);
  }, []);

  const handleMessageClick = useCallback(() => {
    onMessageClick(msg);
  }, [onMessageClick, msg]);

  const handleEditMessage = useCallback((e) => {
    e.stopPropagation();
    onEditMessage(msg);
  }, [onEditMessage, msg]);

  const handleDeleteMessage = useCallback((e) => {
    e.stopPropagation();
    onDeleteMessage(msg.id);
  }, [onDeleteMessage, msg.id]);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
  }, []);

  // Calculate popup position based on message position in viewport
  useEffect(() => {
    if (isSelected && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const messagePosition = rect.top;
      const distanceFromBottom = viewportHeight - messagePosition;

      if (messagePosition > viewportHeight / 2 || distanceFromBottom < 200) {
        setPopupPosition('top');
      } else {
        setPopupPosition('bottom');
      }
    }
  }, [isSelected]);

  // Memoized media preview component
  const MediaPreview = useMemo(() => {
    const renderMediaPreview = (url, fileType) => {
      if (isImageFile(fileType)) {
        return (
            <div className="cursor-pointer rounded-lg overflow-hidden" onClick={() => handlePreviewClick(url, fileType)}>
              <img src={url} alt="Preview" className="max-w-full max-h-64 object-contain rounded-lg border border-[var(--border)]" />
            </div>
        );
      } else if (isVideoFile(fileType)) {
        return (
            <div className="cursor-pointer rounded-lg overflow-hidden" onClick={() => handlePreviewClick(url, fileType)}>
              <video className="max-w-full max-h-64 rounded-lg border border-[var(--border)]">
                <source src={url} type={fileType} />
              </video>
            </div>
        );
      }
      return null;
    };

    return renderMediaPreview;
  }, [handlePreviewClick]);

  // Memoized file info renderer
  const renderFileInfo = useMemo(() => {
    return (url, fileType, filename, size) => {
      if (isImageFile(fileType) || isVideoFile(fileType)) {
        return MediaPreview(url, fileType);
      }

      const truncatedFilename = truncateFilename(filename);

      return (
          <div className="flex items-center gap-2 p-2 rounded-lg max-w-full">
            <FileIcon fileType={fileType} />
            <div className="flex-1 min-w-0">
              <div className="font-medium" title={filename}>
                {truncatedFilename}
              </div>
              {size && <div className="text-xs opacity-70">{formatFileSize(size)}</div>}
            </div>
            <a href={url} download className="p-1 rounded hover:bg-black/10 flex-shrink-0">
              <Download className="w-4 h-4" />
            </a>
          </div>
      );
    };
  }, [MediaPreview]);

  // Memoized message content
  const messageContent = useMemo(() => {
    if (isDeleted) return "Tin nhắn đã bị thu hồi";

    if (msg.type === "CALL" && msg.callId) {
      if (msg.answered === false) {
        return <>📞 Cuộc gọi nhỡ</>;
      } else {
        const durationSec = dayjs(msg.endAt).diff(dayjs(msg.callAt), "second");
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

        return (
            <>
              📞 Cuộc gọi đã kết thúc
              <div className="text-xs opacity-70 mt-1">
                Thời lượng: {durationStr}
              </div>
            </>
        );
      }
    }

    if (msg.attachment) {
      const filename = msg.attachmentName || getFilenameFromUrl(msg.attachment);
      return renderFileInfo(
          msg.attachment,
          getFileTypeFromUrl(msg.attachment),
          filename
      );
    }

    if (msg.attachedFile) {
      return renderFileInfo(
          msg.attachedFile.url,
          msg.attachedFile.contentType,
          msg.attachedFile.originalFilename,
          msg.attachedFile.size
      );
    }

    return renderTextWithLinks(msg.content);
  }, [
    isDeleted,
    msg.type,
    msg.callId,
    msg.answered,
    msg.endAt,
    msg.callAt,
    msg.attachment,
    msg.attachmentName,
    msg.attachedFile,
    msg.content,
    renderFileInfo
  ]);

  return (
      <>
        <div className={clsx("flex items-start gap-2 group message-container", {
          "justify-end": isSelf,
          "justify-start": !isSelf,
        })}>
          {!isSelf && (
              <Avatar
                  src={targetUser?.profilePictureUrl}
                  className="flex-shrink-0 mt-1 "
              />
          )}

          <div className={clsx("flex items-start gap-2 max-w-[80%]", {
            "flex-row-reverse": isSelf,
            "flex-row": !isSelf,
          })}>
            <div className="relative flex items-start gap-1">
              {/* More button - bên trái bubble */}
              {isSelf && !isDeleted && showMoreButton && (
                  <div className="relative">
                    <button
                        ref={buttonRef}
                        onClick={handleMessageClick}
                        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-full hover:bg-[var(--muted)] transition-all opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isSelected && (
                        <div
                            className={clsx(
                                "absolute left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-10 min-w-[100px]",
                                popupPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                          {canEdit && (
                              <button
                                  onClick={handleEditMessage}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded w-full text-left"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Sửa</span>
                              </button>
                          )}
                          <button
                              onClick={handleDeleteMessage}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded w-full text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Xóa</span>
                          </button>
                        </div>
                    )}
                  </div>
              )}

              {/* Message bubble */}
              <div
                  className={clsx(
                      "rounded-xl px-3 py-2 text-sm inline-block max-w-[60%] break-words",
                      isDeleted
                          ? "bg-gray-200 text-gray-500 italic dark:bg-gray-700 dark:text-gray-400"
                          : isSelf
                              ? "bg-blue-500 text-white"
                              : "bg-[var(--muted)] text-[var(--foreground)]"
                  )}
                  style={{
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%'
                  }}
              >
                {messageContent}

                <div className="text-xs mt-1 opacity-70 flex items-center justify-between gap-2">
                  {isUpdated && !isDeleted && (
                      <span className="flex items-center gap-1">
                    <Edit className="w-3 h-3" />
                    <span>đã chỉnh sửa</span>
                  </span>
                  )}
                  <span className="ml-auto">{timeSent}</span>
                  {isSelf && !isDeleted && isReading && (
                      <Check size={12}/>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {modalOpen && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <button
                  onClick={handleModalClose}
                  className="absolute top-4 right-4 text-white hover:text-gray-300"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                {isImageFile(currentFileType) ? (
                    <img
                        src={currentFile}
                        alt="Xem phóng to"
                        className="max-w-full max-h-full object-contain"
                    />
                ) : isVideoFile(currentFileType) ? (
                    <video
                        controls
                        autoPlay
                        className="max-w-full max-h-full"
                    >
                      <source src={currentFile} type={currentFileType} />
                    </video>
                ) : null}
              </div>
            </div>
        )}
      </>
  );
}

// Custom comparison function for memo
MessageItem.displayName = 'MessageItem';

export default memo(MessageItem);