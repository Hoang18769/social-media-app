// middleware.js
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n';
// Tạo intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never',
  localeDetection: true,
  pathnames: {
    '/': '/',
    '/home': '/home',
    '/profile': '/profile'
  }
});

export default function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Lấy locale từ pathname (nếu có)
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  
  // Xác định path thực sự (bỏ locale prefix)
  const actualPath = pathnameHasLocale 
    ? pathname.replace(/^\/[^\/]+/, '') || '/'
    : pathname;

  // Kiểm tra auth cho các path được bảo vệ
  const token = request.cookies.get('accessToken')?.value;
  const userId = request.cookies.get('userId')?.value;

  const protectedPaths = ['/', '/home', '/profile', '/chats', '/settings', '/search', '/friends'];

  const isProtected = protectedPaths.some(path =>
    actualPath === path || actualPath.startsWith(path + '/')
  );

  // Nếu path được bảo vệ và không có auth, redirect đến register
  if (isProtected && (!token || !userId)) {
    // Giữ nguyên locale trong URL redirect
    const locale = pathnameHasLocale ? pathname.split('/')[1] : defaultLocale;
    const redirectUrl = locale === defaultLocale 
      ? new URL('/register', request.url)
      : new URL(`/${locale}/register`, request.url);
    
    return NextResponse.redirect(redirectUrl);
  }

  // Áp dụng intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    
    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(vi|en)/:path*',
    
    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    '/((?!_next|_vercel|api|.*\\..*).*)'
  ]
};