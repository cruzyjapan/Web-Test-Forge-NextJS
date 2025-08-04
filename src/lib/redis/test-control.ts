import Redis from "ioredis"

// Redis clients for pub/sub
let publisher: Redis | null = null
let subscriber: Redis | null = null

// Initialize Redis connections
export function initializeRedisClients() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
  
  if (!publisher) {
    publisher = new Redis(redisUrl, {
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          return null
        }
        // Wait 100ms between retries
        return 100
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    })
    
    // Handle connection errors silently
    publisher.on('error', (error) => {
      console.debug('Redis publisher connection error:', error.message)
    })
  }
  
  if (!subscriber) {
    subscriber = new Redis(redisUrl, {
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          return null
        }
        // Wait 100ms between retries
        return 100
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    })
    
    // Handle connection errors silently
    subscriber.on('error', (error) => {
      console.debug('Redis subscriber connection error:', error.message)
    })
  }
  
  return { publisher, subscriber }
}

// Test control channel names
export const CHANNELS = {
  TEST_CONTROL: "test:control",
  TEST_STATUS: "test:status",
  TEST_LOGS: "test:logs",
} as const

// Control message types
export interface TestControlMessage {
  action: 'pause' | 'resume' | 'stop' | 'status'
  runId: string
  timestamp: string
  userId?: string
}

// Status message types
export interface TestStatusMessage {
  runId: string
  status: 'running' | 'paused' | 'completed' | 'failed'
  progress?: {
    current: number
    total: number
    currentTest?: string
  }
  timestamp: string
}

// Publish control message
export async function publishTestControl(message: TestControlMessage) {
  const { publisher } = initializeRedisClients()
  
  if (!publisher) {
    throw new Error("Redis publisher not initialized")
  }
  
  const messageString = JSON.stringify(message)
  await publisher.publish(CHANNELS.TEST_CONTROL, messageString)
  
  // Also store in Redis for persistence
  const key = `test:control:${message.runId}`
  await publisher.set(key, messageString, 'EX', 3600) // Expire after 1 hour
  
  console.log(`Published test control message: ${message.action} for run ${message.runId}`)
}

// Subscribe to test status updates
export function subscribeToTestStatus(
  callback: (message: TestStatusMessage) => void
) {
  const { subscriber } = initializeRedisClients()
  
  if (!subscriber) {
    throw new Error("Redis subscriber not initialized")
  }
  
  subscriber.subscribe(CHANNELS.TEST_STATUS)
  
  subscriber.on('message', (channel, message) => {
    if (channel === CHANNELS.TEST_STATUS) {
      try {
        const parsedMessage = JSON.parse(message) as TestStatusMessage
        callback(parsedMessage)
      } catch (error) {
        console.error("Failed to parse test status message:", error)
      }
    }
  })
  
  return () => {
    subscriber.unsubscribe(CHANNELS.TEST_STATUS)
  }
}

// Get current test control state
export async function getTestControlState(runId: string): Promise<TestControlMessage | null> {
  const { publisher } = initializeRedisClients()
  
  if (!publisher) {
    throw new Error("Redis publisher not initialized")
  }
  
  const key = `test:control:${runId}`
  const data = await publisher.get(key)
  
  if (!data) {
    return null
  }
  
  try {
    return JSON.parse(data) as TestControlMessage
  } catch (error) {
    console.error("Failed to parse test control state:", error)
    return null
  }
}

// Store test execution state for recovery
export async function storeTestExecutionState(
  runId: string,
  state: {
    currentStepIndex: number
    completedSteps: any[]
    context: Record<string, any>
  }
) {
  const { publisher } = initializeRedisClients()
  
  if (!publisher) {
    throw new Error("Redis publisher not initialized")
  }
  
  const key = `test:execution:${runId}`
  await publisher.set(
    key,
    JSON.stringify(state),
    'EX',
    7200 // Expire after 2 hours
  )
}

// Retrieve test execution state for resume
export async function getTestExecutionState(runId: string) {
  const { publisher } = initializeRedisClients()
  
  if (!publisher) {
    throw new Error("Redis publisher not initialized")
  }
  
  const key = `test:execution:${runId}`
  const data = await publisher.get(key)
  
  if (!data) {
    return null
  }
  
  try {
    return JSON.parse(data)
  } catch (error) {
    console.error("Failed to parse test execution state:", error)
    return null
  }
}

// Clean up Redis connections
export async function cleanupRedisClients() {
  if (publisher) {
    await publisher.quit()
    publisher = null
  }
  
  if (subscriber) {
    await subscriber.quit()
    subscriber = null
  }
}