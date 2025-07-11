"use client";

import React from "react";
import ThemeToggle from "@/components/ui-components/Themetoggle";

export default function DisplaySettings() {
  return (
    <div className="flex min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <main className="flex-1 w-full p-8 space-y-6">
        <h1 className="text-2xl font-bold">Hiển thị & Giao diện</h1>

        <div className="bg-[var(--card)] p-6 rounded-lg shadow-md space-y-6">
          {/* Chuyển chế độ sáng/tối */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Chế độ sáng / tối</label>
            <ThemeToggle />
          </div>

          {/* Font size (ví dụ mở rộng) */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Cỡ chữ giao diện (demo)
            </label>
            <select
              name="fontSize"
              className="w-full bg-[var(--input)] text-[var(--foreground)] px-3 py-2 rounded-md"
              defaultValue="medium"
              disabled
            >
              <option value="small">Nhỏ</option>
              <option value="medium">Trung bình</option>
              <option value="large">Lớn</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              (Tính năng đang phát triển)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
