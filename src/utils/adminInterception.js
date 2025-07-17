import axios from "axios";

const adminApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
    timeout: 30000,
});

let isRefreshing = false;
let refreshSubscribers = [];
const tokenEventListeners = [];

// Helper function để kiểm tra môi trường client
const isClient = typeof window !== "undefined";

// Simplified admin error handling
function handleApiError(error) {
    if (!error.response) {
        return Promise.reject({
            ...error,
            message: "Lỗi kết nối mạng admin",
            type: "network_error"
        });
    }

    const { status, data } = error.response;
    const statusMessages = {
        400: "Dữ liệu không hợp lệ",
        401: "Chưa đăng nhập admin hoặc phiên đăng nhập đã hết hạn",
        403: "Không có quyền truy cập admin",
        404: "Không tìm thấy tài nguyên",
        409: "Dữ liệu đã tồn tại",
        422: "Dữ liệu không hợp lệ",
        429: "Quá nhiều yêu cầu, vui lòng thử lại sau",
        500: "Lỗi máy chủ, vui lòng thử lại sau",
        502: "Lỗi kết nối máy chủ",
        503: "Dịch vụ tạm thời không khả dụng"
    };

    const message = statusMessages[status] || data?.message || `Lỗi ${status}`;

    return Promise.reject({
        ...error,
        message,
        type: "api_error",
        shouldRetry: [500, 502, 503, 429].includes(status)
    });
}

// Admin Cookie utilities
const adminCookieUtils = {
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

// Admin auth storage
function setAdminAuthStorage(token, userId, userName) {
    if (!isClient) return;

    try {
        if (token) {
            const maxAge = 7 * 24 * 60 * 60; // 7 days

            // Set cookies with admin_ prefix
            adminCookieUtils.set('admin_accessToken', token, maxAge);
            if (userId) adminCookieUtils.set('admin_userId', String(userId), maxAge);
            if (userName) adminCookieUtils.set('admin_userName', userName, maxAge);

            // Set localStorage with admin_ prefix
            localStorage.setItem('admin_accessToken', token);
            if (userId) localStorage.setItem('admin_userId', String(userId));
            if (userName) localStorage.setItem('admin_userName', userName);
        } else {
            // Clear all auth data with admin_ prefix
            ['admin_accessToken', 'admin_userId', 'admin_userName'].forEach(key => {
                adminCookieUtils.remove(key);
                localStorage.removeItem(key);
            });
        }
    } catch (error) {
        console.error('Error in setAdminAuthStorage:', error);
    }
}

export function onAdminTokenRefresh(callback) {
    tokenEventListeners.push(callback);
    return () => {
        const index = tokenEventListeners.indexOf(callback);
        if (index > -1) tokenEventListeners.splice(index, 1);
    };
}

function notifyAdminTokenRefresh(newToken) {
    tokenEventListeners.forEach(callback => {
        try {
            callback(newToken);
        } catch (error) {
            console.error('Error in admin token refresh callback:', error);
        }
    });
}

// Admin public endpoints
const ADMIN_PUBLIC_ENDPOINTS = [
    "/admin/login"
];

function isAdminPublicEndpoint(url) {
    if (!url) return false;
    const path = url.split("?")[0];
    return ADMIN_PUBLIC_ENDPOINTS.includes(path);
}

// Admin Request interceptor
adminApi.interceptors.request.use(
    config => {
        if (config.skipAuth || isAdminPublicEndpoint(config.url)) {
            return config;
        }

        // Use admin_ prefix for token retrieval
        const token = adminCookieUtils.get('admin_accessToken') || localStorage.getItem("admin_accessToken");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    err => Promise.reject(err)
);

// CORE LOGIC: Admin token refresh với Promise Queue
async function handleAdminTokenRefresh(originalRequest) {
    // Nếu đang refresh, thêm request vào queue
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            refreshSubscribers.push((token) => {
                if (token) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(adminApi(originalRequest));
                } else {
                    reject(new Error("Failed to refresh admin token"));
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
        if (!newToken) throw new Error("No new token in admin refresh response");

        const userId = getAdminUserId();
        const userName = getAdminUserName();

        // Lưu token mới với admin_ prefix
        setAdminAuthStorage(newToken, userId, userName);
        adminApi.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Xử lý tất cả requests trong queue
        refreshSubscribers.forEach(cb => cb(newToken));
        refreshSubscribers = [];
        notifyAdminTokenRefresh(newToken);

        // Retry request gốc
        return adminApi(originalRequest);
    } catch (refreshErr) {
        console.error("Admin token refresh failed:", refreshErr);
        clearAdminSession();
        if (isClient) {
            setTimeout(() => window.location.href = "/admin/login", 1000);
        }
        return Promise.reject(refreshErr);
    } finally {
        isRefreshing = false;
    }
}

// Admin Response interceptor
adminApi.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // Handle 401 errors với admin token refresh
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isAdminPublicEndpoint(originalRequest.url) &&
            !originalRequest.skipAuth &&
            originalRequest.url !== "/auth/refresh"
        ) {
            originalRequest._retry = true;
            return handleAdminTokenRefresh(originalRequest);
        }

        // Xử lý các lỗi khác
        return handleApiError(error);
    }
);

// Admin Export functions
export function setAdminAuthToken(accessToken, userId, userName) {
    if (!accessToken || !userId) {
        console.error('Invalid accessToken or userId provided to setAdminAuthToken');
        return false;
    }

    try {
        setAdminAuthStorage(accessToken, userId, userName);
        adminApi.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        notifyAdminTokenRefresh(accessToken);
        return true;
    } catch (error) {
        console.error('Error setting admin auth token:', error);
        return false;
    }
}

export function getAdminAuthToken() {
    return adminCookieUtils.get('admin_accessToken') || localStorage.getItem("admin_accessToken");
}

export function getAdminUserId() {
    return adminCookieUtils.get('admin_userId') || localStorage.getItem("admin_userId");
}

export function getAdminUserName() {
    return adminCookieUtils.get('admin_userName') || localStorage.getItem("admin_userName");
}

export function getAdminAuthInfo() {
    if (!isClient) return null;

    const token = getAdminAuthToken();
    const userId = getAdminUserId();
    const userName = getAdminUserName();

    return token && userId ? { token, userId, userName } : null;
}

export function isAdminTokenValid() {
    const token = getAdminAuthToken();
    if (!token) return false;

    try {
        const [, payloadBase64] = token.split(".");
        const payload = JSON.parse(atob(payloadBase64));
        const now = Math.floor(Date.now() / 1000);
        return payload.exp ? payload.exp > now : true;
    } catch (error) {
        console.error('Admin token validation error:', error);
        return false;
    }
}

export function isAdminAuthenticated() {
    const authInfo = getAdminAuthInfo();
    const tokenValid = isAdminTokenValid();
    return authInfo !== null && tokenValid;
}

export function clearAdminSession() {
    setAdminAuthStorage(null, null, null);
    delete adminApi.defaults.headers.common.Authorization;
    notifyAdminTokenRefresh(null);
}

export default adminApi;