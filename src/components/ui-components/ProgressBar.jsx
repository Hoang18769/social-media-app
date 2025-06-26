"use client"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import NProgress from "nprogress"
import "nprogress/nprogress.css"

export default function ProgressBar() {
  const pathname = usePathname()

  useEffect(() => {
    NProgress.configure({ 
      showSpinner: false,
      minimum: 0.3
    })

    // Bắt click ngay lập tức
    const handleClick = (e) => {
      const link = e.target.closest('a')
      if (!link) return
      
      const href = link.getAttribute('href')
      if (href && href.startsWith('/') && href !== pathname) {
        NProgress.start()
      }
    }

    document.addEventListener('click', handleClick, true)
    
    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [pathname])

  useEffect(() => {
    NProgress.done()
  }, [pathname])

  return null
}