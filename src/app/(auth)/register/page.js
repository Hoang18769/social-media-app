"use client"

import { useState, useRef, useEffect, Suspense } from "react"
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

// Loading component
function AuthPageLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

// Component sử dụng useSearchParams - PHẢI được wrap trong Suspense
function AuthFormWithParams() {
  const [mode, setMode] = useState("login")
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [givenName, setGivenName] = useState("")
  const [familyName, setFamilyName] = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [verifyMessage, setVerifyMessage] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const formRef = useRef(null)
  const { theme } = useTheme()
  const searchParams = useSearchParams() // Hook này cần Suspense
  const router = useRouter()
  const [formBoundsRef, { height }] = useMeasure()

  // Hàm parse lỗi tái sử dụng
  const parseApiError = (error) => {
    if (error.response) {
      return error.response.data?.message || error.response.data?.error || `Lỗi server (${error.response.status})`
    } else if (error.request) {
      return "Không thể kết nối đến server. Vui lòng thử lại."
    } else {
      return error.message || "Lỗi không xác định"
    }
  }

  // Effect xử lý email verification từ URL params
  useEffect(() => {
    const verifyEmail = async () => {
      const emailParam = searchParams.get("email")
      const codeParam = searchParams.get("code")
      
      if (!emailParam || !codeParam) return

      setVerifying(true)
      try {
        const res = await api.patch(
          "/v1/register/verify",
          { email: emailParam, code: codeParam },
          { headers: { "Content-Type": "application/json" }, timeout: 10000 }
        )
        
        if (res.data.code === 200) {
          setVerifyMessage("✅ Xác thực email thành công! Bạn có thể đăng nhập.")
          setMode("login") // Chuyển về login mode sau khi verify thành công
        }
      } catch (error) {
        console.error("Email verification error:", error)
        setVerifyMessage(`❌ Xác thực thất bại: ${parseApiError(error)}`)
      } finally {
        setVerifying(false)
      }
    }

    verifyEmail()
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    if (mode === "register") {
      if (password !== confirmPassword) {
        setMessage("❌ Mật khẩu không khớp!")
        return
      }
      if ([givenName, familyName, birthdate].some((v) => !v)) {
        setMessage("❌ Vui lòng điền đầy đủ thông tin")
        return
      }

      setLoading(true)
      try {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/v1/register`, {
          email,
          password,
          givenName,
          familyName,
          birthdate,
        })
        
        console.log(res)
        setMessage("✅ Đăng ký thành công! Vui lòng kiểm tra email để xác thực.")
        setMode("login")
        
        // Clear form
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setGivenName("")
        setFamilyName("")
        setBirthdate("")
      } catch (error) {
        setMessage(`❌ Đăng ký thất bại: ${parseApiError(error)}`)
      } finally {
        setLoading(false)
      }
    } else if (mode === "login") {
      if ([email, password].some((v) => !v)) {
        setMessage("❌ Vui lòng điền đầy đủ thông tin")
        return
      }

      setLoading(true)
      try {
        const res = await api.post(`/v1/auth/login`, { email, password })
        
        if (res.data.code === 200 && res.data.body.token) {           
          const token = res.data.body.token
          console.log('🔐 Login success, token:', token.substring(0, 20) + '...')
          
          const decoded = jwtDecode(token)
          console.log('🔓 Decoded token:', decoded)
          
          // Step 1: Set localStorage
          localStorage.setItem("accessToken", token)
          localStorage.setItem("userId", decoded.sub)
          localStorage.setItem("userName", decoded.username)
          
          // Step 2: Sync lên cookies
          console.log('📝 Syncing to cookies...')
          const syncSuccess = setAuthToken(token, decoded.sub, decoded.username)
          
          if (syncSuccess) {
            console.log('✅ Cookies synced successfully')
            
            // Step 3: Verify
            setTimeout(() => {
              console.log('🔍 Final verification:', {
                localStorage: {
                  accessToken: !!localStorage.getItem('accessToken'),
                  userId: localStorage.getItem('userId'),
                  userName: localStorage.getItem('userName')
                },
                cookies: {
                  accessToken: document.cookie.includes('accessToken='),
                  userId: document.cookie.includes('userId='),
                  userName: document.cookie.includes('userName='),
                  raw: document.cookie
                }
              })
            }, 200)
            
            setMessage("✅ Đăng nhập thành công!")
            setEmail("")
            setPassword("")
            
            // Step 4: Redirect
            setTimeout(() => {
              window.location.href = '/home'
            }, 500)
            
          } else {
            console.error('❌ Failed to sync cookies')
            setMessage("⚠️ Đăng nhập thành công nhưng có lỗi khi đồng bộ hóa phiên làm việc")
            
            // Fallback redirect
            setTimeout(() => {
              router.push("/index")
            }, 1200)
          }
        }
      } catch (error) {
        setMessage(`❌ Đăng nhập thất bại: ${parseApiError(error)}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeftRight className="inline-block w-4 h-4 mr-1" />
                {mode === "login" ? "Register" : "Sign in"}
              </button>
            </div>

            <motion.div 
              animate={{ height }} 
              transition={{ duration: 0.3, ease: "easeInOut" }} 
              style={{ overflow: "hidden" }}
            >
              <div ref={formBoundsRef}>
                <AnimatePresence mode="wait">
                  <MotionContainer key={mode} modeKey={mode} effect="fadeUp">
                    {/* Verification message */}
                    {verifyMessage && (
                      <div
                        className={`p-3 text-sm rounded mb-4 ${
                          verifyMessage.includes("✅") 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {verifyMessage}
                      </div>
                    )}

                    {/* General messages */}
                    {message && (
                      <div
                        className={`p-3 text-sm rounded mb-4 ${
                          message.includes("✅") 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : 
                          message.includes("⚠️") 
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    {/* Loading indicator */}
                    {verifying && (
                      <div className="p-3 text-sm rounded mb-4 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        🔄 Đang xác thực email...
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Email */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
                          required
                          disabled={loading || verifying}
                        />
                      </div>

                      {/* Register mode extra fields */}
                      {mode === "register" && (
                        <div className="space-y-4">
                          <div className="flex space-x-4">
                            <div className="space-y-2 flex-1">
                              <h4 className="text-sm font-medium text-muted-foreground">Given Name</h4>
                              <input
                                type="text"
                                value={givenName}
                                onChange={(e) => setGivenName(e.target.value)}
                                className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
                                required
                                disabled={loading}
                              />
                            </div>
                            <div className="space-y-2 flex-1">
                              <h4 className="text-sm font-medium text-muted-foreground">Family Name</h4>
                              <input
                                type="text"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
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
                              value={birthdate}
                              onChange={(e) => setBirthdate(e.target.value)}
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
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary pr-10 text-foreground"
                          required
                          minLength={6}
                          disabled={loading || verifying}
                        />
                        <button
                          type="button"
                          className="absolute right-0 top-7 p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          disabled={loading || verifying}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Confirm password (register) */}
                      {mode === "register" && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Confirm Password</h4>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
                            required
                            minLength={6}
                            disabled={loading}
                          />
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading || verifying}
                        className="w-full py-2"
                      >
                        {loading ? "Loading..." : mode === "login" ? "Sign in" : "Register"}
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

// Component chính - Export default
export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageLoading />}>
      <AuthFormWithParams />
    </Suspense>
  )
}