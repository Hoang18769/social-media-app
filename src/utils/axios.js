import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
});

let isRefreshing = false;
let refreshSubscribers = [];
const tokenEventListeners = [];

// Helper function để kiểm tra môi trường client
const isClient = typeof window !== "undefined";

// Improved Cookie utilities with proper formatting
const cookieUtils = {
  get: (name) => {
    if (!isClient) return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },
  
  set: (name, value, maxAge = 7 * 24 * 60 * 60) => {
    if (!isClient) return;
    
    // Build cookie string with all necessary attributes
    const isProduction = process.env.NODE_ENV === 'production';
    
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    cookieString += `; path=/`;
    cookieString += `; max-age=${maxAge}`;
    cookieString += `; SameSite=Lax`;
    
    // Only add Secure in production (HTTPS)
    if (isProduction) {
      cookieString += `; Secure`;
    }
    
    document.cookie = cookieString;
    
    console.log('🍪 Cookie set:', { 
      name, 
      value: value.substring(0, 20) + '...', 
      cookieString,
      success: document.cookie.includes(`${name}=`)
    });
    
    // Verify cookie was set
    // setTimeout(() => {
    //   const verification = cookieUtils.get(name);
    //   console.log('🔍 Cookie verification:', { 
    //     name, 
    //     found: !!verification,
    //     matches: verification === value
    //   });
    // }, 10);
  },
  
  remove: (name) => {
    if (!isClient) return;
    
    // Multiple approaches to ensure cookie removal
    const removeCookieStrings = [
      `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`,
      `${name}=; path=/; max-age=0; SameSite=Lax`,
      `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT`,
    ];
    
    removeCookieStrings.forEach(cookieString => {
      document.cookie = cookieString;
    });
    
    console.log('🗑️ Cookie removed:', name);
  }
};

// Enhanced auth storage with better error handling - ĐÃ SỬA: chỉ dùng accessToken
function setAuthStorage(token, userId, userName) {
  if (!isClient) return;
  
  console.log('💾 setAuthStorage called:', { 
    hasToken: !!token, 
    userId, 
    userName 
  });
  
  try {
    if (token) {
      const maxAge = 7 * 24 * 60 * 60; // 7 days
      
      // ĐÃ SỬA: chỉ set accessToken thôi
      cookieUtils.set('accessToken', token, maxAge);
      
      if (userId) {
        cookieUtils.set('userId', String(userId), maxAge);
      }
      if (userName) {
        cookieUtils.set('userName', userName, maxAge);
      }
      
      // ĐÃ SỬA: localStorage cũng chỉ set accessToken
      localStorage.setItem('accessToken', token);
      if (userId) localStorage.setItem('userId', String(userId));
      if (userName) localStorage.setItem('userName', userName);
      
      console.log('✅ Auth storage set successfully');
      
      // Log final state for debugging
      setTimeout(() => {
        console.log('🔍 Final auth state:', {
          cookieAccessToken: !!cookieUtils.get('accessToken'),
          cookieUserId: !!cookieUtils.get('userId'),
          localStorageAccessToken: !!localStorage.getItem('accessToken'),
          localStorageUserId: !!localStorage.getItem('userId'),
          allCookies: document.cookie
        });
      }, 50);
      
    } else {
      // Clear everything - ĐÃ SỬA: xóa accessToken thay vì token
      console.log('🧹 Clearing auth storage...');
      
      ['accessToken', 'userId', 'userName'].forEach(key => {
        cookieUtils.remove(key);
        localStorage.removeItem(key);
      });
      
      console.log('✅ Auth storage cleared');
    }
  } catch (error) {
    console.error('❌ Error in setAuthStorage:', error);
  }
}

export function onTokenRefresh(callback) {
  tokenEventListeners.push(callback);
  return () => {
    const index = tokenEventListeners.indexOf(callback);
    if (index > -1) tokenEventListeners.splice(index, 1);
  };
}

function notifyTokenRefresh(newToken) {
  tokenEventListeners.forEach(callback => {
    try {
      callback(newToken);
    } catch (error) {
      console.error('Error in token refresh callback:', error);
    }
  });
}

const PUBLIC_ENDPOINTS = [
  "/v1/auth/login",
  "/v1/auth/register", 
  "/v1/register",
  "/v1/register/verify",
  "/v1/forgot-password",
  "/v1/update-password",
  "/v1/auth/verify-email",
  "/v1/auth/refresh",
];

function isPublicEndpoint(url) {
  if (!url) return false;
  const path = url.split("?")[0];
  return PUBLIC_ENDPOINTS.includes(path);
}

