"use client"

import { useState, useEffect } from "react"
import Modal from "../ui-components/Modal"
import toast from "react-hot-toast"
import api from "@/utils/axios"

export default function SharePostModal({
                                           isOpen,
                                           onClose,
                                           post,
                                       }) {
    const [shareContent, setShareContent] = useState("")
    const [sharePrivacy, setSharePrivacy] = useState("FRIEND")
    const [isSharing, setIsSharing] = useState(false)
    useEffect(() => {
        if (isOpen) {
            const storedPrivacy = localStorage.getItem("defaultPrivacy")
            if ((storedPrivacy)) {
                setSharePrivacy(storedPrivacy)
            } else {
                setSharePrivacy("FRIEND") // fallback
            }
        }
    }, [isOpen])
    const handleSharePost = async () => {
        if (isSharing) return

        setIsSharing(true)
        try {
            const res = await api.post("/v1/posts/share", {
                content: shareContent,
                privacy: sharePrivacy,
                originalPostId: post.id,
            })
            if(res.data.code===200){
            toast.success("Chia sẻ bài viết thành công!")
            // Reset form
            setShareContent("")
            setSharePrivacy("FRIEND")

            }

            onClose()
        } catch (err) {
            if(err.response.data.code===5005){
            toast.error("Chỉ được chia sẻ bài viết công khai")
            }
        } finally {
            setIsSharing(false)
        }
    }

    const handleClose = () => {
        if (isSharing) return

        // Reset form on close
        setShareContent("")
        setSharePrivacy("FRIEND")
        onClose()
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleSharePost()
        }
    }

    return (
        <Modal isOpen={isOpen} size="medium" onClose={handleClose}>
            <div className="p-4 w-full max-w-md mx-auto">
                <h2 className="text-lg font-semibold mb-4 text-[var(--card-foreground)]">
                    Chia sẻ bài viết
                </h2>

                <div className="mb-4">
                    <label className="block text-sm mb-2 text-[var(--card-foreground)]">
                        Quyền riêng tư
                    </label>
                    <select
                        className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        value={sharePrivacy}
                        onChange={(e) => setSharePrivacy(e.target.value)}
                        disabled={isSharing}
                    >
                        <option value="PUBLIC">🌍 Công khai</option>
                        <option value="FRIEND">👥 Bạn bè</option>
                        <option value="PRIVATE">🔒 Chỉ mình tôi</option>
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-sm mb-2 text-[var(--card-foreground)]">
                        Bạn muốn nói gì không?
                    </label>
                    <textarea
                        className="w-full p-3 border border-[var(--border)] rounded-lg resize-none bg-[var(--card)] text-[var(--card-foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        placeholder="Viết điều gì đó..."
                        rows={4}
                        value={shareContent}
                        onChange={(e) => setShareContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSharing}
                        maxLength={500}
                    />
                    <div className="text-xs text-[var(--muted-foreground)] mt-1 text-right">
                        {shareContent.length}/500
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--card-foreground)] hover:bg-[var(--input)] transition-colors disabled:opacity-50"
                        disabled={isSharing}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSharePost}
                        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
                        disabled={isSharing}
                    >
                        {isSharing ? "Đang chia sẻ..." : "Chia sẻ"}
                    </button>
                </div>
            </div>
        </Modal>
    )
}