import { NextRequest, NextResponse } from "next/server"
import { destroySession } from "@/lib/auth/session"

export async function POST(_request: NextRequest) {
  try {
    await destroySession()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    )
  }
}