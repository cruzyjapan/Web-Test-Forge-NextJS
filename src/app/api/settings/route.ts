import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// 設定のデフォルト値
const DEFAULT_SETTINGS = {
  general: {
    name: "",
    email: "",
    organization: "",
    language: "ja",
    timezone: "asia-tokyo"
  },
  test: {
    defaultBrowser: "chrome",
    timeout: 30,
    headless: true,
    autoScreenshot: true,
    maxWorkers: 4,
    retryOnFailure: false
  },
  notifications: {
    soundEnabled: true,
    notifyOnSuccess: false,
    notifyOnFailure: true,
    emailNotifications: false,
    slackIntegration: false,
    slackWebhook: ""
  },
  security: {
    twoFactorEnabled: false
  },
  advanced: {
    dataRetentionDays: 30,
    logLevel: "info"
  }
}

// 設定をクッキーに保存（実際のアプリケーションではデータベースを使用すべき）
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const settingsStr = cookieStore.get('app-settings')?.value
    
    if (settingsStr) {
      try {
        const settings = JSON.parse(decodeURIComponent(settingsStr))
        return NextResponse.json(settings)
      } catch (e) {
        // パースエラーの場合はデフォルト設定を返す
        return NextResponse.json(DEFAULT_SETTINGS)
      }
    }
    
    return NextResponse.json(DEFAULT_SETTINGS)
  } catch (error) {
    console.error("Failed to load settings:", error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 設定をマージ（部分更新をサポート）
    const cookieStore = await cookies()
    const existingSettingsStr = cookieStore.get('app-settings')?.value
    let existingSettings = DEFAULT_SETTINGS
    
    if (existingSettingsStr) {
      try {
        existingSettings = JSON.parse(decodeURIComponent(existingSettingsStr))
      } catch (e) {
        // パースエラーは無視
      }
    }
    
    const updatedSettings = {
      ...existingSettings,
      ...body,
      general: {
        ...existingSettings.general,
        ...(body.general || {})
      },
      test: {
        ...existingSettings.test,
        ...(body.test || {})
      },
      notifications: {
        ...existingSettings.notifications,
        ...(body.notifications || {})
      },
      security: {
        ...existingSettings.security,
        ...(body.security || {})
      },
      advanced: {
        ...existingSettings.advanced,
        ...(body.advanced || {})
      }
    }
    
    // クッキーに保存（httpOnlyで安全に保存）
    const response = NextResponse.json({
      success: true,
      settings: updatedSettings
    })
    
    response.cookies.set('app-settings', encodeURIComponent(JSON.stringify(updatedSettings)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1年間
    })
    
    return response
  } catch (error) {
    console.error("Failed to save settings:", error)
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    )
  }
}

// 設定をリセット
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      settings: DEFAULT_SETTINGS
    })
    
    response.cookies.delete('app-settings')
    
    return response
  } catch (error) {
    console.error("Failed to reset settings:", error)
    return NextResponse.json(
      { error: "Failed to reset settings" },
      { status: 500 }
    )
  }
}