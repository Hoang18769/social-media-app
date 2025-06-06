import PostCard from "@/components/social-app-component/Postcard"
"use client";

// src/app/(main)/page.js
const postWithImage = {
    user: {
      name: "Name",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "57 minutes ago",
    content:
      "Lorem ipsum dolor sit amet. Hic neque vitae sit vero explicabo est nobis voluptatem! Et odio obcaecati ut obcaecati voluptatum et eaque illo in sapiente minima ut delectus magni qui iure fugit",
    image: "/placeholder.svg?height=400&width=400",
    likes: 32800,
    comments: [
      {
        user: {
          name: "name",
          avatar: "/placeholder.svg?height=24&width=24",
        },
        content: "Lorem ipsum dolor sit amet.",
        timestamp: "23m",
        likes: 25,
      },
      {
        user: {
          name: "user2",
          avatar: "/placeholder.svg?height=24&width=24",
        },
        content: "Great post!",
        timestamp: "15m",
        likes: 10,
      },
    ],
  }
export default function Home() {
  return <div>
           <PostCard {...postWithImage} />
  Trang chủ mạng xã hội</div>
}
