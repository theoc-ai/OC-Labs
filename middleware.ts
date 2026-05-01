import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // /signup is a public auth route — exempt before updateSession runs
  if (request.nextUrl.pathname === '/signup') {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/v1/sync|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
