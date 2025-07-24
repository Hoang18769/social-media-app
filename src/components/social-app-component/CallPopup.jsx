"use client";

import React, { useEffect } from "react";
import { enableAudioOnUserAction, stopSound } from "@/utils/playSound";
import Image from "next/image";
import Avatar from "@/components/ui-components/Avatar";

const CallPopup = ({ caller, onAccept, onReject }) => {
  // Nếu không có caller thì không hiển thị
  if (!caller) return null;

  const handleAccept = () => {
    enableAudioOnUserAction(); // Kích hoạt audio system
    stopSound(); // Dừng ringtone
    onAccept();
  };

  const handleReject = () => {
    enableAudioOnUserAction(); // Kích hoạt audio system
    stopSound(); // Dừng ringtone
    onReject();
  };

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      stopSound();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mb-6">
            {/* Avatar hoặc icon */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Avatar
                  src={caller?.profilePictureUrl}
                  alt={caller.name}
                  className="w-12 h-12"
              />            </div>
            
            {/* Tiêu đề và tên người gọi */}
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              Cuộc gọi đến
            </h3>
            <p className="text-gray-600 text-lg font-medium">
              {caller.name || "Unknown"}
            </p>
            
            {/* Thông tin thêm nếu có */}
            {caller.number && caller.number !== caller.name && (
              <p className="text-gray-500 text-sm mt-1">
                {caller.number}
              </p>
            )}
          </div>

          {/* Animation pulse cho icon */}
          <div className="mb-6">
            <div className="flex justify-center">
              <div className="animate-pulse">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-1"></div>
              </div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleReject}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors shadow-md active:scale-95"
              aria-label="Từ chối cuộc gọi"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>❌</span>
                <span>Từ chối</span>
              </span>
            </button>
            
            <button
              onClick={handleAccept}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors shadow-md active:scale-95"
              aria-label="Chấp nhận cuộc gọi"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>✅</span>
                <span>Chấp nhận</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallPopup;