import axios from "axios";
import { ERROR_MESSAGES } from "@/assests/photo/errorcode";
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

// Method xử lý lỗi từ response
function handleApiError(error) {
  console.log('🔥 API Error Interceptor:', error);
  
  // Nếu không có response (network error)
  if (!error.response) {
    const networkError = {
      ...error,
      message: "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet",
      type: "network_error",
      userMessage: "Không thể kết nối tới server"
    };
    console.log('🌐 Network Error:', networkError.message);
    return Promise.reject(networkError);
  }
  
  const { data, status } = error.response;
  
  // Xử lý lỗi có mã code từ server
  if (data?.code && ERROR_MESSAGES[data.code]) {
    const errorMessage = ERROR_MESSAGES[data.code];
    const enhancedError = {
      ...error,
      message: errorMessage,
      originalMessage: data.message || error.message,
      code: data.code,
      type: "api_error",
      userMessage: errorMessage,
      shouldRetry: shouldRetryByCode(data.code),
      requiresAuth: isAuthError(data.code),
      category: getErrorCategory(data.code)
    };
    
    console.log(`📋 Error Code ${data.code}: ${errorMessage}`);
    return Promise.reject(enhancedError);
  }
  
  // Xử lý lỗi theo HTTP status nếu không có code
  const statusError = handleHttpStatus(error, status, data);
  return Promise.reject(statusError);
}

// Xử lý lỗi theo HTTP status
function handleHttpStatus(error, status, data) {
  const statusMessages = {
    400: "Dữ liệu không hợp lệ",
    401: "Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn",
    403: "Không có quyền truy cập",
    404: "Không tìm thấy tài nguyên",
    409: "Dữ liệu đã tồn tại",
    422: "Dữ liệu không hợp lệ",
    429: "Quá nhiều yêu cầu, vui lòng thử lại sau",
    500: "Lỗi máy chủ, vui lòng thử lại sau",
    502: "Lỗi kết nối máy chủ",
    503: "Dịch vụ tạm thời không khả dụng"
  };
  
  const message = statusMessages[status] || data?.message || `Lỗi ${status}`;
  
  return {
    ...error,
    message,
    originalMessage: data?.message || error.message,
    type: "http_error",
    userMessage: message,
    shouldRetry: shouldRetryByStatus(status),
    requiresAuth: status === 401,
    category: getHttpErrorCategory(status)
  };
}

// Xác định có nên retry dựa vào error code
function shouldRetryByCode(code) {
  const noRetryErrors = [
    1002, 1004, 1005, 1012, 1016, // Account issues
    2012, 2014, // User conflicts
    4000, 4006, 4007, 4010, // Relationship issues
    5009, 5010, 6005, 6006, // Like/unlike conflicts
    9994, 9995, 9996 // Permission and validation
  ];
  
  return !noRetryErrors.includes(code);
}

// Xác định có nên retry dựa vào HTTP status
function shouldRetryByStatus(status) {
  const retryableStatuses = [500, 502, 503, 429];
  return retryableStatuses.includes(status);
}

// Kiểm tra có phải lỗi authentication
function isAuthError(code) {
  const authErrors = [1001, 1003, 1011, 1013, 1014, 2009, 9997];
  return authErrors.includes(code);
}

// Xác định category của lỗi
function getErrorCategory(code) {
  if (code >= 1000 && code < 2000) return 'authentication';
  if (code >= 2000 && code < 3000) return 'user_profile';
  if (code >= 3000 && code < 4000) return 'file_storage';
  if (code >= 4000 && code < 5000) return 'relationship';
  if (code >= 5000 && code < 6000) return 'post';
  if (code >= 6000 && code < 7000) return 'comment';
  if (code >= 7000 && code < 8000) return 'message';
  if (code >= 9000 && code < 10000) return 'general';
  return 'unknown';
}

// Xác định category cho HTTP error
function getHttpErrorCategory(status) {
  if (status === 401) return 'authentication';
  if (status === 403) return 'permission';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if ([400, 422].includes(status)) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server_error';
  return 'http_error';
}

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
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    cookieString += `; path=/`;
    cookieString += `; max-age=${maxAge}`;
    cookieString += `; SameSite=Lax`;
    
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
  },
  
  remove: (name) => {
    if (!isClient) return;
    
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

// Enhanced auth storage with better error handling
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
      
      cookieUtils.set('accessToken', token, maxAge);
      
      if (userId) {
        cookieUtils.set('userId', String(userId), maxAge);
      }
      if (userName) {
        cookieUtils.set('userName', userName, maxAge);
      }
      
      localStorage.setItem('accessToken', token);
      if (userId) localStorage.setItem('userId', String(userId));
      if (userName) localStorage.setItem('userName', userName);
      
      console.log('✅ Auth storage set successfully');
      
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

// Request interceptor
api.interceptors.request.use(
  config => {
    if (config.skipAuth || isPublicEndpoint(config.url)) {
      return config;
    }
    
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

    const userId = getUserId();
    const userName = getUserName();
    
    setAuthStorage(newToken, userId, userName);
    
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    originalRequest.headers.Authorization = `Bearer ${newToken}`;

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

// Response interceptor với error handling
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Handle 401 errors với token refresh
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
    
    // Xử lý tất cả các lỗi khác bằng handleApiError
    return handleApiError(error);
  }
);

// Export functions
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
    setAuthStorage(accessToken, userId, userName);
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    notifyTokenRefresh(accessToken);
    
    console.log('✅ Auth token set successfully');
    return true;
  } catch (error) {
    console.error('❌ Error setting auth token:', error);
    return false;
  }
}

export function getAuthToken() {
  return cookieUtils.get('accessToken') || localStorage.getItem("accessToken");
}

export function getUserId() {
  return cookieUtils.get('userId') || localStorage.getItem("userId");
}

export function getUserName() {
  return cookieUtils.get('userName') || localStorage.getItem("userName");
}

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
  
  setAuthStorage(null);
  delete api.defaults.headers.common.Authorization;
  notifyTokenRefresh(null);
  
  console.log('✅ Session cleared');
}

export default api;