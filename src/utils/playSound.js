// utils/playSound.js
let currentAudio = null;
let stopTimeout = null;
let audioContext = null;
let isUserInteracted = false;

/**
 * Khởi tạo AudioContext và đăng ký user interaction
 */
export function initAudioSystem() {
  // Tạo AudioContext
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  // Đăng ký các sự kiện user interaction
  const events = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];
  
  const enableAudio = () => {
    isUserInteracted = true;
    
    // Resume AudioContext nếu bị suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Tạo một audio element im lặng để "mở khóa" autoplay
    const silentAudio = new Audio();
    silentAudio.volume = 0;
    silentAudio.play().catch(() => {});
    
    // Xóa event listeners sau khi đã tương tác
    events.forEach(event => {
      document.removeEventListener(event, enableAudio);
    });
  };
  
  // Thêm event listeners
  events.forEach(event => {
    document.addEventListener(event, enableAudio, { once: true });
  });
}

/**
 * Phát âm thanh với cách tiếp cận đơn giản hơn
 */
export function playSound(url, { loop = false, volume = 1, duration = 20000 } = {}) {
  stopSound(); // Dừng âm thanh cũ nếu có

  currentAudio = new Audio(url);
  currentAudio.loop = loop;
  currentAudio.volume = volume;

  const playPromise = currentAudio.play();
  
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log("[playSound] Audio played successfully");
      })
      .catch(async (error) => {
        console.warn("[playSound] Direct play failed:", error);
        
        // Thử với AudioContext nếu có
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
            await currentAudio.play();
            console.log("[playSound] Audio played after AudioContext resume");
          } catch (resumeError) {
            console.warn("[playSound] AudioContext resume failed:", resumeError);
            // Không hiển thị modal, chỉ log lỗi
            console.log("[playSound] Audio autoplay blocked - waiting for user interaction");
          }
        } else {
          // Không hiển thị modal, chỉ log lỗi
          console.log("[playSound] Audio autoplay blocked - waiting for user interaction");
        }
      });
  }

  if (duration) {
    stopTimeout = setTimeout(() => {
      stopSound();
    }, duration);
  }

  return currentAudio;
}

/**
 * Tạo notification âm thanh cho ringtone
 */
export function playRingtone(url, { loop = true, volume = 1, duration = 30000 } = {}) {
  // Thử phát trực tiếp trước
  const result = playSound(url, { loop, volume, duration });
  
  // Nếu có notification API, tạo thông báo
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('📞 Cuộc gọi đến', {
      body: 'Bạn có cuộc gọi đến',
      icon: '/favicon.ico',
      requireInteraction: true,
      silent: false // Để browser tự phát âm thanh notification
    });
  }
  
  return result;
}

/**
 * Thử phát lại âm thanh sau khi có user interaction
 * Hàm này có thể được gọi từ các button accept/reject call
 */
export function retryPlaySound(url, options = {}) {
  if (!isUserInteracted) {
    isUserInteracted = true;
    
    // Resume AudioContext nếu cần
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }
  
  return playSound(url, options);
}

/**
 * Hàm để kích hoạt âm thanh từ các button interaction
 * Gọi hàm này trong onClick của các button accept/reject
 */
export function enableAudioOnUserAction() {
  if (!isUserInteracted) {
    isUserInteracted = true;
    
    // Resume AudioContext nếu cần
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Nếu có âm thanh đang cố phát, thử phát lại
    if (currentAudio && currentAudio.paused) {
      currentAudio.play().catch(err => 
        console.warn("[enableAudioOnUserAction] Still failed:", err)
      );
    }
  }
}

/**
 * Dừng phát âm thanh hiện tại
 */
export function stopSound() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (stopTimeout) {
    clearTimeout(stopTimeout);
    stopTimeout = null;
  }
}

/**
 * Kiểm tra xem autoplay có được hỗ trợ không
 */
export function canAutoplay() {
  return isUserInteracted || audioContext?.state === 'running';
}

/**
 * Preload audio để cải thiện hiệu suất
 */
export function preloadAudio(url) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.volume = 0;
  
  // Thử phát im lặng để preload
  if (isUserInteracted) {
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
    }).catch(() => {});
  }
  
  return audio;
}

// Tự động khởi tạo khi import
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initAudioSystem);
  
  // Nếu DOM đã load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initAudioSystem();
  }
}