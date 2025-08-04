import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { createSession } from "@/lib/auth/session"
import { getErrorMessage } from "@/lib/api/error-messages"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body
    const lang = request.headers.get('Accept-Language')?.startsWith('ja') ? 'ja' : 'en'

    if (!email || !password) {
      return NextResponse.json(
        { error: getErrorMessage('validation.required_field', lang) },
        { status: 400 }
      )
    }

    // ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: getErrorMessage('auth.invalid_credentials', lang) },
        { status: 401 }
      )
    }

    // パスワードを検証
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: getErrorMessage('auth.invalid_credentials', lang) },
        { status: 401 }
      )
    }

    // セッション作成
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name || undefined
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "ログインに失敗しました" },
      { status: 500 }
    )
  }
}