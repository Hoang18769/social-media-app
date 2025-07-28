"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Button from "@/components/ui-components/Button"
import { motion } from "framer-motion"
import useMeasure from "react-use-measure"
import MotionContainer from "@/components/ui-components/MotionContainer"
import api from "@/utils/axios"
import axios from "axios"
import process from "next/dist/build/webpack/loaders/resolve-url-loader/lib/postcss";

// Separate component that uses useSearchParams
function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const code = searchParams.get("code")

  const [verified, setVerified] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showResendButton, setShowResendButton] = useState(false)
  const formRef = useRef(null)
  const [formBoundsRef, { height }] = useMeasure()

  useEffect(() => {
    if (!email || !code) {
      setError("❌ Đường dẫn không hợp lệ.")
      return
    }

    const verify = async () => {
      try {
        const res = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/v1/update-password/verify`, {
          email,
          code,
        })
        console.log(res)
        if (res.data.code === 200) {
          console.log(res)
          setVerified(true)
        }
      } catch (err) {
        console.log(err.response);
        if (err?.response?.data?.code === 1009 || err?.response?.data?.code === 9996) {
          setError("❌ Mã xác thực không hợp lệ hoặc đã hết hạn.")
          setShowResendButton(true)
          return
        }
        setError("❌ Mã xác thực không hợp lệ hoặc đã hết hạn. 2")
      }
    }

    verify()
  }, [email, code])

  const handleResend = async (e) => {
    e.preventDefault()
    setMessage("")
    if (!email) {
      setMessage("❌ Email không hợp lệ.")
      return
    }
    setLoading(true)
    try {
      const res = await api.post(`/v1/forgot-password/resend-email?email=${email}`,
        {}, // body (empty object vì bạn gửi data qua query string)
        {
          headers: {
            "X-Continue-Page": `${process.env.NEXT_PUBLIC_API_URL}/reset-password`
          }
        }
      )
      if (res.data.code === 200) {
        setError("");
        setSent(true);
        setMessage("✅ Gửi lại email thay đổi thành công!")
      }
    } catch (err) {
      setMessage(`❌Gửi email thất bại: ${err.response?.data?.message || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")
    if (!password || !confirmPassword) {
      setMessage("❌ Vui lòng nhập đầy đủ mật khẩu.")
      return
    }

    if (password !== confirmPassword) {
      setMessage("❌ Mật khẩu xác nhận không khớp.")
      return
    }

    setLoading(true)
    try {
      const res = await api.patch(`/v1/update-password/update`, {
        email,
        password: password,
      })
      console.log(res)
      setMessage("✅ Mật khẩu của bạn đã được thay đổi thành công!")
      setTimeout(() => router.push("/register"), 3000)
    } catch (err) {
      setMessage(`❌Đặt lại mật khẩu thất bại: ${err.response?.data?.message || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 bg-background">
      <div
        className="w-full max-w-md text-card-foreground rounded-xl p-8 shadow-xl bg-[var(--card)]"
        style={{ overflow: "hidden" }}
      >
        <div className="flex items-center mb-6">
          <Link href="/register" className="mr-4 text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
        </div>

        <motion.div animate={{ height }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
          <div ref={formBoundsRef}>
            <MotionContainer modeKey="reset-password" effect="fadeUp">
              {error ? (
                <div className="space-y-4">
                  <div className="bg-red-100 text-red-800 text-sm p-3 rounded">{error}</div>
                  {showResendButton && (

                    <Button disabled={loading} onClick={handleResend} className=" w-full text-md text-white bg-black px-3 py-2 rounded hover:underline">
                      Gửi lại email xác thực 📩
                    </Button>
                  )}
                </div>
              ) : sent ? <div
                className={`p-3 text-sm rounded ${message.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
              >
                {message}
              </div> : !verified ? (
                <div className="text-muted-foreground text-sm">Đang xác minh...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {message && (
                    <div
                      className={`p-3 text-sm rounded ${message.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                    >
                      {message}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Mật khẩu mới</h4>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
                      placeholder="Nhập mật khẩu mới"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Xác nhận mật khẩu</h4>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border-b border-input px-0 py-1 focus:outline-none focus:border-primary text-foreground"
                      placeholder="Nhập lại mật khẩu"
                      required
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button type="submit" disabled={loading} className="w-full max-w-xs text-center">
                      {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
                    </Button>
                  </div>
                </form>
              )}
            </MotionContainer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md text-card-foreground rounded-xl p-8 shadow-xl bg-[var(--card)]">
        <div className="flex items-center mb-6">
          <Link href="/login" className="mr-4 text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
        </div>
        <div className="text-muted-foreground text-sm">Đang tải...</div>
      </div>
    </div>
  )
}

// Main component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-grow flex flex-col md:flex-row h-full">
        {/* Left Side */}
        <div className="w-full md:w-1/2 h-screen flex items-center justify-center bg-muted relative">
          <Image
            src="/Connect.png"
            alt="Network illustration"
            width={400}
            height={400}
            className="max-w-full h-auto object-contain"
            priority
          />
        </div>

        {/* Right Side with Suspense */}
        <Suspense fallback={<LoadingFallback />}>
          <ResetPasswordContent />
        </Suspense>
      </main>
    </div>
  )
}