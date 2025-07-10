"use client";

import { useState } from "react";
import { Edit, MessageCircle, UserPlus, UserMinus, UserCheck, UserX, Shield, MoreVertical, FileText, FileImage, Bookmark } from "lucide-react";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
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
        setIsDropdownOpen(false);
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
      setIsDropdownOpen(false);
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

  const renderActionButtons = () => {
    if (profileData.isFriend) {
      // Nếu đã là bạn bè: hiển thị nút nhắn tin
      return (
        <button
          onClick={handleChatClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#7a7d81] hover:bg-[#6b7280] text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
        >
          <MessageCircle size={16} />
          <span>Nhắn tin</span>
        </button>
      );
    }

    if (profileData.request) {
      if (profileData.request === "OUT") {
        return (
          <button
            onClick={cancelFriendRequest}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <UserMinus size={16} />
            <span>Hủy lời mời</span>
          </button>
        );
      } else if (profileData.request === "IN") {
        return (
          <div className="flex gap-2">
            <button
              onClick={acceptFriendRequest}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <UserCheck size={16} />
              <span>Đồng ý</span>
            </button>
            <button
              onClick={declineFriendRequest}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <UserX size={16} />
              <span>Từ chối</span>
            </button>
          </div>
        );
      }
    }

    // Nếu chưa là bạn bè và không có request nào: hiển thị nút kết bạn và nhắn tin
    if (!profileData.isFriend && profileData.request === "NONE") {
      return (
        <div className="flex gap-2">
          <button
            onClick={sendFriendRequest}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <UserPlus size={16} />
            <span>Kết bạn</span>
          </button>
          <button
            onClick={handleChatClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#7a7d81] hover:bg-[#6b7280] text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <MessageCircle size={16} />
            <span>Nhắn tin</span>
          </button>
        </div>
      );
    }

    return null;
  };

  const renderDropdownMenu = () => {
    if (!isDropdownOpen) return null;

    return (
      <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] z-50">
        {profileData.isFriend && (
          <button
            onClick={unfriend}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-t-lg"
          >
            <UserMinus size={16} />
            <span>Hủy kết bạn</span>
          </button>
        )}
        <button
          onClick={handleBlockUser}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg"
        >
          <Shield size={16} />
          <span>Chặn</span>
        </button>
      </div>
    );
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
          className="rounded-full object-cover w-24 h-24 sm:w-32 sm:h-32 shadow-md"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                {profileData?.givenName || ""} {profileData?.familyName || ""}
              </h2>
            </div>
            
            {/* Các nút action luôn ở cùng vị trí */}
         
          </div>
          <div className="flex gap-4 py-2 items-center">
          <p className="text-[var(--muted-foreground)] text-sm mt-1">@{profileData?.username}</p>
   <div className="flex gap-2 items-center">
              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Edit size={16} />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              ) : (
                <>
                  {renderActionButtons()}
                  <div className="relative">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center justify-center w-10 h-10 bg-[var(--muted)] hover:bg-[var(--accent)] rounded-full text-[var(--foreground)] shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {renderDropdownMenu()}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-[var(--foreground)]">
              <strong>{profileData.postCount || 0}</strong> Bài viết
            </span>
            <button 
              onClick={handleGetListFriend}
              disabled={isLoadingFriends}
              className="hover:text-blue-500 transition-colors duration-200 disabled:opacity-50 font-medium text-[var(--foreground)]"
            >
              <strong>{profileData?.friendCount || 0}</strong> Bạn bè
              {isLoadingFriends && <span className="ml-1 animate-pulse">...</span>}
            </button>
            <button 
              onClick={handleGetMutualFriends}
              disabled={isLoadingFriends}
              className="hover:text-blue-500 transition-colors duration-200 disabled:opacity-50 font-medium text-[var(--foreground)]"
            >
              <strong>{profileData?.mutualFriendsCount || 0}</strong> Bạn chung
              {isLoadingFriends && <span className="ml-1 animate-pulse">...</span>}
            </button>
          </div>

          <p className="text-sm mt-2 text-[var(--muted-foreground)]">
            {profileData?.bio || "Chưa có mô tả cá nhân."}
          </p>
        </div>
      </div>

      <div className="flex justify-around text-sm border-t border-[var(--border)] mt-4 pt-3">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
            activeTab === "posts"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md hover:shadow-lg"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          onClick={() => handleTabClick("posts")}
        >
          <FileText size={16} />
          <span>Bài viết</span>
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
            activeTab === "file"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md hover:shadow-lg"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          onClick={() => handleTabClick("file")}
        >
          <FileImage size={16} />
          <span>Ảnh và video</span>
        </button>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-[var(--muted-foreground)] cursor-not-allowed opacity-50" 
          disabled
        >
          <Bookmark size={16} />
          <span>Đã lưu</span>
        </button>
      </div>

      {/* Overlay để đóng dropdown khi click outside */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

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