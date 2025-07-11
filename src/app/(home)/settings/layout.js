"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MotionContainer from "@/components/ui-components/MotionContainer";
import {
  UserCircle, Lock, Ban, Flag,
  FileText, Database, MessageCircle, MessageSquare, Mail,
  Sun,
} from "lucide-react";

const groupedMenuItems = [
  {
    title: "Tài khoản",
    items: [
      { id: "personalinfo", icon: UserCircle, label: "Thông tin cá nhân" },
      { id: "privacy", icon: Lock, label: "Bảo mật & Quyền riêng tư" },
    ]
  },
  {
    title: "Tương tác",
    items: [
      // { id: "connections", icon: Users, label: "Bạn bè & Kết nối" },
      { id: "blockedlist", icon: Ban, label: "Danh sách chặn" },
    ]
  },
  
  {
    title: "Ngôn ngữ và hiển thị",
    items: [
      { id: "display", icon: Sun, label: "Hiển thị" },
    ]
  }
];

export default function SettingsLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <aside className="w-[280px] border-r border-[var(--border)] p-6 overflow-y-auto">
        <h2 className="text-sm text-[var(--muted-foreground)] font-semibold mb-6">Cài đặt người dùng</h2>
        <nav className="space-y-6">
          {groupedMenuItems.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-2">
                {group.title}
              </h3>
              {group.items.map((item, subIdx) => (
                <Link
                  key={subIdx}
                  href={`/settings/${item.id}`}
                  className={`w-full flex items-center gap-3 text-left px-4 py-2 rounded-md hover:bg-[var(--muted)] transition-colors ${
                    pathname.endsWith(item.id) ? "bg-[var(--muted)]" : ""
                  }`}
                >
                  <item.icon className="w-5 h-5 text-[var(--foreground)]" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content with animation */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        <MotionContainer modeKey={pathname} effect="fadeUp" duration={0.25}>
          {children}
        </MotionContainer>
      </main>
    </div>
  );
}
