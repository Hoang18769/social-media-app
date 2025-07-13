"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import { playRingtone, stopSound, initAudioSystem, preloadAudio } from "@/utils/playSound";
import api from "@/utils/axios";
import toast from "react-hot-toast";

function decodeJWT(token) {
  try {
    return jwtDecode(token);
  } catch (e) {
    console.error("[DEBUG] Failed to decode JWT:", e);
    return null;
  }
}

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCaller, setIncomingCaller] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callStatus, setCallStatus] = useState("chưa có gì xảy ra");
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [callerName, setCallerName] = useState("");
  const [isCallEnding, setIsCallEnding] = useState(false);
  
  const [mediaPermissions, setMediaPermissions] = useState({
    audio: false,
    video: false,
  });

  const clientRef = useRef(null);
  const currentCallRef = useRef(null);
  const beTokenRef = useRef("");

  // Khởi tạo hệ thống âm thanh và preload ringtone
  useEffect(() => {
    // Khởi tạo audio system
    initAudioSystem();
    
    // Preload ringtone
    preloadAudio("/ringtone.mp3");
    
    // Yêu cầu notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log("[DEBUG] Notification permission:", permission);
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.StringeeClient) {
      const script = document.createElement("script");
      script.src = "/libs/latest.sdk.bundle.min.js";
      script.async = true;
      script.onload = () => {
        console.log("[DEBUG] Stringee SDK script loaded ✅");
      };
      document.body.appendChild(script);
    }
  }, []);

  const createMediaStream = useCallback(async (isVideo = false) => {
    try {
      console.log("[DEBUG] Creating media stream...", { isVideo });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      });
      setMediaPermissions({
        audio: stream.getAudioTracks().length > 0,
        video: stream.getVideoTracks().length > 0,
      });
      return stream;
    } catch (error) {
      console.error("[DEBUG] Media error:", error);
      setCallStatus("Permission denied: " + error.message);
      setMediaPermissions({ audio: false, video: false });
      return null;
    }
  }, []);

  const cleanupCall = useCallback(
    (stt) => {
      console.log("[DEBUG] Cleaning up call...");
      
      // Dừng âm thanh
      stopSound();
      
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
      }
      setRemoteStream(null);
      setLocalStream(null);
      setCurrentCall(null);
      setIncomingCaller(null);
      setCallStatus("Cleaned");
      setIsCallEnding(false);
      currentCallRef.current = null;
    },
    [localStream, remoteStream]
  );

  const setupCallEvents = useCallback(
    (call) => {
      console.log("[DEBUG] Setting up call events");

      call.on("addremotestream", (stream) => {
        console.log("[DEBUG] ✅ addRemoteStream event triggered!", call);
        const realStream = stream?.stream || stream;
        if (realStream) {
          console.log("[DEBUG] ✅ Setting remoteStream - ID:", realStream.id);
          console.log(
            "[DEBUG] ✅ Remote stream tracks:",
            realStream.getTracks().length
          );
          setRemoteStream(realStream);
          setCallStatus("Connected - Remote stream received");
        } else {
          console.error("[DEBUG] ❌ Remote stream is null/undefined");
        }
      });

      call.on("addlocalstream", (stream) => {
        console.log("[DEBUG] ✅ addLocalStream event triggered!", call);
        const realStream = stream?.stream || stream;
        if (realStream) {
          console.log("[DEBUG] ✅ Setting localStream - ID:", realStream.id);
          console.log(
            "[DEBUG] ✅ Local stream tracks:",
            realStream.getTracks().length
          );
          setLocalStream(realStream);
        } else {
          console.error("[DEBUG] ❌ Local stream is null/undefined");
        }
      });

      call.on("signalingstate", (state) => {
        console.log("[DEBUG] 📡 Signaling state changed:", state);
        if (state.reason === "answered") {
          console.log("[DEBUG] 📞 Call was answered!");
          setCallStatus("Call answered");
          // Dừng ringtone khi cuộc gọi được trả lời
          stopSound();
        } else if (
          ["Ended", "Busy here", "Rejected", "Disconnected"].includes(
            state.reason
          )
        ) {
          console.log("[DEBUG] 📞 Call ending with reason:", state.reason);
          setIsCallEnding(true);
          setTimeout(() => cleanupCall(1), 1500);
        }
      });

      call.on("mediastate", (state) => {
        console.log("[DEBUG] 🎥 Media state changed:", state);
        if (state.code === 0) {
          console.log("[DEBUG] 🎥 Media disconnected");
          setIsCallEnding(true);
          setTimeout(() => cleanupCall(2), 1500);
        }
      });

      call.on("disconnect", () => {
        console.log("[DEBUG] 📞 Call disconnected event");
        setIsCallEnding(true);
        setTimeout(() => cleanupCall(3), 1500);
      });

      call.on("remotevideostatuschange", (enabled) => {
        console.log("[DEBUG] 🎥 Remote video status change:", enabled);
      });

      call.on("remoteaudiostatuschange", (enabled) => {
        console.log("[DEBUG] 🔊 Remote audio status change:", enabled);
      });
    },
    [cleanupCall]
  );

  function connectStringeeClient(token, onIncomingCall, onConnectionChange) {
    const client = new window.StringeeClient();
    client.connect(token);

    client.on("connect", () => {
      console.log("[DEBUG] Stringee connected successfully ✅");
      onConnectionChange(true);
    });

    client.on("disconnect", () => {
      console.warn("[DEBUG] Stringee disconnected ❌");
      onConnectionChange(false);
    });

    client.on("incomingcall", (call) => {
      console.log("[DEBUG] Incoming call event fired 📞");
      
      // Phát ringtone với hệ thống nâng cao
      playRingtone("/ringtone.mp3", {
        loop: true,
        duration: 30000, // 30 giây
        volume: 0.8,
      });
      
      onIncomingCall(call);
      setupCallEvents(call);
    });

    client.on("requestnewtoken", async () => {
      console.warn("[DEBUG] Token expired — need to request new one 🔄");
      onConnectionChange(false);
    });

    return client;
  }

  const initializeCall = useCallback(async (beToken) => {
    beTokenRef.current = beToken;
    const payload = decodeJWT(beToken);
    if (payload?.username) setCallerName(payload.username);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/stringee/create-token`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${beToken}` },
        }
      );
      const data = await res.json();
      if (data.body?.token) setToken(data.body.token);
    } catch (err) {
      setCallStatus("Token fetch failed");
    }
  }, []);

  useEffect(() => {
    if (token && window.StringeeClient) {
      const client = connectStringeeClient(
        token,
        (incomingCall) => {
          currentCallRef.current = incomingCall;
          setIncomingCaller({
            name: incomingCall.fromAlias || incomingCall.fromNumber,
          });
        },
        (connected) => {
          setIsConnected(connected);
          setCallStatus(connected ? "Connected" : "Disconnected");
        }
      );
      clientRef.current = client;
    }
  }, [token]);

  const makeCall = useCallback(
    async (callee, isVideo = false) => {
      console.log("[DEBUG] Making call to:", callee, "isVideo:", isVideo);

      const stream = await createMediaStream(isVideo);
      console.log(stream.getTracks());
      if (!stream) {
        console.error("[DEBUG] Failed to create media stream");
        setCallStatus("Media permission denied");
        return;
      }

      try {
        const res = await api.get(`/v1/call/init/${callee.trim()}`);
        if(res.data.code===7012 || res.data.code===7011){
            toast.error("Máy bận");
            return;
        }

        const call = new window.StringeeCall(
          clientRef.current,
          callerName,
          callee.trim(),
          isVideo,
          {
            audio: true,
            video: isVideo,
          }
        );

        setupCallEvents(call);

        call.localStream = stream;

        currentCallRef.current = call;
        setCurrentCall(call);
        setLocalStream(stream);
        setCallStatus("Initiating call...");
        call.makeCall((res) => {
          console.log("[DEBUG] makeCall response:", res);
          if (res.r === 0) {
            console.log("[DEBUG] Call connected successfully");
            setCallStatus("Connected");
          } else {
            console.error(
              "[DEBUG] Call failed with code:",
              res.r,
              "message:",
              res.message
            );
            setCallStatus(`Call failed: ${res.message || "Unknown error"}`);
            console.log(res);
            stream.getTracks().forEach((track) => track.stop());
            cleanupCall(4);
          }
        });
      } catch (error) {
          if(error.response.code)
              toast("máy bận");
        console.error("[DEBUG] Init call failed:", error);
        stream.getTracks().forEach((track) => track.stop());
        setCallStatus("Init call failed");
      }
    },
    [callerName, createMediaStream, setupCallEvents, cleanupCall]
  );

  const acceptCall = useCallback(async () => {
    const call = currentCallRef.current;
    if (!call) return;

    console.log("[DEBUG] Accepting call, isVideo:", call.isVideoCall);
    
    // Dừng ringtone
    stopSound();
    
    setupCallEvents(call);

    const stream = await createMediaStream(call.isVideoCall);
    console.log(stream);

    if (!stream) return;

    call.localStream = stream;

    setLocalStream(stream);
    setIncomingCaller(null);
    setCurrentCall(call);

    call.answer();
  }, [createMediaStream, setupCallEvents]);

  const rejectCall = useCallback(() => {
    const call = currentCallRef.current;
    
    // Dừng ringtone
    stopSound();
    
    if (!call) return;
    call.reject(() => cleanupCall(5));
  }, [cleanupCall]);

  const endCall = useCallback(() => {
    const call = currentCall || currentCallRef.current;
    if (!call) return;
    setIsCallEnding(true);
    setCallStatus("Ending call...");
    call.hangup(() => {
      setTimeout(() => cleanupCall(6), 1500);
    });
  }, [currentCall, cleanupCall]);

  // Simplified toggle functions - only for device level control
  const toggleMute = useCallback(
    (muted) => {
      if (!localStream) {
        console.warn("[DEBUG] Cannot toggle mute - no local stream");
        return;
      }

      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("[DEBUG] No audio tracks available");
        return;
      }

      console.log("[DEBUG] Toggling mute:", muted);
      audioTracks.forEach((track) => {
        track.enabled = !muted;
      });

      // Also call Stringee API if available
      const call = currentCallRef.current;
      if (call && typeof call.mute === "function") {
        call.mute(muted);
      }
    },
    [localStream]
  );

const toggleLocalVideo = useCallback(
  (enabled) => {
    if (!localStream) {
      console.warn("[DEBUG] Cannot toggle video - no local stream");
      return;
    }

    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.warn("[DEBUG] No video tracks available");
      return;
    }

    console.log("[DEBUG] Toggling local video enabled:", enabled);
    videoTracks.forEach((track) => {
      track.enabled = !enabled;
    });

    // Also call Stringee API if available
    const call = currentCallRef.current;
    if (call && typeof call.enableLocalVideo === "function") {
      call.enableLocalVideo(!enabled); // Stringee API: enabled=true thì enableLocalVideo=false
    }
  },
  [localStream]
);
  return (
    <CallContext.Provider
      value={{
        isConnected,
        currentCall,
        callStatus,
        incomingCaller,
        remoteStream,
        localStream,
        callerName,
        isCallEnding,
        mediaPermissions,
        initializeCall,
        makeCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleLocalVideo,
        cleanupCall,
        createMediaStream,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider ❌");
  }
  return context;
};