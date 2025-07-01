"use client";

import { useState } from "react";
import ChatBox from "@/components/social-app-component/ChatBox";
import ChatList from "@/components/social-app-component/ChatList";
export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <div className="flex h-full">
      <div className="w-full md:w-1/3 border-r h-full overflow-y-auto">
        {/* <ChatList onSelectChat={setSelectedChat} selectedChat={selectedChat} /> */}
      </div>
      <div className="flex-1 h-full overflow-hidden">

      </div>
    </div>
  );
}
