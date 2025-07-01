// components/ReplyForm.jsx
import FilePreviewInChat from "../ui-components/FilePreviewInChat";
import { memo } from "react";

export const ReplyForm = memo(({
  commentId,
  authorName,
  onSubmit,
  onCancel,
  form
}) => (
  <div className="mt-3 pl-4 border-l-2 border-[var(--border)]">
    {form.file && (
      <div className="mb-2">
        <FilePreviewInChat
          selectedFile={form.file}
          filePreview={form.previewUrl}
          onCancel={form.removeFile}
        />
      </div>
    )}

    <form
      onSubmit={(e) => form.submit(e, commentId)}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={`Trả lời ${authorName}...`}
          value={form.content}
          onChange={(e) => form.setContent(e.target.value)}
          className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          autoFocus
        />
        <label className="text-xs text-blue-500 cursor-pointer hover:underline">
          + File
          <input
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={form.handleFileChange}
          />
        </label>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={form.isSubmitting || (!form.content.trim() && !form.file)}
          className="text-xs text-blue-500 font-semibold hover:opacity-80 disabled:opacity-50"
        >
          {form.isSubmitting ? "Đang gửi..." : "Trả lời"}
        </button>
      </div>
    </form>
  </div>
));

ReplyForm.displayName = 'ReplyForm';