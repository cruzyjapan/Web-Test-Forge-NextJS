import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }
    
    const session = JSON.parse(sessionCookie.value)
    const { currentPassword, newPassword, confirmPassword } = await request.json()
    
    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "すべてのフィールドを入力してください" },
        { status: 400 }
      )
    }
    
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "新しいパスワードが一致しません" },
        { status: 400 }
      )
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上にしてください" },
        { status: 400 }
      )
    }
    
    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      )
    }
    
    // 現在のパスワードを確認
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません" },
        { status: 400 }
      )
    }
    
    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // パスワードを更新
    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword }
    })
    
    return NextResponse.json({
      message: "パスワードを変更しました"
    })
  } catch (error) {
    console.error("Password change error:", error)
    return NextResponse.json(
      { error: "パスワードの変更に失敗しました" },
      { status: 500 }
    )
  }
}