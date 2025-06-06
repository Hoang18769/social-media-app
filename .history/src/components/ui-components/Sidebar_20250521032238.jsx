"use client"

import { useState } from "react"
import Link from "next/link"
import { Home, Search, Play, Heart, User } from "lucide-react"

export default function SidebarNavigation() {
  const [activeItem, setActiveItem] = useState("home")

  const menuItems = [
    { id: "home", icon: Home, href: "/" },
    { id: "search", icon: Search, href: "/search" },
    { id: "videos", icon: Play, href: "/videos" },
    { id: "favorites", icon: Heart, href: "/favorites" },
    { id: "profile", icon: User, href: "/profile" },
  ]

  return (
    <div
      className={`
        fixed bottom-0 left-0  h-14 w-full
        flex flex-row items-center justify-around

        bg-gray-100 dark:bg-gray-800 text-[var(--foreground)]
        p-2

        md:static md:top-[64px] md:h-[calc(100vh-64px)] 
        md:flex-col md:items-start md:justify-start md:p-6
        md:rounded-r-xl
        z-50
      `}
    >
      <nav className="flex flex-row md:flex-col items-center justify-around md:justify-start md:space-y-10 w-full">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setActiveItem(item.id)}
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors
                ${
                  activeItem === item.id
                    ? "text-black dark:text-white"
                    : "text-gray-500 hover:text-black dark:hover:text-white"
                }
              `}
            >
              <Icon size={24} strokeWidth={activeItem === item.id ? 2.5 : 2} />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
