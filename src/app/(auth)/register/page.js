"use client"

import { useState, useRef, useEffect, Suspense, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, ArrowDown, ArrowLeftRight } from "lucide-react"
import { useTheme } from "next-themes"
import { AnimatePresence, motion } from "framer-motion"
import useMeasure from "react-use-measure"
import MotionContainer from "@/components/ui-components/MotionContainer"
import Button from "@/components/ui-components/Button"
import Connectimg from "@/assests/photo/Connect.jpg"
import Link from "next/link"
import api, { setAuthToken } from "@/utils/axios"
import { jwtDecode } from "jwt-decode"
import axios from "axios"

// 1. CONSTANTS - Tách ra ngoài để tránh tạo lại
const FORM_ANIMATION_CONFIG = {
  duration: 0.3, 
  ease: "easeInOut"
}

const SCROLL_CONFIG = {
  behavior: "smooth"
}

const REDIRECT_DELAYS = {
  SUCCESS: 500,
  FALLBACK: 1200
}

// 2. HELPER FUNCTIONS - Tách ra ngoài component
const parseApiError = (error) => {
  if (error.response) {
    return error.response.data?.message || error.response.data?.error || `Lỗi server (${error.response.status})`
  } else if (error.request) {
    return "Không thể kết nối đến server. Vui lòng thử lại."
  } else {
    return error.message || "Lỗi không xác định"
  }
}

const validateForm = (mode, formData) => {
  const { email, password, confirmPassword, givenName, familyName, birthdate } = formData
  
  if (!email || !password) {
    return "❌ Vui lòng điền đầy đủ thông tin"
  }
  
  if (mode === "register") {
    if (password !== confirmPassword) {
      return "❌ Mật khẩu không khớp!"
    }
    if (!givenName || !familyName || !birthdate) {
      return "❌ Vui lòng điền đầy đủ thông tin"
    }
  }
  
  return null
}

// 3. LOADING COMPONENT - Tối ưu
const AuthPageLoading = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
)

// 4. MESSAGE COMPONENT - Tách để tránh re-render
const MessageDisplay = ({ message, verifyMessage, verifying }) => {
  const getMessageClass = useCallback((msg) => {
    if (msg?.includes("✅")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    if (msg?.includes("⚠️")) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }, [])

  return (
    <>
      {verifyMessage && (
        <div className={`p-3 text-sm rounded mb-4 ${getMessageClass(verifyMessage)}`}>
          {verifyMessage}
        </div>
      )}

      {message && (
        <div className={`p-3 text-sm rounded mb-4 ${getMessageClass(message)}`}>
          {message}
        </div>
      )}

      {verifying && (
        <div className="p-3 text-sm rounded mb-4 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          🔄 Đang xác thực email...
        </div>
      )}
    </>
  )
}

// 5. FORM FIELDS COMPONENT - Tách để tối ưu re-render
const FormFields = ({ 
  mode, 
  formData, 
  setFormData, 
  showPassword, 
  setShowPassword, 
  loading, 
  verifying 
}) => {
  const handleInputChange = useCallback((field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }, [setFormData])

  const togglePassword = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [setShowPassword])

  const isDisabled = loading || verifying

  return (
    <>
      {/* Email */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
        <input
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
          required
          disabled={isDisabled}
        />
      </div>

      {/* Register fields */}
      {mode === "register" && (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="space-y-2 flex-1">
              <h4 className="text-sm font-medium text-muted-foreground">Given Name</h4>
              <input
                type="text"
                value={formData.givenName}
                onChange={handleInputChange('givenName')}
                className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="text-sm font-medium text-muted-foreground">Family Name</h4>
              <input
                type="text"
                value={formData.familyName}
                onChange={handleInputChange('familyName')}
                className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Birthdate</h4>
            <input
              type="date"
              value={formData.birthdate}
              onChange={handleInputChange('birthdate')}
              className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
              required
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Password */}
      <div className="space-y-2 relative">
        <h4 className="text-sm font-medium text-muted-foreground">Password</h4>
        <input
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handleInputChange('password')}
          className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary pr-10 text-foreground"
          required
          minLength={6}
          disabled={isDisabled}
        />
        <button
          type="button"
          className="absolute right-0 top-7 p-1 text-muted-foreground hover:text-foreground"
          onClick={togglePassword}
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
          disabled={isDisabled}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Confirm password */}
      {mode === "register" && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Confirm Password</h4>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
            required
            minLength={6}
            disabled={loading}
          />
        </div>
      )}
    </>
  )
}

