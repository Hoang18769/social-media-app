"use client";

import { useState } from "react";
import Avatar from "../ui-components/Avatar";
import Modal from "../ui-components/Modal";
import EditProfileModal from "./EditProfile";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import useAppStore from "@/store/ZustandStore";

import FriendsListModal from "./FriendsListModal";

export default function ProfileHeader({ 
  profileData, 
  isOwnProfile = true, 
  activeTab = "posts",
  onTabChange,
  onProfileUpdate,
  onUsernameChange // New prop to handle username changes
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [initialModalTab, setInitialModalTab] = useState("friends");
  
  const avatar = profileData.profilePictureUrl;
  const { username: routeUsername } = useParams();
  const router = useRouter();

  const username = profileData.username;
  console.log(profileData)
  const navigateToChat = useAppStore((state) => state.navigateToChat);
  const selectChat = useAppStore((state) => state.selectChat);
  const showVirtualChat = useAppStore((state) => state.showVirtualChat);
  const chatList = useAppStore((state) => state.chatList);

  const handleBlockUser = async () => {
    const confirm = window.confirm(`Bạn có chắc muốn chặn ${routeUsername}?`);
    if (!confirm) return;

    try {
      const res = await api.post(`/v1/blocks/${routeUsername}`);
      if (res.data.code === 200) {
        alert(`Đã chặn ${routeUsername}`);
      } else {
        console.warn("Chặn thất bại:", res.data.message);
      }
    } catch (error) {
      console.error("Lỗi khi chặn người dùng:", error);
      alert("Có lỗi xảy ra khi chặn người dùng.");
    }
  };

  const handleSaveProfile = (newData, changeInfo) => {
    if (onProfileUpdate) onProfileUpdate(newData);
    
    // If username was changed, notify the parent component
    if (changeInfo?.usernameChanged && onUsernameChange) {
      onUsernameChange(changeInfo.oldUsername, changeInfo.newUsername);
    }
    
    setIsEditModalOpen(false);
  };

  const handleChatClick = () => {
    const targetUserId = profileData.id;
    const targetUsername = profileData.username;

    console.log("🔍 handleChatClick:", { targetUserId, targetUsername });

    if (!targetUserId) {
      toast.error("Không thể tìm thấy thông tin người dùng");
      return;
    }

    const existingChat = chatList.find(chat => {
      return chat.target?.id === targetUserId || 
             chat.target?.username === targetUsername;
    });

    console.log("🎯 Existing chat found:", existingChat);

    if (existingChat) {
      const chatId = existingChat.chatId;
      console.log("✅ Selecting existing chat:", chatId);
      
      selectChat(chatId);
      
      router.push('/chats');
      return;
    }

    const virtualChatData = {
      username: profileData.username,
      givenName: profileData.givenName,
      familyName: profileData.familyName,
      profilePictureUrl: profileData.profilePictureUrl,
      online: profileData.online || false
    };

    console.log("🆕 Creating virtual chat:", virtualChatData);
    showVirtualChat(targetUserId, virtualChatData);
    
    router.push('/chats');
  };

  const cancelFriendRequest = async () => {
    try {
      await api.delete(`/v1/friend-request/delete/${username}`);
      toast.success("Đã hủy lời mời kết bạn");
      onProfileUpdate({ ...profileData, request: null });
    } catch (error) {
      toast.error("Lỗi khi hủy lời mời");
    }
  };

  const declineFriendRequest = async () => {
    try {
      await api.delete(`/v1/friend-request/delete/${username}`);
      toast.success("Đã từ chối lời mời");
      onProfileUpdate({ ...profileData, request: null });
    } catch (error) {
      toast.error("Lỗi khi từ chối lời mời");
    }
  };

  const sendFriendRequest = async () => {
    try {
      const res = await api.post(`/v1/friend-request/send/${username}`);
      if (res.data.code === 200) {
        toast.success("Gửi lời mời thành công");
        onProfileUpdate({ ...profileData, request: "OUT" });
      }
    } catch (error) {
      console.error("Lỗi gửi lời mời:", error);
    }
  };

  const acceptFriendRequest = async () => {
    // Optimistic update - cập nhật ngay lập tức
    const optimisticData = {
      ...profileData,
      isFriend: true,
      request: null,
      friendCount: profileData.friendCount + 1
    };
    
    onProfileUpdate(optimisticData);
    toast.success("Đã chấp nhận kết bạn");
    
    try {
      const res = await api.post(`/v1/friend-request/accept/${username}`);
      if (res.data.code !== 200) {
        // Nếu API thất bại, rollback lại trạng thái cũ
        onProfileUpdate({
          ...profileData,
          isFriend: false,
          request: "IN",
          friendCount: profileData.friendCount
        });
        toast.error("Có lỗi xảy ra khi chấp nhận kết bạn");
      }
    } catch (error) {
      // Rollback nếu có lỗi
      onProfileUpdate({
        ...profileData,
        isFriend: false,
        request: "IN",
        friendCount: profileData.friendCount
      });
      toast.error("Lỗi khi chấp nhận kết bạn");
    }
  };

  const unfriend = async () => {
    try {
      await api.delete(`/v1/friends/${username}`);
      toast.success("Đã hủy kết bạn");
      onProfileUpdate({
        ...profileData,
        isFriend: false,
        friendCount: profileData.friendCount - 1
      });
    } catch (error) {
      toast.error("Lỗi khi hủy kết bạn");
    }
  };

  const handleGetListFriend = async () => {
    if (profileData.friendCount === 0) {
      setFriendsList([]);
      setInitialModalTab("friends");
      setIsFriendsModalOpen(true);
      return;
    }

    setIsLoadingFriends(true);
    try {
      const res = await api.get(`/v1/friends/${username}`);
      
      if (res.data.code === 200) {
        const friends = res.data.body || [];
        setFriendsList(friends);
        setInitialModalTab("friends");
        setIsFriendsModalOpen(true);
      } else {
        toast.error("Không thể tải danh sách bạn bè");
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bạn bè:", error);
      toast.error("Có lỗi xảy ra, vui lòng thử lại sau");
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleGetMutualFriends = async () => {
    if (profileData.mutualFriendCount === 0) {
      setFriendsList([]);
      setInitialModalTab("mutual");
      setIsFriendsModalOpen(true);
      return;
    }

    setIsLoadingFriends(true);
    try {
      const friendsRes = await api.get(`/v1/friends/${username}`);
      
      if (friendsRes.data.code === 200) {
        const friends = friendsRes.data.body || [];
        setFriendsList(friends);
        setInitialModalTab("mutual");
        setIsFriendsModalOpen(true);
      } else {
        toast.error("Không thể tải danh sách bạn bè");
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bạn bè:", error);
      toast.error("Có lỗi xảy ra, vui lòng thử lại sau");
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const renderFriendButton = () => {
    if (profileData.isFriend) {
      return (
        <button
          onClick={unfriend}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
        >
          Hủy kết bạn
        </button>
      );
    }

    if (profileData.request) {
      if (profileData.request === "OUT") {
        return (
          <button
            onClick={cancelFriendRequest}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            Hủy lời mời
          </button>
        );
      } else if (profileData.request === "IN") {
        return (
          <div className="flex gap-2">
            <button
              onClick={acceptFriendRequest}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Đồng ý
            </button>
            <button
              onClick={declineFriendRequest}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Từ chối
            </button>
          </div>
        );
      }
    }

    // Chỉ hiển thị nút "Kết bạn" khi không phải bạn bè và không có request nào
    if (!profileData.isFriend && !profileData.request) {
      return (
        <button
          onClick={sendFriendRequest}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
        >
          Kết bạn
        </button>
      );
    }

    return null;
  };

  const handleTabClick = (tabName) => {
    if (onTabChange) {
      onTabChange(tabName);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-6">
        <Avatar
          src={avatar}
          alt="Avatar"
          className="rounded-full object-cover md:w-42 md:h-42 sm:w-40 sm:h-40"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">
              {profileData?.givenName || ""} {profileData?.familyName || ""}
            </h2>
            
            {/* Gom tất cả các nút vào một nhóm */}
            <div className="flex gap-2 flex-wrap">
              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Chỉnh sửa hồ sơ
                </button>
              ) : (
                <>
                  {renderFriendButton()}
                  <button
                    onClick={handleChatClick}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Nhắn tin
                  </button>
                  <button
                    onClick={handleBlockUser}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Chặn
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-gray-500 text-sm">@{profileData?.username}</p>

          <div className="flex gap-4 mt-1 text-sm">
            <span>
              <strong>{profileData.postCount || 0}</strong> Bài viết
            </span>
            <button 
              onClick={handleGetListFriend}
              disabled={isLoadingFriends}
              className="hover:text-blue-500 transition-colors duration-200 disabled:opacity-50 font-medium"
            >
              <strong>{profileData?.friendCount || 0}</strong> Bạn bè
              {isLoadingFriends && <span className="ml-1 animate-pulse">...</span>}
            </button>
            <button 
              onClick={handleGetMutualFriends}
              disabled={isLoadingFriends}
              className="hover:text-blue-500 transition-colors duration-200 disabled:opacity-50 font-medium"
            >
              <strong>{profileData?.mutualFriendsCount || 0}</strong> Bạn chung
              {isLoadingFriends && <span className="ml-1 animate-pulse">...</span>}
            </button>
          </div>

          <p className="text-sm mt-2 text-gray-700">
            {profileData?.bio || "Chưa có mô tả cá nhân."}
          </p>
        </div>
      </div>

      <div className="flex justify-around text-sm border-t border-gray-200 dark:border-gray-700 mt-4 pt-3">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
            activeTab === "posts"
              ? "bg-blue-500 text-white shadow-md hover:shadow-lg"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
          onClick={() => handleTabClick("posts")}
        >
          <span>🧱</span>
          <span>Bài viết</span>
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
            activeTab === "file"
              ? "bg-blue-500 text-white shadow-md hover:shadow-lg"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
          onClick={() => handleTabClick("file")}
        >
          <span>🖼</span>
          <span>Ảnh và video</span>
        </button>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50" 
          disabled
        >
          <span>💾</span>
          <span>Đã lưu</span>
        </button>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <EditProfileModal profileData={profileData} onSave={handleSaveProfile} />
      </Modal>

      <Modal 
        isOpen={isFriendsModalOpen} 
        onClose={() => setIsFriendsModalOpen(false)}
        size="small"
      >
        <FriendsListModal 
          username={username}
          initialFriends={friendsList}
          initialTab={initialModalTab}
        />
      </Modal>
    </div>
  );
}