import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function DELETE(request: NextRequest) {
  try {
    // すべてのテストデータを削除（ユーザーとプロジェクトは残す）
    
    // 1. スクリーンショットを削除
    await prisma.screenshot.deleteMany({})
    
    // 2. テスト実行を削除
    await prisma.testRun.deleteMany({})
    
    // 3. テストケースを削除
    await prisma.testCase.deleteMany({})
    
    // 4. テストスイートを削除
    await prisma.testSuite.deleteMany({})
    
    return NextResponse.json({ 
      success: true,
      message: "すべてのテストデータを削除しました"
    })
  } catch (error) {
    console.error("Failed to clear all data:", error)
    return NextResponse.json(
      { error: "データの削除に失敗しました" },
      { status: 500 }
    )
  }
}