"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  MessageCircle,
  Users,
  UserPen,
  Settings,
} from "lucide-react";

export default function SidebarNavigation() {
  const pathname = usePathname();
  const [username, setUsername] = useState(null);

  const menuItems = [
    { id: "home", icon: Home, href: "/home" },
    { id: "search", icon: Search, href: "/search" },
    { id: "message", icon: MessageCircle, href: "/chats" },
    { id: "favorites", icon: Users, href: "/friends" },
    { id: "profile", icon: UserPen, href: username ? `/profile/${username}` : "#" },
    { id: "setting", icon: Settings, href: "/settings" },
  ];

  useEffect(() => {
    const storedUsername = localStorage.getItem("userName");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  return (
    <div
      className={`
        z-50 fixed bottom-0 left-0 w-full flex justify-around
        md:static md:top-[64px] md:items-start md:h-full
        w-auto md:flex md:px-2 md:py-6
      `}
    >
      <nav className="bg-[var(--card)] p-4 md:rounded-xl flex flex-row md:flex-col items-center justify-around md:justify-center md:space-y-6 w-full md:w-full">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
    item.href.startsWith("/profile")
      ? pathname.startsWith("/profile")
      : pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors
                ${
                  isActive
                    ? "text-black dark:bg-white"
                    : "text-black shadow hover:bg-white hover:text-black dark:hover:bg-white"
                }
              `}
            >
              <Icon size={24} strokeWidth={isActive ? 3 : 2} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
