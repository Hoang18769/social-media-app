"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, LogOut } from "lucide-react";
import ThemeToggle from "./Themetoggle";
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
        <div className="w-1/3"></div>

        {/* Center - Logo */}
        <div className="sm:block w-1/3 flex justify-center">
          <Link href="/home" className="font-bold text-2xl text-[var(--foreground)]">
            pocpoc
          </Link>
        </div>

        <div className="flex justify-end space-x-2 items-center relative">
          <div
            role="group"
            aria-label="Add and Messages"
            className="h-12 bg-[var(--card)] rounded-full flex items-center"
          >
            <button
              type="button"
              aria-label="Add"
              onClick={() => setShowPostModal(true)}
              className="w-12 h-12 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition rounded-l-full"
              disabled={isLoggingOut} // ✅ Disable during logout
            >
              <Plus size={20} className="text-[var(--foreground)]" />
            </button>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>

            <ThemeToggle />
          </div>

          {/* <button
            type="button"
            aria-label="Logout"
            onClick={handleLogout}
            disabled={isLoggingOut} // ✅ Disable during logout
            className={`w-12 h-12 bg-[var(--card)] rounded-full flex items-center justify-center transition ${
              isLoggingOut 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-red-200 dark:hover:bg-red-700'
            }`}
          >
            {isLoggingOut ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500" />
            ) : (
              <LogOut size={20} className="text-red-500" />
            )}
          </button> */}
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