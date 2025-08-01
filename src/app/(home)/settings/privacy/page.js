"use client";
import React, { useState, useEffect } from "react";

export default function PrivacySettings() {
  const [privacy, setPrivacy] = useState({
    showFriends: true,
    defaultPostPrivacy: "friends",
    allowFriendRequest: true,
    emailVerified: true,
    isLocked: false,
  });

  // Load giá trị từ localStorage nếu có
  useEffect(() => {
    const storedPrivacy = localStorage.getItem("defaultPrivacy");
    if (storedPrivacy) {
      setPrivacy((prev) => ({
        ...prev,
        defaultPostPrivacy: storedPrivacy,
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setPrivacy((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    localStorage.setItem("defaultPrivacy", privacy.defaultPostPrivacy);
    alert("Đã lưu cài đặt quyền riêng tư bài viết!");
  };

  return (
      <div className="flex min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
        <main className="flex-1 w-full p-8 space-y-6">
          <h1 className="text-2xl font-bold">Bảo mật & Quyền riêng tư</h1>

          <div className="bg-[var(--card)] p-6 rounded-lg shadow-md space-y-6">
            {/* Quyền hiển thị danh sách bạn bè */}

            {/* Quyền riêng tư mặc định của bài viết */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                Quyền riêng tư mặc định cho bài viết mới
              </label>
              <select
                  name="defaultPostPrivacy"
                  value={privacy.defaultPostPrivacy}
                  onChange={handleChange}
                  className="w-full bg-[var(--input)] text-[var(--foreground)] px-3 py-2 rounded-md"
              >
                <option value="PUBLIC">Công khai</option>
                <option value="FRIEND">Chỉ bạn bè</option>
                <option value="PRIVATE">Chỉ mình tôi</option>
              </select>
            </div>

            {/* Trạng thái xác minh email */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Email đã xác minh</span>
              <span
                  className={`text-sm font-medium ${
                      privacy.emailVerified ? "text-green-600" : "text-red-600"
                  }`}
              >
              {privacy.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
            </span>
            </div>

            {/* Trạng thái khóa tài khoản */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Tài khoản tạm thời bị khóa</span>
              <span
                  className={`text-sm font-medium ${
                      privacy.isLocked ? "text-red-600" : "text-green-600"
                  }`}
              >
              {privacy.isLocked ? "Có" : "Không"}
            </span>
            </div>

            {/* Danh sách chặn */}
            <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              Xem danh sách người dùng đã chặn
            </span>
              <a
                  href="/settings/blockedlist"
                  className="text-sm text-[var(--accent-foreground)] hover:underline"
              >
                Xem danh sách
              </a>
            </div>

            {/* Nút lưu */}
            <div className="pt-4">
              <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        </main>
      </div>
  );
}
