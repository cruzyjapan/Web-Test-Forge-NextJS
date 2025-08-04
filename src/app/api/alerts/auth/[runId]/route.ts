import { NextRequest, NextResponse } from "next/server"
import { initializeRedisClients } from "@/lib/redis/test-control"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    // Check if Redis URL is configured
    if (!process.env.REDIS_URL) {
      // Return success if Redis is not configured
      return NextResponse.json({ success: true })
    }
    
    const { publisher } = initializeRedisClients()
    
    // Try to connect to Redis
    try {
      await publisher.connect()
      // Delete the alert for this run
      await publisher.del(`alert:auth:${params.runId}`)
    } catch (redisError) {
      // Redis is not available, just return success
      console.debug("Redis not available for dismissing alert:", redisError)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.debug("Failed to dismiss auth alert:", error)
    // Return success anyway to avoid client-side errors
    return NextResponse.json({ success: true })
  }
}