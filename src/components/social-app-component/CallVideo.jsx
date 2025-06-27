"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCall } from "@/context/CallContext";

const CallVideo = ({ onCallEnd }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { 
    endCall, 
    callStatus, 
    currentCall, 
    isCallEnding, 
    cleanupCall,
    localStream,
    remoteStream,
    mediaPermissions
  } = useCall();
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [autoplayError, setAutoplayError] = useState(false);
  const [currentLocalStream, setCurrentLocalStream] = useState(null);

  useEffect(() => {
    console.log("[DEBUG] CallVideo - callStatus:", callStatus);
    console.log("[DEBUG] CallVideo - currentCall:", !!currentCall);
    console.log("[DEBUG] CallVideo - isCallEnding:", isCallEnding);
    console.log("[DEBUG] CallVideo - localStream:", !!localStream);
    console.log("[DEBUG] CallVideo - remoteStream:", !!remoteStream);
  }, [callStatus, currentCall, isCallEnding, localStream, remoteStream]);

  useEffect(() => {
    if (localStream) {
      setCurrentLocalStream(localStream);
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();
      
      setIsCameraOn(videoTracks.length > 0 && videoTracks[0].enabled);
      setIsMicOn(audioTracks.length > 0 && audioTracks[0].enabled);
      
      console.log("[DEBUG] Stream state updated - Camera:", videoTracks.length > 0 && videoTracks[0].enabled, "Mic:", audioTracks.length > 0 && audioTracks[0].enabled);
    }
  }, [localStream]);

  useEffect(() => {
    if (currentLocalStream && localVideoRef.current) {
      console.log("[DEBUG] Assigning local stream to video element");
      localVideoRef.current.srcObject = currentLocalStream;
      
      localVideoRef.current.play().catch(error => {
        console.warn("[DEBUG] Local video autoplay failed:", error);
        setAutoplayError(true);
      });
    }
  }, [currentLocalStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log("[DEBUG] Assigning remote stream to video element");
      remoteVideoRef.current.srcObject = remoteStream;
      
      remoteVideoRef.current.play().catch(error => {
        console.warn("[DEBUG] Remote video autoplay failed:", error);
        setAutoplayError(true);
      });
    }
  }, [remoteStream]);

  const getMediaStream = async (video, audio) => {
    try {
      if (!video && !audio) {
        return null;
      }
      
      const constraints = {};
      if (video && mediaPermissions.video) {
        constraints.video = true;
      }
      if (audio && mediaPermissions.audio) {
        constraints.audio = true;
      }
      
      if (Object.keys(constraints).length === 0) {
        return null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[DEBUG] New media stream created:", stream);
      return stream;
    } catch (error) {
      console.error("[DEBUG] Error getting media stream:", error);
      return null;
    }
  };

  const stopCurrentStream = () => {
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach(track => {
        track.stop();
        console.log("[DEBUG] Stopped track:", track.kind);
      });
    }
  };

  const updateStream = async (newCameraState, newMicState) => {
    console.log("[DEBUG] Updating stream - Camera:", newCameraState, "Mic:", newMicState);
    
    // Stop current stream
    stopCurrentStream();
    
    // Get new stream with updated constraints
    const newStream = await getMediaStream(newCameraState, newMicState);
    
    if (newStream) {
      setCurrentLocalStream(newStream);
      
      // Update the original localStream if it exists (for WebRTC connection)
      if (localStream && currentCall) {
        // Replace tracks in the peer connection
        const sender = currentCall.getSenders ? currentCall.getSenders() : [];
        
        if (newCameraState && newStream.getVideoTracks().length > 0) {
          const videoSender = sender.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(newStream.getVideoTracks()[0]);
          }
        }
        
        if (newMicState && newStream.getAudioTracks().length > 0) {
          const audioSender = sender.find(s => s.track && s.track.kind === 'audio');
          if (audioSender) {
            await audioSender.replaceTrack(newStream.getAudioTracks()[0]);
          }
        }
      }
    } else {
      setCurrentLocalStream(null);
    }
  };

  const toggleCamera = async () => {
    if (!mediaPermissions.video) {
      console.warn("[DEBUG] Camera permission not available");
      return;
    }
    
    const newCameraState = !isCameraOn;
    setIsCameraOn(newCameraState);
    console.log("[DEBUG] Camera toggled:", newCameraState);
    
    await updateStream(newCameraState, isMicOn);
  };

  const toggleMicrophone = async () => {
    if (!mediaPermissions.audio) {
      console.warn("[DEBUG] Microphone permission not available");
      return;
    }
    
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    console.log("[DEBUG] Microphone toggled:", newMicState);
    
    await updateStream(isCameraOn, newMicState);
  };

  const handleEndCall = () => {
    console.log("[DEBUG] Handle end call clicked");
    stopCurrentStream();
    endCall();
  };

  const handleClose = () => {
    console.log("[DEBUG] Handle close clicked");
    stopCurrentStream();
    cleanupCall(11);
    if (onCallEnd) {
      onCallEnd();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCurrentStream();
    };
  }, []);

  if (!currentCall && !isCallEnding) {
    console.log("[DEBUG] No call and not ending, hiding CallVideo");
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-[999] flex items-center justify-center">
      {isCallEnding ? (
        <div className="text-center text-white space-y-4">
          <div className="text-6xl mb-4">📞</div>
          <p className="text-2xl font-semibold">Cuộc gọi đã kết thúc</p>
          <p className="text-lg text-gray-300">
            {callStatus === "Mất kết nối media" ? "Mất kết nối" : 
             callStatus === "Cuộc gọi ngắt kết nối" ? "Đã ngắt kết nối" : 
             "Đang đóng..."}
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={handleClose}
              className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Đóng ngay
            </button>
            {callStatus === "Mất kết nối media" && (
              <button
                onClick={() => {
                  handleClose();
                }}
                className="bg-green-600 px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Gọi lại
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-black bg-opacity-50 px-4 py-2 rounded-full text-white text-sm">
              {callStatus}
            </div>
          </div>

          <div className="absolute inset-0 z-1">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-white text-center">
                  <div className="text-6xl mb-4">👤</div>
                  <p className="text-xl">Đang chờ video từ đối phương...</p>
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-10 right-10 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white z-10">
            {currentLocalStream && isCameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-sm">
                    {!currentLocalStream ? "Đang khởi tạo camera..." : "Camera tắt"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4 z-20">
            <button
              onClick={toggleCamera}
              disabled={!mediaPermissions.video}
              className={`${
                isCameraOn 
                  ? "bg-gray-600 hover:bg-gray-700" 
                  : "bg-red-600 hover:bg-red-700"
              } ${!mediaPermissions.video ? "opacity-50 cursor-not-allowed" : ""} text-white px-4 py-3 rounded-full shadow-lg transition-colors flex items-center justify-center w-12 h-12`}
              title={isCameraOn ? "Tắt camera" : "Bật camera"}
            >
              <span className="text-lg">
                {isCameraOn ? "📹" : "📷"}
              </span>
            </button>

            <button
              onClick={toggleMicrophone}
              disabled={!mediaPermissions.audio}
              className={`${
                isMicOn 
                  ? "bg-gray-600 hover:bg-gray-700" 
                  : "bg-red-600 hover:bg-red-700"
              } ${!mediaPermissions.audio ? "opacity-50 cursor-not-allowed" : ""} text-white px-4 py-3 rounded-full shadow-lg transition-colors flex items-center justify-center w-12 h-12`}
              title={isMicOn ? "Tắt mic" : "Bật mic"}
            >
              <span className="text-lg">
                {isMicOn ? "🎤" : "🔇"}
              </span>
            </button>

            <button
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full shadow-lg transition-colors flex items-center space-x-2"
            >
              <span>📞</span>
              <span>Kết thúc</span>
            </button>
          </div>

          <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
            {!isCameraOn && (
              <div className="bg-red-600 bg-opacity-80 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <span>📷</span>
                <span>Camera tắt</span>
              </div>
            )}
            {!isMicOn && (
              <div className="bg-red-600 bg-opacity-80 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <span>🔇</span>
                <span>Mic tắt</span>
              </div>
            )}
            {!mediaPermissions.audio && (
              <div className="bg-red-600 bg-opacity-80 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <span>🎤</span>
                <span>Mic không khả dụng</span>
              </div>
            )}
            {!mediaPermissions.video && (
              <div className="bg-red-600 bg-opacity-80 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <span>📷</span>
                <span>Camera không khả dụng</span>
              </div>
            )}
            {autoplayError && (
              <div className="bg-yellow-600 bg-opacity-80 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <span>⚠️</span>
                <span>
                  Video không phát tự động
                  <button onClick={() => {
                    if (localVideoRef.current) localVideoRef.current.play();
                    if (remoteVideoRef.current) remoteVideoRef.current.play();
                    setAutoplayError(false);
                  }} className="ml-2 underline">Bật</button>
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CallVideo;