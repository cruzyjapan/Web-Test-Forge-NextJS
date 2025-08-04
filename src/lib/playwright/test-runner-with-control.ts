import { chromium, Browser, Page, BrowserContext } from "playwright"
import { prisma } from "@/lib/db/prisma"
import { 
  initializeRedisClients, 
  CHANNELS, 
  TestControlMessage,
  TestStatusMessage,
  storeTestExecutionState,
  getTestExecutionState
} from "@/lib/redis/test-control"

interface TestStep {
  action: string
  selector?: string
  value?: string
  expectedResult?: string
  url?: string
}

interface TestCase {
  id: string
  name: string
  steps: TestStep[]
}

export class TestRunnerWithControl {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private isPaused: boolean = false
  private shouldStop: boolean = false
  private currentRunId: string
  private currentStepIndex: number = 0
  private completedSteps: any[] = []
  private subscriber: any = null

  constructor(runId: string) {
    this.currentRunId = runId
  }

  // Initialize Redis subscriber for control messages
  private async initializeControlListener() {
    const { subscriber } = initializeRedisClients()
    this.subscriber = subscriber
    
    await subscriber.subscribe(CHANNELS.TEST_CONTROL)
    
    subscriber.on('message', async (channel: string, message: string) => {
      if (channel === CHANNELS.TEST_CONTROL) {
        try {
          const controlMessage = JSON.parse(message) as TestControlMessage
          
          // Only process messages for this test run
          if (controlMessage.runId === this.currentRunId) {
            await this.handleControlMessage(controlMessage)
          }
        } catch (error) {
          console.error("Failed to process control message:", error)
        }
      }
    })
  }

  // Handle control messages
  private async handleControlMessage(message: TestControlMessage) {
    console.log(`Received control message: ${message.action} for run ${this.currentRunId}`)
    
    switch (message.action) {
      case 'pause':
        this.isPaused = true
        await this.saveExecutionState()
        console.log(`Test run ${this.currentRunId} paused`)
        break
        
      case 'resume':
        this.isPaused = false
        console.log(`Test run ${this.currentRunId} resumed`)
        break
        
      case 'stop':
        this.shouldStop = true
        await this.cleanup()
        console.log(`Test run ${this.currentRunId} stopped`)
        break
        
      case 'status':
        await this.publishStatus()
        break
    }
  }

  // Save current execution state
  private async saveExecutionState() {
    await storeTestExecutionState(this.currentRunId, {
      currentStepIndex: this.currentStepIndex,
      completedSteps: this.completedSteps,
      context: {
        url: this.page ? await this.page.url() : null,
        cookies: this.context ? await this.context.cookies() : null,
      }
    })
  }

  // Publish current status
  private async publishStatus() {
    const { publisher } = initializeRedisClients()
    
    const statusMessage: TestStatusMessage = {
      runId: this.currentRunId,
      status: this.isPaused ? 'paused' : 'running',
      progress: {
        current: this.currentStepIndex,
        total: 0, // Will be set when test case is loaded
        currentTest: this.completedSteps[this.completedSteps.length - 1]?.name || null
      },
      timestamp: new Date().toISOString()
    }
    
    await publisher.publish(CHANNELS.TEST_STATUS, JSON.stringify(statusMessage))
  }

