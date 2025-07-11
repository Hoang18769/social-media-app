"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import api, { clearSession } from "@/utils/axios";
import NewPostModal from "../social-app-component/CreatePostForm";
import useAppStore from "@/store/ZustandStore";

export default function Header({ className = "" }) {
  const router = useRouter();
  const [showPostModal, setShowPostModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const clearAllData = useAppStore(state => state.clearAllData);

  const handleLogout = async () => {
    // ✅ Prevent multiple logout calls
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      await api.delete("/v1/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err.response?.data || err.message);
    } finally {
      // ✅ Clear session first
      clearSession();
      // ✅ Clear store data after session is cleared
      clearAllData();
      
      // ✅ Navigate immediately after clearing data
      router.replace("/register"); // Use replace instead of push
      
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header
        className="w-full px-6 flex items-center justify-between bg-[var(--background)]"
        style={{ height: "64px", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
      >

        {/* Center - Logo */}
        <div className="sm:block w-1/3 flex justify-center">
          <Link href="/home" className="font-bold text-2xl text-[var(--foreground)]">
            pocpoc
          </Link>
        </div>

        <div className="flex justify-end space-x-2 items-center  px-4">
          <div
            role="group"
            aria-label="Add and Messages"
            className="h-12 bg-[var(--card)] rounded-full flex items-center"
          >
            <button
              type="button"
              aria-label="Add"
              onClick={() => setShowPostModal(true)}
              className="w-32 h-12 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition rounded-l-full px-2"
              disabled={isLoggingOut} // ✅ Disable during logout
            >
              <Plus size={24} className="text-[var(--foreground)] " />
              <span className="pl-2">Đăng bài</span>
            </button>


          </div>
        </div>
      </header>

      {/* 📌 Modal tạo bài viết */}
      {showPostModal && !isLoggingOut && (
        <NewPostModal
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
        />
      )}
    </>
  );
}