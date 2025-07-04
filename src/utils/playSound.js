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
 * Phát âm thanh với nhiều phương pháp bypass autoplay
 */
export function playSound(url, { loop = false, volume = 1, duration = 20000 } = {}) {
  stopSound(); // Dừng âm thanh cũ nếu có

  // Phương pháp 1: Thử phát trực tiếp
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
        
        // Phương pháp 2: Thử với AudioContext
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
            await currentAudio.play();
            console.log("[playSound] Audio played after AudioContext resume");
          } catch (resumeError) {
            console.warn("[playSound] AudioContext resume failed:", resumeError);
            
            // Phương pháp 3: Hiển thị notification yêu cầu user interaction
            showPlayPrompt(url, { loop, volume, duration });
          }
        } else {
          showPlayPrompt(url, { loop, volume, duration });
        }
      });
  }

  // Tự động tắt sau `duration` ms
  if (duration) {
    stopTimeout = setTimeout(() => {
      stopSound();
    }, duration);
  }

  return currentAudio;
}

/**
 * Hiển thị prompt yêu cầu user click để phát âm thanh
 */
function showPlayPrompt(url, options) {
  // Tạo overlay
  const overlay = document.createElement('div');
  overlay.id = 'audio-play-prompt';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: Arial, sans-serif;
  `;

  // Tạo modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  modal.innerHTML = `
    <h3 style="margin-top: 0; color: #333;">📞 Cuộc gọi đến</h3>
    <p style="color: #666; margin-bottom: 20px;">Nhấn để phát nhạc chuông</p>
    <button id="play-audio-btn" style="
      background: #4CAF50;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      margin-right: 10px;
    ">📱 Phát nhạc</button>
    <button id="dismiss-audio-btn" style="
      background: #f44336;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
    ">❌ Tắt tiếng</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Xử lý sự kiện
  document.getElementById('play-audio-btn').onclick = () => {
    document.body.removeChild(overlay);
    isUserInteracted = true;
    
    // Phát âm thanh sau user interaction
    currentAudio = new Audio(url);
    currentAudio.loop = options.loop;
    currentAudio.volume = options.volume;
    currentAudio.play().catch(err => 
      console.warn("[playSound] Still failed after user interaction:", err)
    );
    
    // Tự động tắt sau duration
    if (options.duration) {
      stopTimeout = setTimeout(() => {
        stopSound();
      }, options.duration);
    }
  };

  document.getElementById('dismiss-audio-btn').onclick = () => {
    document.body.removeChild(overlay);
  };

  // Tự động đóng sau 10 giây
  setTimeout(() => {
    if (document.getElementById('audio-play-prompt')) {
      document.body.removeChild(overlay);
    }
  }, 10000);
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
  
  // Xóa prompt nếu có
  const prompt = document.getElementById('audio-play-prompt');
  if (prompt) {
    document.body.removeChild(prompt);
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