api.interceptors.request.use(
  config => {
    if (config.skipAuth || isPublicEndpoint(config.url)) {
      return config;
    }
    
    // ĐÃ SỬA: chỉ tìm accessToken thôi
    const token = cookieUtils.get('accessToken') || localStorage.getItem("accessToken");
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  err => Promise.reject(err)
);

async function handleTokenRefresh(originalRequest) {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshSubscribers.push((token) => {
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        } else {
          reject(new Error("Failed to refresh token"));
        }
      });
    });
  }

  isRefreshing = true;
  try {
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/refresh`, 
      {},
      { 
        withCredentials: true,
        headers: { "Content-Type": "application/json" }
      }
    );

    const newToken = data.body?.token;
    if (!newToken) throw new Error("No new token in refresh response");

    // Get current user info
    const userId = getUserId();
    const userName = getUserName();
    
    // Update token storage
    setAuthStorage(newToken, userId, userName);
    
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    originalRequest.headers.Authorization = `Bearer ${newToken}`;

    // Notify subscribers
    refreshSubscribers.forEach(cb => cb(newToken));
    refreshSubscribers = [];
    notifyTokenRefresh(newToken);

    return api(originalRequest);
  } catch (refreshErr) {
    console.error("❌ Token refresh failed:", refreshErr);
    clearSession();
    if (isClient) {
      setTimeout(() => window.location.href = "/register", 1000);
    }
    return Promise.reject(refreshErr);
  } finally {
    isRefreshing = false;
  }
}

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicEndpoint(originalRequest.url) &&
      !originalRequest.skipAuth &&
      originalRequest.url !== "/v1/auth/refresh"
    ) {
      originalRequest._retry = true;
      return handleTokenRefresh(originalRequest);
    }
    return Promise.reject(error);
  }
);

// Enhanced setAuthToken function with validation - ĐÃ SỬA: đổi tên param và chỉ dùng accessToken
export function setAuthToken(accessToken, userId, userName) {
  console.log('🔐 setAuthToken called:', { 
    hasToken: !!accessToken, 
    tokenLength: accessToken?.length,
    userId, 
    userName,
    timestamp: new Date().toLocaleTimeString()
  });
  
  if (!accessToken || !userId) {
    console.error('❌ Invalid accessToken or userId provided to setAuthToken');
    return false;
  }
  
  try {
    // Store in both cookies and localStorage
    setAuthStorage(accessToken, userId, userName);
    
    // Set axios default header
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    
    // Notify listeners
    notifyTokenRefresh(accessToken);
    
    console.log('✅ Auth token set successfully');
    return true;
  } catch (error) {
    console.error('❌ Error setting auth token:', error);
    return false;
  }
}

// ĐÃ SỬA: chỉ get accessToken
export function getAuthToken() {
  return cookieUtils.get('accessToken') || localStorage.getItem("accessToken");
}

export function getUserId() {
  return cookieUtils.get('userId') || localStorage.getItem("userId");
}

export function getUserName() {
  return cookieUtils.get('userName') || localStorage.getItem("userName");
}

// Get complete auth info - ĐÃ SỬA: log accessToken
export function getAuthInfo() {
  if (!isClient) return null;
  
  const token = getAuthToken();
  const userId = getUserId();
  const userName = getUserName();
  
  console.log('🔍 Getting auth info:', { 
    hasToken: !!token, 
    hasUserId: !!userId, 
    hasUserName: !!userName,
    tokenSource: cookieUtils.get('accessToken') ? 'cookie' : localStorage.getItem('accessToken') ? 'localStorage' : 'none',
    userIdSource: cookieUtils.get('userId') ? 'cookie' : localStorage.getItem('userId') ? 'localStorage' : 'none',
    timestamp: new Date().toLocaleTimeString()
  });
  
  return token && userId ? { token, userId, userName } : null;
}

export function isTokenValid() {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const now = Math.floor(Date.now() / 1000);
    const isValid = payload.exp ? payload.exp > now : true;
    
    console.log('🔍 Token validation:', { 
      hasToken: !!token,
      isValid,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'No expiry',
      now: new Date(now * 1000).toLocaleString()
    });
    
    return isValid;
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return false;
  }
}

// Check if user is authenticated
export function isAuthenticated() {
  const authInfo = getAuthInfo();
  const tokenValid = isTokenValid();
  const authenticated = authInfo !== null && tokenValid;
  
  console.log('🔍 Authentication check:', { 
    hasAuthInfo: !!authInfo,
    tokenValid,
    authenticated,
    timestamp: new Date().toLocaleTimeString()
  });
  
  return authenticated;
}

export function clearSession() {
  console.log('🚪 Clearing session...');
  
  // Clear all auth storage
  setAuthStorage(null);
  
  // Remove axios header
  delete api.defaults.headers.common.Authorization;
  
  // Notify listeners
  notifyTokenRefresh(null);
  
  console.log('✅ Session cleared');
}

export default api;