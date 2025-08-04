import { Worker, Job, Queue } from "bullmq"
import { TestRunnerWithControl } from "@/lib/playwright/test-runner-with-control"
import { prisma } from "@/lib/db/prisma"
import { initializeRedisClients, subscribeToTestStatus } from "@/lib/redis/test-control"
import Redis from "ioredis"

// Queue configuration
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

// Create test execution queue
export const testQueue = new Queue("test-execution", { connection })

// Job data interface
interface TestJobData {
  runId: string
  testCaseId: string
  projectId: string
  suiteId?: string
  baseUrl?: string
  requiresAuth?: boolean
  authCredentials?: {
    username: string
    password: string
  }
}

// Create worker to process test jobs
export function createTestWorker() {
  const worker = new Worker<TestJobData>(
    "test-execution",
    async (job: Job<TestJobData>) => {
      const { runId, testCaseId, projectId, suiteId, baseUrl, requiresAuth, authCredentials } = job.data
      
      console.log(`Processing test job ${job.id} for run ${runId}`)
      
      try {
        // Get test case details
        const testCase = await prisma.testCase.findUnique({
          where: { id: testCaseId },
          include: {
            suite: {
              include: {
                project: true
              }
            }
          }
        })
        
        if (!testCase) {
          throw new Error(`Test case ${testCaseId} not found`)
        }
        
        // Create test runner with control support
        const runner = new TestRunnerWithControl(runId)
        
        // Subscribe to test status updates
        const unsubscribe = subscribeToTestStatus((status) => {
          if (status.runId === runId) {
            // Update job progress
            job.updateProgress(status.progress?.current || 0)
            
            // Log status
            console.log(`Test ${runId} status: ${status.status}, progress: ${status.progress?.current}/${status.progress?.total}`)
          }
        })
        
        try {
          // Run the test
          await runner.runTest(
            {
              id: testCase.id,
              name: testCase.name,
              steps: testCase.steps as any
            },
            {
              projectId,
              suiteId,
              baseUrl: baseUrl || testCase.suite?.project?.baseUrl,
              requiresAuth,
              authCredentials
            }
          )
          
          console.log(`Test job ${job.id} completed successfully`)
          return { success: true, runId }
          
        } finally {
          // Cleanup subscription
          unsubscribe()
        }
        
      } catch (error) {
        console.error(`Test job ${job.id} failed:`, error)
        
        // Update test run status to failed
        await prisma.testRun.update({
          where: { id: runId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            results: JSON.stringify({
              error: error instanceof Error ? error.message : String(error)
            })
          }
        })
        
        throw error
      }
    },
    {
      connection,
      concurrency: 5, // Run up to 5 tests concurrently
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 100, // Keep last 100 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        count: 500, // Keep last 500 failed jobs
      },
    }
  )
  
  // Handle worker events
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed for run ${job.data.runId}`)
  })
  
  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed for run ${job?.data.runId}:`, err)
  })
  
  worker.on('stalled', (jobId) => {
    console.warn(`Job ${jobId} stalled`)
  })
  
  // Support for pausing/resuming jobs
  worker.on('paused', () => {
    console.log('Worker paused')
  })
  
  worker.on('resumed', () => {
    console.log('Worker resumed')
  })
  
  return worker
}

// Add a test to the queue
export async function enqueueTest(data: TestJobData) {
  const job = await testQueue.add(
    `test-${data.runId}`,
    data,
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  )
  
  console.log(`Test job ${job.id} added to queue for run ${data.runId}`)
  return job
}

// Pause a specific test job
export async function pauseTestJob(runId: string) {
  const jobs = await testQueue.getJobs(['active'])
  
  for (const job of jobs) {
    if (job.data.runId === runId) {
      await job.updateProgress({ paused: true })
      console.log(`Paused job for run ${runId}`)
      return true
    }
  }
  
  return false
}

// Resume a specific test job
export async function resumeTestJob(runId: string) {
  const jobs = await testQueue.getJobs(['paused', 'waiting'])
  
  for (const job of jobs) {
    if (job.data.runId === runId) {
      await job.updateProgress({ paused: false })
      console.log(`Resumed job for run ${runId}`)
      return true
    }
  }
  
  return false
}

// Cancel a test job
export async function cancelTestJob(runId: string) {
  const jobs = await testQueue.getJobs(['active', 'waiting', 'paused'])
  
  for (const job of jobs) {
    if (job.data.runId === runId) {
      await job.remove()
      console.log(`Cancelled job for run ${runId}`)
      return true
    }
  }
  
  return false
}

// Get job status
export async function getTestJobStatus(runId: string) {
  const jobs = await testQueue.getJobs(['active', 'waiting', 'completed', 'failed', 'paused'])
  
  for (const job of jobs) {
    if (job.data.runId === runId) {
      return {
        id: job.id,
        state: await job.getState(),
        progress: job.progress,
        data: job.data,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
      }
    }
  }
  
  return null
}

// Clean up old jobs
export async function cleanupOldJobs() {
  const completedJobs = await testQueue.getJobs(['completed'])
  const failedJobs = await testQueue.getJobs(['failed'])
  
  const now = Date.now()
  const oneDayAgo = now - 24 * 3600 * 1000
  const oneWeekAgo = now - 7 * 24 * 3600 * 1000
  
  // Remove completed jobs older than 1 day
  for (const job of completedJobs) {
    if (job.timestamp < oneDayAgo) {
      await job.remove()
    }
  }
  
  // Remove failed jobs older than 1 week
  for (const job of failedJobs) {
    if (job.timestamp < oneWeekAgo) {
      await job.remove()
    }
  }
}

// Initialize worker on server startup
let worker: Worker | null = null

export function initializeTestWorker() {
  if (!worker) {
    worker = createTestWorker()
    console.log('Test worker initialized')
    
    // Set up periodic cleanup
    setInterval(cleanupOldJobs, 3600 * 1000) // Clean up every hour
  }
  return worker
}

// Shutdown worker gracefully
export async function shutdownTestWorker() {
  if (worker) {
    await worker.close()
    worker = null
    console.log('Test worker shut down')
  }
}