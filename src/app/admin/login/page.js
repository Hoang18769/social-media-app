"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, Shield, ArrowLeftRight } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import api, { clearSession } from "@/utils/axios";
import { jwtDecode } from "jwt-decode";

// Constants
const REDIRECT_DELAYS = {
  SUCCESS: 1200,
  FALLBACK: 2000
};

// Utility function to safely access localStorage
const safeLocalStorage = {
  getItem: (key) => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key, value) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  }
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [status, setStatus] = useState({
    loading: false
  });
  const [messages, setMessages] = useState({
    general: ""
  });

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Hàm parse lỗi tái sử dụng
  const parseApiError = (error) => {
    if (error?.response) {
      return (
        error.response.data?.message ||
        error.response.data?.error ||
        `Lỗi server (${error.response.status})`
      );
    } else if (error?.request) {
      return "Không thể kết nối đến server. Vui lòng thử lại.";
    } else {
      return error.message || "Lỗi không xác định";
    }
  };

  // Hàm sync cookie (giả định bạn có hàm setAuthToken)
  const setAuthToken = (token, userId, username, role) => {
    try {
      // Implement cookie sync logic here
      // document.cookie = `accessToken=${token}; path=/; secure; httpOnly`;
      // Hoặc sử dụng library như js-cookie
      console.log('Setting auth cookies:', { userId, username, role });
      return true;
    } catch (error) {
      console.error('Cookie sync failed:', error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await api.delete("/v1/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err.response?.data || err.message);
    } finally {
      clearSession(); // ✅ xoá localStorage + cookie + token headers
      router.push("/register");
    }
  };

  const handleAdminLogin = useCallback(async () => {
    // Check if we're on client side
    if (!isClient) {
      console.warn('Attempted to login before client hydration');
      return;
    }

    setStatus(prev => ({ ...prev, loading: true }));
    setMessages(prev => ({ ...prev, general: "" }));

    // Validation
    if (!formData.email || !formData.password) {
      setMessages(prev => ({
        ...prev,
        general: "❌ Vui lòng điền đầy đủ thông tin"
      }));
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Gửi request login-admin
      const res = await api.post("/v1/auth/login-admin", {
        email: formData.email,
        password: formData.password,
      });

      console.log('🔐 Admin login response:', res);

      if (res.data.code === 200 && res.data.body.token) {
        const token = res.data.body.token;
        console.log('🔐 Admin login success, token:', token.substring(0, 20) + '...');

        // Decode token
        const decoded = jwtDecode(token);
        console.log('🔓 Decoded admin token:', decoded);

        // Batch localStorage operations - only on client side
        if (typeof window !== 'undefined') {
          const authData = {
            accessToken: token,
            userId: decoded.sub,
            userName: decoded.username,
            userRole: decoded.scope,
          };

          // Set localStorage safely
          Object.entries(authData).forEach(([key, value]) => {
            safeLocalStorage.setItem(key, value);
          });
        }

        // Sync cookies
        console.log('📝 Syncing admin session to cookies...');
        const syncSuccess = setAuthToken(
          token, 
          decoded.sub, 
          decoded.username, 
          decoded.scope
        );

        if (syncSuccess) {
          console.log('✅ Admin cookies synced successfully');
          setMessages(prev => ({
            ...prev,
            general: "✅ Đăng nhập admin thành công!"
          }));

          // Clear form
          setFormData(prev => ({ 
            ...prev, 
            email: "", 
            password: "" 
          }));

          // Redirect to admin dashboard
          setTimeout(() => {
            router.push('/admin/dashboard');
          }, REDIRECT_DELAYS.SUCCESS);

        } else {
          console.error('❌ Failed to sync admin cookies');
          setMessages(prev => ({
            ...prev,
            general: "⚠️ Đăng nhập admin thành công nhưng có lỗi khi đồng bộ hóa phiên làm việc"
          }));

          // Fallback redirect
          setTimeout(() => {
            router.push("/admin/dashboard");
          }, REDIRECT_DELAYS.FALLBACK);
        }

      } else {
        setMessages(prev => ({
          ...prev,
          general: `❌ ${res.data.message || "Đăng nhập admin thất bại"}`
        }));
      }

    } catch (error) {
      console.error('Admin login error:', error);
      setMessages(prev => ({
        ...prev,
        general: `❌ Đăng nhập admin thất bại: ${parseApiError(error)}`
      }));
    } finally {
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [formData.email, formData.password, router, isClient]);

  const handleBackToLogin = () => {
    router.push("/auth"); // Quay lại trang login thường
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-6xl flex items-center gap-12">
          {/* Left Content */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Admin Portal
              </h1>
              <p className="text-muted-foreground">
                Truy cập hệ thống quản trị
              </p>
              <button onClick={handleLogout} className="mt-4 text-sm text-muted-foreground hover:text-foreground">
                logout
              </button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 border border-border max-w-md">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Enhanced Security
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Các phiên đăng nhập admin được mã hóa và tự động hết hạn để
                    tăng cường bảo mật.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div className="w-full max-w-md">
            <div className="bg-card rounded-xl p-8 shadow-xl border border-border">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-card-foreground">
                  Admin Login
                </h2>
                <button
                  onClick={handleBackToLogin}
                  className="text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Back to Login
                </button>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    Restricted Access - Administrators Only
                  </span>
                </div>
              </div>

              {messages.general && (
                <div
                  className={`p-3 text-sm rounded-lg mb-6 ${
                    messages.general.includes("✅")
                      ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {messages.general}
                </div>
              )}

              <div className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Admin Email
                  </h4>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full bg-transparent border-b border-input px-0 py-2 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2 relative">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Admin Password
                  </h4>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full bg-transparent border-b border-input px-0 py-2 pr-10 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                    placeholder="Enter admin password"
                    required
                    minLength={6}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAdminLogin();
                      }
                    }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-8 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Submit */}
                <button
                  onClick={handleAdminLogin}
                  disabled={status.loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {status.loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      Authenticating...
                    </div>
                  ) : (
                    "Access Admin Panel"
                  )}
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <div className="bg-accent rounded-lg p-4">
                  <p className="text-sm font-medium text-accent-foreground mb-2">
                    Demo Credentials:
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Email: admin@example.com</p>
                    <p>Password: admin123</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}