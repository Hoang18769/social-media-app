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
      className={`border
        flex md:flex-col items-center justify-around 
        
        fixed bottom-0  h-14 p-4
        md:static md-w-full md:h-[calc(100vh-64px)] md:sticky md:top-[64px]
        z-50
      `}
    >
     <div  className="bg-gray-100 dark:bg-gray-800 
        text-[var(--foreground)]
        rounded-none md:rounded-full w-full p-8">
       <nav className="flex flex-1 md:flex-col items-center justify-around md:justify-center md:space-y-10">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setActiveItem(item.id)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                activeItem === item.id
                  ? "text-black dark:text-white"
                  : "text-gray-500 hover:text-black dark:hover:text-white"
              }`}
            >
              <Icon size={24} strokeWidth={activeItem === item.id ? 2.5 : 2} />
            </Link>
          )
        })}
      </nav>
     </div>
    </div>
  )
}