  // Wait while paused
  private async waitWhilePaused() {
    while (this.isPaused && !this.shouldStop) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Run test with pause/resume support
  async runTest(testCase: TestCase, options: {
    projectId: string
    suiteId?: string
    baseUrl?: string
    requiresAuth?: boolean
    authCredentials?: {
      username: string
      password: string
      loginUrl?: string
      usernameSelector?: string
      passwordSelector?: string
      submitSelector?: string
    }
  }) {
    try {
      // Initialize control listener
      await this.initializeControlListener()
      
      // Check if we're resuming from a paused state
      const executionState = await getTestExecutionState(this.currentRunId)
      if (executionState) {
        this.currentStepIndex = executionState.currentStepIndex
        this.completedSteps = executionState.completedSteps
        console.log(`Resuming test from step ${this.currentStepIndex}`)
      }

      // Update test run status to running
      await prisma.testRun.update({
        where: { id: this.currentRunId },
        data: {
          status: 'running',
          startedAt: executionState ? undefined : new Date(),
        }
      })

      // Initialize browser
      this.browser = await chromium.launch({
        headless: process.env.NODE_ENV === 'production',
      })

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        // Restore cookies if resuming
        ...(executionState?.context?.cookies && {
          storageState: {
            cookies: executionState.context.cookies,
            origins: []
          }
        })
      })

      this.page = await this.context.newPage()

      // Navigate to the starting URL if resuming
      if (executionState?.context?.url) {
        await this.page.goto(executionState.context.url)
      }

      // Handle authentication if required
      if (options.requiresAuth && options.authCredentials && !executionState) {
        const authResult = await this.performAuthentication(options)
        if (!authResult.success) {
          // Send authentication failure alert
          await this.sendAuthenticationFailureAlert(authResult.error || 'Authentication failed')
          
          // Update test run as failed
          await prisma.testRun.update({
            where: { id: this.currentRunId },
            data: {
              status: 'failed',
              completedAt: new Date(),
              results: JSON.stringify({
                authenticationFailed: true,
                error: authResult.error || 'Authentication failed'
              })
            }
          })
          
          throw new Error(authResult.error || 'Authentication failed')
        }
      }

      // Execute test steps
      const steps = typeof testCase.steps === 'string' 
        ? JSON.parse(testCase.steps) 
        : testCase.steps

      for (let i = this.currentStepIndex; i < steps.length; i++) {
        // Check if we should pause or stop
        await this.waitWhilePaused()
        if (this.shouldStop) break

        this.currentStepIndex = i
        const step = steps[i]
        
        console.log(`Executing step ${i + 1}/${steps.length}: ${step.action}`)
        
        try {
          await this.executeStep(step)
          
          // Take screenshot after each step
          const screenshotPath = `public/screenshots/${this.currentRunId}_step_${i + 1}.png`
          await this.page.screenshot({ path: screenshotPath })
          
          this.completedSteps.push({
            index: i,
            name: step.action,
            success: true,
            screenshot: screenshotPath,
            timestamp: new Date().toISOString()
          })
          
          // Save state after each successful step
          await this.saveExecutionState()
          await this.publishStatus()
          
        } catch (error) {
          console.error(`Step ${i + 1} failed:`, error)
          
          this.completedSteps.push({
            index: i,
            name: step.action,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          })
          
          // Update test run as failed
          await prisma.testRun.update({
            where: { id: this.currentRunId },
            data: {
              status: 'failed',
              completedAt: new Date(),
              results: JSON.stringify({
                steps: this.completedSteps,
                error: error instanceof Error ? error.message : String(error)
              })
            }
          })
          
          throw error
        }
      }

      // Test completed successfully
      if (!this.shouldStop) {
        await prisma.testRun.update({
          where: { id: this.currentRunId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            results: JSON.stringify({
              steps: this.completedSteps,
              success: true
            })
          }
        })
      }

    } catch (error) {
      console.error("Test execution failed:", error)
      throw error
    } finally {
      await this.cleanup()
    }
  }

  // Execute a single test step
  private async executeStep(step: TestStep) {
    if (!this.page) throw new Error("Page not initialized")

    switch (step.action) {
      case 'navigate':
        if (step.url || step.value) {
          await this.page.goto(step.url || step.value)
        }
        break

      case 'click':
        if (step.selector) {
          await this.page.click(step.selector)
        }
        break

      case 'fill':
      case 'type':
        if (step.selector && step.value) {
          await this.page.fill(step.selector, step.value)
        }
        break

      case 'select':
        if (step.selector && step.value) {
          await this.page.selectOption(step.selector, step.value)
        }
        break

      case 'wait':
        const timeout = parseInt(step.value || '1000')
        await this.page.waitForTimeout(timeout)
        break

      case 'waitForSelector':
        if (step.selector) {
          await this.page.waitForSelector(step.selector)
        }
        break

      case 'assert':
      case 'assertText':
        if (step.selector) {
          const element = await this.page.$(step.selector)
          if (!element) {
            throw new Error(`Element not found: ${step.selector}`)
          }
          if (step.value) {
            const text = await element.textContent()
            if (!text?.includes(step.value)) {
              throw new Error(`Text assertion failed. Expected: ${step.value}, Got: ${text}`)
            }
          }
        }
        break

      case 'screenshot':
        const screenshotName = step.value || `screenshot_${Date.now()}`
        await this.page.screenshot({ 
          path: `public/screenshots/${this.currentRunId}_${screenshotName}.png` 
        })
        break

      default:
        console.warn(`Unknown action: ${step.action}`)
    }
  }

  // Perform authentication
  private async performAuthentication(options: any): Promise<{ success: boolean; error?: string }> {
    if (!this.page) return { success: false, error: "Page not initialized" }

    try {
      // Navigate to login page
      const loginUrl = options.authCredentials.loginUrl || `${options.baseUrl}/login`
      await this.page.goto(loginUrl, { waitUntil: 'networkidle' })

      // Default selectors if not provided
      const usernameSelector = options.authCredentials.usernameSelector || 'input[type="email"], input[type="text"], input[name="username"], input[name="email"], #username, #email'
      const passwordSelector = options.authCredentials.passwordSelector || 'input[type="password"], input[name="password"], #password'
      const submitSelector = options.authCredentials.submitSelector || 'button[type="submit"], input[type="submit"], button:has-text("login"), button:has-text("sign in"), button:has-text("ログイン")'

      // Fill in credentials
      await this.page.fill(usernameSelector, options.authCredentials.username)
      await this.page.fill(passwordSelector, options.authCredentials.password)

      // Submit form
      await this.page.click(submitSelector)

      // Wait for navigation or response
      await this.page.waitForLoadState('networkidle')

      // Check if login was successful
      // Look for common error indicators
      const errorSelectors = [
        '.error', '.alert-danger', '.alert-error', 
        '[role="alert"]', '.login-error', '.auth-error',
        'text=Invalid', 'text=incorrect', 'text=failed',
        'text=認証に失敗', 'text=ログインできませんでした'
      ]

      for (const selector of errorSelectors) {
        try {
          const errorElement = await this.page.$(selector)
          if (errorElement) {
            const errorText = await errorElement.textContent()
            return { success: false, error: `Login failed: ${errorText}` }
          }
        } catch {
          // Continue checking other selectors
        }
      }

      // Check if we're still on the login page
      const currentUrl = this.page.url()
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        // Try to find any visible error message
        const visibleText = await this.page.textContent('body')
        if (visibleText?.toLowerCase().includes('error') || 
            visibleText?.toLowerCase().includes('invalid') ||
            visibleText?.includes('失敗')) {
          return { success: false, error: "Authentication failed - still on login page" }
        }
      }

      // Assume success if no errors found
      return { success: true }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Authentication failed"
      }
    }
  }

  // Send authentication failure alert
  private async sendAuthenticationFailureAlert(error: string) {
    const { publisher } = initializeRedisClients()
    
    const alertMessage = {
      type: 'AUTH_FAILURE',
      runId: this.currentRunId,
      error: error,
      timestamp: new Date().toISOString()
    }
    
    await publisher.publish('test:alerts', JSON.stringify(alertMessage))
    
    // Also store in Redis for persistence
    await publisher.set(
      `alert:auth:${this.currentRunId}`,
      JSON.stringify(alertMessage),
      'EX',
      86400 // Expire after 24 hours
    )
  }

  // Cleanup resources
  private async cleanup() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(CHANNELS.TEST_CONTROL)
      this.subscriber = null
    }

    if (this.page) {
      await this.page.close()
      this.page = null
    }

    if (this.context) {
      await this.context.close()
      this.context = null
    }

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}