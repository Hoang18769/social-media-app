// middleware.js
import { NextResponse } from 'next/server'

export default function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;
  const userId = request.cookies.get('userId')?.value;

  const protectedPaths = ['/', '/profile', '/chats', '/settings', '/search', '/friends'];

  const isProtected = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isProtected && (!token || !userId)) {
    return NextResponse.redirect(new URL('/register', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
