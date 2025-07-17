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

// Simplified error handling
function handleApiError(error) {
  if (!error.response) {
    return Promise.reject({
      ...error,
      message: "Lỗi kết nối mạng",
      type: "network_error"
    });
  }

  const { status, data } = error.response;
  const message = data?.message || `Lỗi ${status}`;

  return Promise.reject({
    ...error,
    message,
    type: "api_error",
    shouldRetry: [500, 502, 503, 429].includes(status)
  });
}

// Cookie utilities
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
    let cookieString = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;

    if (isProduction) {
      cookieString += `; Secure`;
    }

    document.cookie = cookieString;
  },

  remove: (name) => {
    if (!isClient) return;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
  }
};

// Auth storage
function setAuthStorage(token, userId, userName) {
  if (!isClient) return;

  try {
    if (token) {
      const maxAge = 7 * 24 * 60 * 60; // 7 days

      cookieUtils.set('accessToken', token, maxAge);
      if (userId) cookieUtils.set('userId', String(userId), maxAge);
      if (userName) cookieUtils.set('userName', userName, maxAge);

      localStorage.setItem('accessToken', token);
      if (userId) localStorage.setItem('userId', String(userId));
      if (userName) localStorage.setItem('userName', userName);
    } else {
      ['accessToken', 'userId', 'userName'].forEach(key => {
        cookieUtils.remove(key);
        localStorage.removeItem(key);
      });
    }
  } catch (error) {
    console.error('Error in setAuthStorage:', error);
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

// CORE LOGIC: Token refresh với Promise Queue
async function handleTokenRefresh(originalRequest) {
  // Nếu đang refresh, thêm request vào queue
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshSubscribers.push((token) => {
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
          alert("token refreshed");
        } else {
          reject(new Error("Failed to refresh token"));
        }
      });
    });
  }

  // Bắt đầu refresh process
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

    // Lưu token mới
    setAuthStorage(newToken, userId, userName);
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    originalRequest.headers.Authorization = `Bearer ${newToken}`;

    // Xử lý tất cả requests trong queue
    refreshSubscribers.forEach(cb => cb(newToken));
    refreshSubscribers = [];
    notifyTokenRefresh(newToken);

    // Retry request gốc
    return api(originalRequest);
  } catch (refreshErr) {
    console.error("Token refresh failed:", refreshErr);
    clearSession();
    if (isClient) {
      setTimeout(() => window.location.href = "/register", 1000);
    }
    return Promise.reject(refreshErr);
  } finally {
    isRefreshing = false;
  }
}
export async function refreshTokenManually() {
  try {
    const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
    );

    const newToken = data.body?.token;
    if (!newToken) throw new Error("No new token in refresh response");

    const userId = getUserId();
    const userName = getUserName();

    setAuthStorage(newToken, userId, userName);
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

    // ✅ Tạm thời vô hiệu hóa callback để tránh vòng lặp
    const savedListeners = [...tokenEventListeners];
    tokenEventListeners.length = 0; // clear listeners tạm thời

    notifyTokenRefresh(newToken); // sẽ không gây loop

    tokenEventListeners.push(...savedListeners); // khôi phục lại

    return true;
  } catch (error) {
    console.error("Manual token refresh failed:", error);
    clearSession();
    return false;
  }
}

// Response interceptor
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

      // Xử lý các lỗi khác
      return handleApiError(error);
    }
);

// Export functions
export function setAuthToken(accessToken, userId, userName) {
  if (!accessToken || !userId) {
    console.error('Invalid accessToken or userId provided to setAuthToken');
    return false;
  }

  try {
    setAuthStorage(accessToken, userId, userName);
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    notifyTokenRefresh(accessToken);
    return true;
  } catch (error) {
    console.error('Error setting auth token:', error);
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
export function setUserName(username) {
  if (!username || typeof username !== 'string') return;

  // Lưu vào cookie
  cookieUtils.set('userName', username, {
    maxAge: 7 * 24 * 60 * 60
  });

  // Lưu vào localStorage
  localStorage.setItem('userName', username);
}

export function getAuthInfo() {
  if (!isClient) return null;

  const token = getAuthToken();
  const userId = getUserId();
  const userName = getUserName();

  return token && userId ? { token, userId, userName } : null;
}

export function isTokenValid() {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp ? payload.exp > now : true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

export function isAuthenticated() {
  const authInfo = getAuthInfo();
  const tokenValid = isTokenValid();
  return authInfo !== null && tokenValid;
}

export function clearSession() {
  setAuthStorage(null);
  delete api.defaults.headers.common.Authorization;
  notifyTokenRefresh(null);
}

export default api;