"use client";


export default function ChatPage() {

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
