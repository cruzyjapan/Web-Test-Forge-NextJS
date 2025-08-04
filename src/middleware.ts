import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 認証不要のパス
const publicPaths = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 静的ファイルや Next.js の内部ルートはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.includes('.') // 静的ファイル (.js, .css, .png など)
  ) {
    return NextResponse.next()
  }
  
  // 公開パスはスキップ
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }
  
  // セッションチェック
  const session = request.cookies.get('session')
  
  if (!session) {
    // APIリクエストの場合は401エラーを返す
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 通常のページリクエストの場合はログインページにリダイレクト
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}