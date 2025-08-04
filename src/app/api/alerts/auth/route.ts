import { NextRequest, NextResponse } from "next/server"
import { initializeRedisClients } from "@/lib/redis/test-control"

export async function GET(request: NextRequest) {
  try {
    // Check if Redis URL is configured
    if (!process.env.REDIS_URL) {
      // Return empty alerts if Redis is not configured
      return NextResponse.json({ alerts: [] })
    }
    
    const { publisher } = initializeRedisClients()
    
    // Try to connect to Redis
    try {
      await publisher.connect()
      // Test Redis connection with a timeout
      await Promise.race([
        publisher.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Redis connection timeout")), 1000)
        )
      ])
    } catch (connectionError) {
      // Redis is not available, return empty alerts
      console.debug("Redis not available for auth alerts:", connectionError)
      return NextResponse.json({ alerts: [] })
    }
    
    // Get all authentication alerts
    const keys = await publisher.keys("alert:auth:*")
    const alerts = []
    
    for (const key of keys) {
      const alertData = await publisher.get(key)
      if (alertData) {
        try {
          const alert = JSON.parse(alertData)
          alerts.push(alert)
        } catch (error) {
          console.error(`Failed to parse alert ${key}:`, error)
        }
      }
    }
    
    // Sort by timestamp (newest first)
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return NextResponse.json({ alerts })
  } catch (error) {
    // Log at debug level to avoid cluttering logs
    console.debug("Failed to fetch auth alerts:", error)
    // Return empty alerts instead of error to prevent client-side issues
    return NextResponse.json({ alerts: [] })
  }
}