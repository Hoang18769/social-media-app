"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, Shield, ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";
import adminApi, {
  setAdminAuthToken,
  clearAdminSession,
  getAdminAuthInfo,
  isAdminTokenValid
} from "@/utils/adminInterception";
import { jwtDecode } from "jwt-decode";

// Constants


export default function AdminLoginPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [status, setStatus] = useState({
    loading: false,
    checking: true // Add checking state
  });
  const [messages, setMessages] = useState({
    general: ""
  });

  // Check authentication properly
  const checkAuthentication = useCallback(() => {
    if (!isClient) return false;

    try {
      const authInfo = getAdminAuthInfo();
      const tokenValid = isAdminTokenValid();

      console.log('🔍 Admin auth check:', {
        hasAuthInfo: !!authInfo,
        tokenValid,
        authInfo: authInfo ? {
          hasToken: !!authInfo.token,
          hasUserId: !!authInfo.userId,
          hasUserName: !!authInfo.userName
        } : null
      });

      return authInfo && tokenValid;
    } catch (error) {
      console.error('❌ Error checking authentication:', error);
      return false;
    }
  }, [isClient]);

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsClient(true);

    // Only check authentication after client is ready
    const checkTimer = setTimeout(() => {
      const isAuthenticated = checkAuthentication();

      if (isAuthenticated) {
        console.log('🔐 Admin already authenticated, redirecting to dashboard...');
        // router.push('/admin/dashboard/posts');
      } else {
        console.log('🔓 No valid admin authentication, staying on login page');
        // Clear any invalid auth data
        clearAdminSession();
      }

      setStatus(prev => ({ ...prev, checking: false }));
    }, 100); // Small delay to ensure hydration

    return () => clearTimeout(checkTimer);
  }, [router, checkAuthentication]);

  // Hàm parse lỗi từ adminInterception
  const parseApiError = (error) => {
    // adminInterception đã xử lý error format
    if (error.userMessage) {
      return error.userMessage;
    }

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

  const handleLogout = async () => {
    try {
      await adminApi.delete("/v1/auth/logout");
    } catch (err) {
      console.error("Admin logout failed:", err.response?.data || err.message);
    } finally {
      clearAdminSession();
      // Force reload to ensure clean state
      window.location.reload();
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
      // Clear any existing auth data before login
      clearAdminSession();

      // Gửi request login-admin với skipAuth flag
      const res = await adminApi.post("/v1/auth/login-admin", {
        email: formData.email,
        password: formData.password,
      }, {
        skipAuth: true // Bỏ qua auth cho login endpoint
      });

      console.log('🔐 Admin login response:', res);

      if (res.data.code === 200 && res.data.body.token) {
        const token = res.data.body.token;
        console.log('🔐 Admin login success, token:', token.substring(0, 20) + '...');

        // Decode token để lấy thông tin user
        let decoded;
        try {
          decoded = jwtDecode(token);
          console.log('🔓 Decoded admin token:', decoded);
        } catch (decodeError) {
          console.error('❌ Error decoding token:', decodeError);
          throw new Error('Invalid token format');
        }

        // Validate decoded token has required fields
        if (!decoded.sub) {
          throw new Error('Token missing required user ID');
        }

        // Sử dụng adminInterception để set auth token
        const authSuccess = setAdminAuthToken(
            token,
            decoded.sub,
            decoded.username || decoded.email || 'Admin'
        );
        localStorage.setItem("admin_role", decoded.scope);

        if (authSuccess) {
          console.log('✅ Admin authentication set successfully');

          // Verify authentication was set correctly
          const verifyAuth = checkAuthentication();
          if (verifyAuth) {
            setMessages(prev => ({
              ...prev,
              general: "✅ Đăng nhập admin thành công!"
            }));

            // Clear form
            setFormData({
              email: "",
              password: ""
            });

            // Redirect to admin dashboard
            setTimeout(() => {
              router.push('/admin/dashboard/posts');
            }, 1000);
          } else {
            throw new Error('Authentication verification failed');
          }

        } else {
          throw new Error('Failed to set admin authentication');
        }

      } else {
        setMessages(prev => ({
          ...prev,
          general: `❌ ${res.data.message || "Đăng nhập admin thất bại"}`
        }));
      }

    } catch (error) {
      console.error('❌ Admin login error:', error);

      // Clear any partial auth data on error
      clearAdminSession();

      setMessages(prev => ({
        ...prev,
        general: `❌ Đăng nhập admin thất bại: ${parseApiError(error)}`
      }));
    } finally {
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [formData.email, formData.password, router, isClient, checkAuthentication]);

  const handleBackToLogin = () => {
    router.push("/register"); // Quay lại trang login thường
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Show loading while checking authentication or client-side hydration
  if (!isClient || status.checking) {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <span className="text-muted-foreground">
                {status.checking ? "Checking authentication..." : "Loading..."}
              </span>
            </div>
            {status.checking && (
                <p className="text-sm text-muted-foreground">
                  Verifying admin session...
                </p>
            )}
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
                        disabled={status.loading}
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
                        disabled={status.loading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !status.loading) {
                            handleAdminLogin();
                          }
                        }}
                    />
                    <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-8 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        disabled={status.loading}
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



                {/* Debug info in development */}

              </div>
            </div>
          </div>
        </main>
      </div>
  );
}