// 6. MAIN FORM COMPONENT
function AuthFormWithParams() {
  // States - Combine related states
  const [mode, setMode] = useState("login")
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    givenName: "",
    familyName: "",
    birthdate: ""
  })
  const [messages, setMessages] = useState({
    verify: "",
    general: ""
  })
  const [status, setStatus] = useState({
    verifying: false,
    loading: false
  })

  const formRef = useRef(null)
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [formBoundsRef, { height }] = useMeasure()

  // Memoized values
  const isProcessing = useMemo(() => status.loading || status.verifying, [status])

  // Clear form function
  const clearForm = useCallback(() => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      givenName: "",
      familyName: "",
      birthdate: ""
    })
  }, [])

  // Email verification effect - Optimized
  useEffect(() => {
    let isMounted = true
    
    const verifyEmail = async () => {
      const emailParam = searchParams.get("email")
      const codeParam = searchParams.get("code")
      
      if (!emailParam || !codeParam) return

      setStatus(prev => ({ ...prev, verifying: true }))
      
      try {
        const res = await api.patch(
          "/v1/register/verify",
          { email: emailParam, code: codeParam },
          { headers: { "Content-Type": "application/json" }, timeout: 10000 }
        )
        
        if (isMounted && res.data.code === 200) {
          setMessages(prev => ({
            ...prev,
            verify: "✅ Xác thực email thành công! Bạn có thể đăng nhập."
          }))
          setMode("login")
        }
      } catch (error) {
        if (isMounted) {
          console.error("Email verification error:", error)
          setMessages(prev => ({
            ...prev,
            verify: `❌ Xác thực thất bại: ${parseApiError(error)}`
          }))
        }
      } finally {
        if (isMounted) {
          setStatus(prev => ({ ...prev, verifying: false }))
        }
      }
    }

    verifyEmail()
    
    return () => {
      isMounted = false
    }
  }, [searchParams])

  // Handle register - Optimized
  const handleRegister = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true }))
    
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/v1/register`, {
        email: formData.email,
        password: formData.password,
        givenName: formData.givenName,
        familyName: formData.familyName,
        birthdate: formData.birthdate,
      })
      
      console.log(res)
      setMessages(prev => ({
        ...prev,
        general: "✅ Đăng ký thành công! Vui lòng kiểm tra email để xác thực."
      }))
      setMode("login")
      clearForm()
      
    } catch (error) {
      setMessages(prev => ({
        ...prev,
        general: `❌ Đăng ký thất bại: ${parseApiError(error)}`
      }))
    } finally {
      setStatus(prev => ({ ...prev, loading: false }))
    }
  }, [formData, clearForm])

  // Handle login - Optimized
  const handleLogin = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true }))
    
    try {
      const res = await api.post(`/v1/auth/login`, { 
        email: formData.email, 
        password: formData.password 
      })
      
      if (res.data.code === 200 && res.data.body.token) {           
        const token = res.data.body.token
        console.log('🔐 Login success, token:', token.substring(0, 20) + '...')
        
        const decoded = jwtDecode(token)
        console.log('🔓 Decoded token:', decoded)
        
        // Batch localStorage operations
        const authData = {
          role:decoded.role,
          accessToken: token,
          userId: decoded.sub,
          userName: decoded.username
        }
        
        Object.entries(authData).forEach(([key, value]) => {
          localStorage.setItem(key, value)
        })
        Object.entries(authData).forEach(([key, value]) => {
          localStorage.setItem(key, value)
        })
        
        // Sync cookies
        console.log('📝 Syncing to cookies...')
        const syncSuccess = setAuthToken(token, decoded.sub, decoded.username)
        
        if (syncSuccess) {
          console.log('✅ Cookies synced successfully')
          setMessages(prev => ({
            ...prev,
            general: "✅ Đăng nhập thành công!"
          }))
          
          // Clear form
          setFormData(prev => ({ ...prev, email: "", password: "" }))
          
          // Redirect
          setTimeout(() => {
            window.location.href = '/home'
          }, REDIRECT_DELAYS.SUCCESS)
          
        } else {
          console.error('❌ Failed to sync cookies')
          setMessages(prev => ({
            ...prev,
            general: "⚠️ Đăng nhập thành công nhưng có lỗi khi đồng bộ hóa phiên làm việc"
          }))
          
          setTimeout(() => {
            router.push("/index")
          }, REDIRECT_DELAYS.FALLBACK)
        }
      }
    } catch (error) {
      setMessages(prev => ({
        ...prev,
        general: `❌ Đăng nhập thất bại: ${parseApiError(error)}`
      }))
    } finally {
      setStatus(prev => ({ ...prev, loading: false }))
    }
  }, [formData.email, formData.password, router])

  // Handle submit - Optimized
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setMessages(prev => ({ ...prev, general: "" }))

    const validationError = validateForm(mode, formData)
    if (validationError) {
      setMessages(prev => ({ ...prev, general: validationError }))
      return
    }

    if (mode === "register") {
      await handleRegister()
    } else {
      await handleLogin()
    }
  }, [mode, formData, handleRegister, handleLogin])

  // Scroll to form
  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView(SCROLL_CONFIG)
  }, [])

  // Toggle mode
  const toggleMode = useCallback(() => {
    setMode(prev => prev === "login" ? "register" : "login")
    setMessages({ verify: "", general: "" }) // Clear messages when switching
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Main Section */}
      <main className="flex-grow flex flex-col md:flex-row h-full">
        {/* Left Side (Image) */}
        <div className="w-full md:w-1/2 h-screen flex items-center justify-center bg-muted relative">
          <Image
            src={Connectimg}
            alt="Network illustration"
            width={400}
            height={400}
            className="max-w-full h-auto object-contain"
            priority
          />
          {/* Mobile button */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center md:hidden">
            <button
              onClick={scrollToForm}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg hover:opacity-90 transition-opacity"
            >
              Go to {mode}
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Side (Form) */}
        <div
          ref={formRef}
          className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 bg-background"
        >
          <div
            className="w-full max-w-md text-card-foreground rounded-xl p-8 shadow-xl bg-[var(--card)]"
            style={{ overflow: "hidden" }}
          >
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">
                {mode === "login" ? "Sign in" : "Create your account"}
              </h1>
              <button
                onClick={toggleMode}
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeftRight className="inline-block w-4 h-4 mr-1" />
                {mode === "login" ? "Register" : "Sign in"}
              </button>
            </div>

            <motion.div 
              animate={{ height }} 
              transition={FORM_ANIMATION_CONFIG} 
              style={{ overflow: "hidden" }}
            >
              <div ref={formBoundsRef}>
                <AnimatePresence mode="wait">
                  <MotionContainer key={mode} modeKey={mode} effect="fadeUp">
                    <MessageDisplay 
                      message={messages.general}
                      verifyMessage={messages.verify}
                      verifying={status.verifying}
                    />

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <FormFields
                        mode={mode}
                        formData={formData}
                        setFormData={setFormData}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        loading={status.loading}
                        verifying={status.verifying}
                      />

                      <Button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2"
                      >
                        {status.loading ? "Loading..." : mode === "login" ? "Sign in" : "Register"}
                      </Button>
                      
                      <div className="mt-6 text-center text-sm text-muted-foreground">
                        <div>
                          Quên mật khẩu?{" "}
                          <Link
                            href="/forgot-password"
                            className="text-blue-500 dark:text-blue-400 hover:underline"
                          >
                            Tạo mật khẩu mới
                          </Link>
                        </div>
                      </div>
                    </form>
                  </MotionContainer>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Export component với Suspense
export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageLoading />}>
      <AuthFormWithParams />
    </Suspense>
  )
}