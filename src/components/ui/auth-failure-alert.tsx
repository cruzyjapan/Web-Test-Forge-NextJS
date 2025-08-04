"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"

interface AlertData {
  runId: string
  error: string
  timestamp: string
}

export function AuthFailureAlert() {
  // Temporarily disabled - this component requires Redis to be configured
  // To enable auth failure alerts:
  // 1. Set up Redis server
  // 2. Configure REDIS_URL in .env
  // 3. Set NEXT_PUBLIC_ENABLE_AUTH_ALERTS=true in .env
  // 4. Uncomment the code below and remove the return null statement
  
  return null
}

/* Code to enable when Redis is configured:

export function AuthFailureAlert() {
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const { language } = useLanguage()

  useEffect(() => {
    // Check for authentication alerts
    const checkAlerts = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        const res = await fetch("/api/alerts/auth", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        }).catch(() => null).finally(() => {
          clearTimeout(timeoutId)
        })
        
        if (res && res.ok) {
          try {
            const data = await res.json()
            setAlerts(data.alerts || [])
          } catch {
            // Ignore JSON parse errors
          }
        }
      } catch {
        // Ignore all errors
      }
    }

    checkAlerts()
    const interval = setInterval(checkAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const dismissAlert = async (runId: string) => {
    try {
      await fetch(`/api/alerts/auth/${runId}`, { 
        method: "DELETE",
        credentials: "include"
      }).catch(() => {
        // Silently handle if Redis is not available
        return null
      })
      setAlerts(prev => prev.filter(a => a.runId !== runId))
    } catch (error) {
      console.debug("Failed to dismiss alert:", error)
    }
  }

  if (alerts.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md space-y-2">
      {alerts.map((alert) => (
        <Alert key={alert.runId} variant="destructive" className="bg-red-50 border-red-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>
              {language === 'ja' ? '認証エラー' : 'Authentication Error'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => dismissAlert(alert.runId)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">
                {language === 'ja' 
                  ? 'ログインに失敗したため、テストが中断されました。'
                  : 'Test interrupted due to login failure.'}
              </p>
              <p className="text-sm text-gray-600">
                {alert.error}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(alert.timestamp).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
*/