// utils/clientMetadata.js
import { useEffect } from "react"

// ✅ Base metadata template
const baseMetadata = {
    siteName: 'PocPoc - Social App',
    defaultDescription: 'PocPoc - Ứng dụng mạng xã hội với tính năng chat, video call và kết nối bạn bè',
    defaultImage: '/pocpoc.png',
    baseUrl: 'https://pocpoc.online',
    twitterHandle: '@PocPoc'
}

// ✅ Hàm update document head cho client-side
export function updatePageMetadata(config) {
    const {
        title,
        description = baseMetadata.defaultDescription,
        keywords = [],
        image = baseMetadata.defaultImage,
        url = baseMetadata.baseUrl,
        type = 'website',
        noIndex = false
    } = config

    const fullTitle = `${title} | ${baseMetadata.siteName}`
    const fullUrl = url.startsWith('http') ? url : `${baseMetadata.baseUrl}${url}`
    const fullImage = image.startsWith('http') ? image : `${baseMetadata.baseUrl}${image}`

    // Update document title
    document.title = fullTitle

    // Helper function to update or create meta tags
    const updateMetaTag = (selector, content, property = 'content') => {
        let element = document.querySelector(selector)
        if (!element) {
            element = document.createElement('meta')
            const attrName = selector.includes('property=') ? 'property' : 'name'
            const attrValue = selector.match(/"([^"]+)"/)[1]
            element.setAttribute(attrName, attrValue)
            document.head.appendChild(element)
        }
        element.setAttribute(property, content)
    }

    // Update basic meta tags
    updateMetaTag('meta[name="description"]', description)
    updateMetaTag('meta[name="keywords"]', keywords.join(', '))

    // Update Open Graph tags
    updateMetaTag('meta[property="og:title"]', fullTitle)
    updateMetaTag('meta[property="og:description"]', description)
    updateMetaTag('meta[property="og:url"]', fullUrl)
    updateMetaTag('meta[property="og:site_name"]', baseMetadata.siteName)
    updateMetaTag('meta[property="og:image"]', fullImage)
    updateMetaTag('meta[property="og:type"]', type)
    updateMetaTag('meta[property="og:locale"]', 'vi_VN')

    // Update Twitter tags
    updateMetaTag('meta[name="twitter:card"]', 'summary_large_image')
    updateMetaTag('meta[name="twitter:title"]', fullTitle)
    updateMetaTag('meta[name="twitter:description"]', description)
    updateMetaTag('meta[name="twitter:image"]', fullImage)
    updateMetaTag('meta[name="twitter:site"]', baseMetadata.twitterHandle)

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]')
    if (!canonicalLink) {
        canonicalLink = document.createElement('link')
        canonicalLink.rel = 'canonical'
        document.head.appendChild(canonicalLink)
    }
    canonicalLink.href = fullUrl

    // Update robots
    const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow'
    updateMetaTag('meta[name="robots"]', robotsContent)
}

// ✅ Hook cho React components
export function usePageMetadata(config) {
    useEffect(() => {
        updatePageMetadata(config)
    }, [config])
}

// ✅ Preset metadata cho các page phổ biến
export const pageMetadata = {
    home: () => ({
        title: 'PocPoc - Trang Chủ',
        description: 'PocPoc - Kết nối với bạn bè, chia sẻ khoảnh khắc và trò chuyện trong ứng dụng mạng xã hội',
        keywords: ['social media', 'chats', 'friends', 'messaging', 'video call'],
        image: '/pocpoc.png',
        url: '/home'
    }),

    chats: () => ({
        title: 'PocPoc - Tin Nhắn',
        description: 'PocPoc - Trò chuyện thời gian thực với bạn bè và gia đình',
        keywords: ['chat', 'messaging', 'conversation'],
        image: '/pocpoc.png',
        url: '/chats'
    }),

    friends: () => ({
        title: 'PocPoc - Bạn Bè',
        description: 'PocPoc - Tìm kiếm và kết nối với những người bạn mới',
        keywords: ['friends', 'connect', 'social'],
        image: '/pocpoc.png',
        url: '/friends'
    }),
    profile: () => ({
        title: 'PocPoc - Trang cá nhân',
        description: 'PocPoc - Quản lý thông tin cá nhân của bản thân, xem thông tin của những người khác',
        keywords: ['profile', 'friend', 'information'],
        image: '/pocpoc.png',
        url: '/profile'
    }),

    settings: () => ({
        title: 'PocPoc - Cài Đặt',
        description: 'PocPoc - Quản lý tài khoản và cài đặt ứng dụng',
        keywords: ['settings', 'account', 'preferences'],
        image: '/og-settings.jpg',
        url: '/settings',
        noIndex: true
    }),

    search: () => ({
        title: 'PocPoc - Tìm Kiếm',
        description: 'PocPoc - Tìm kiếm người dùng, nội dung và cuộc trò chuyện',
        keywords: ['search', 'find', 'users'],
        image: '/og-search.jpg',
        url: '/search'
    })
}

// ✅ Hàm tạo metadata cho trang lỗi
export function createErrorMetadata(errorCode) {
    const errorMessages = {
        404: 'Trang Không Tồn Tại',
        500: 'Lỗi Máy Chủ',
        403: 'Không Có Quyền Truy Cập'
    }

    return {
        title: errorMessages[errorCode] || 'Lỗi',
        description: `Đã xảy ra lỗi ${errorCode}. Vui lòng thử lại sau.`,
        noIndex: true
    }
}