import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export interface SessionData {
  userId: string
  email: string
  name?: string
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  
  if (!sessionCookie || !sessionCookie.value) {
    return null
  }
  
  try {
    const session = JSON.parse(sessionCookie.value) as SessionData
    return session
  } catch (error) {
    console.error('Failed to parse session:', error)
    return null
  }
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  const sessionCookie = request.cookies.get('session')
  
  if (!sessionCookie || !sessionCookie.value) {
    return null
  }
  
  try {
    const session = JSON.parse(sessionCookie.value) as SessionData
    return session
  } catch (error) {
    console.error('Failed to parse session from request:', error)
    return null
  }
}

export async function createSession(data: SessionData) {
  const cookieStore = await cookies()
  
  cookieStore.set('session', JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}