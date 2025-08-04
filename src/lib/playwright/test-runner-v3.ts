import { prisma } from '@/lib/db/prisma'
import path from 'path'
import fs from 'fs/promises'
import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { execSync } from 'child_process'
import os from 'os'

// Skip host requirements validation for Playwright
process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1'
// Use system default path for browsers
process.env.PLAYWRIGHT_BROWSERS_PATH = '0'

// Parse screenshot size to viewport dimensions
function parseScreenshotSize(size?: string): { width: number; height: number } {
  if (!size) return { width: 1920, height: 1080 }
  
  const viewportSizes: Record<string, { width: number; height: number }> = {
    // iPhone Series
    'mobile-iphone12-mini': { width: 375, height: 812 },
    'mobile-iphone12': { width: 390, height: 844 },
    'mobile-iphone14': { width: 390, height: 844 },
    'mobile-iphone14pro': { width: 393, height: 852 },
    'mobile-iphone14plus': { width: 428, height: 926 },
    'mobile-iphone15': { width: 393, height: 852 },
    'mobile-iphone15pro': { width: 393, height: 852 },
    'mobile-iphone15promax': { width: 430, height: 932 },
    'mobile-iphone16': { width: 402, height: 874 },
    'mobile-iphone16pro': { width: 402, height: 874 },
    'mobile-iphone16promax': { width: 440, height: 956 },
    // Android Series
    'mobile-galaxys20': { width: 360, height: 800 },
    'mobile-galaxys21': { width: 384, height: 854 },
    'mobile-galaxys22': { width: 360, height: 780 },
    'mobile-galaxys23': { width: 360, height: 780 },
    'mobile-galaxys24': { width: 384, height: 832 },
    'mobile-pixel6': { width: 412, height: 915 },
    'mobile-pixel7': { width: 412, height: 915 },
    'mobile-pixel8': { width: 412, height: 915 },
    'mobile-pixel8pro': { width: 448, height: 992 },
    // iPad Series
    'tablet-ipad-mini': { width: 744, height: 1133 },
    'tablet-ipad': { width: 820, height: 1180 },
    'tablet-ipad-air': { width: 820, height: 1180 },
    'tablet-ipadpro11': { width: 834, height: 1194 },
    'tablet-ipadpro12': { width: 1024, height: 1366 },
    // Android Tablets
    'tablet-galaxy-tab-s8': { width: 753, height: 1205 },
    'tablet-galaxy-tab-s9': { width: 753, height: 1205 },
    // Desktop Sizes
    'desktop-1280': { width: 1280, height: 720 },
    'desktop-1366': { width: 1366, height: 768 },
    'desktop-1440': { width: 1440, height: 900 },
    'desktop-1920': { width: 1920, height: 1080 },
    'desktop-2560': { width: 2560, height: 1440 },
    'desktop-3840': { width: 3840, height: 2160 },
  }
  
  return viewportSizes[size] || { width: 1920, height: 1080 }
}

// Ensure Playwright browsers are installed
async function ensurePlaywrightBrowsers() {
  const homeDir = os.homedir()
  const playwrightPaths = [
    path.join(homeDir, '.cache', 'ms-playwright', 'chromium-1181'),
    path.join(process.cwd(), 'node_modules', 'playwright', '.local-browsers', 'chromium-1181')
  ]
  
  let browserFound = false
  for (const browserPath of playwrightPaths) {
    try {
      await fs.access(browserPath)
      console.log(`Playwright browser found at: ${browserPath}`)
      browserFound = true
      break
    } catch {
      // Continue checking other paths
    }
  }
  
  if (!browserFound) {
    console.log('Installing Playwright browsers...')
    try {
      // Install browsers with environment variable to skip host validation
      execSync('PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright install chromium', {
        stdio: 'inherit',
        env: { ...process.env, PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS: '1' }
      })
      console.log('Playwright browsers installed successfully')
    } catch (error) {
      console.error('Failed to install Playwright browsers:', error)
      // Continue anyway - the browser might still work
    }
  }
}

interface TestConfig {
  baseUrl: string
  timeout: number
  screenshot: 'always' | 'on-failure' | 'never'
  screenshotSize?: string
  browsers: ('chromium' | 'firefox' | 'webkit')[]
  testCaseIds?: string[]
  testSuiteId?: string
  projectId?: string
}

interface TestResult {
  browser: string
  success: boolean
  duration: number
  steps: StepResult[]
  error?: string
  screenshots?: string[]
  testCaseName?: string
  testCase?: any
}

interface StepResult {
  name: string
  success: boolean
  duration: number
  error?: string
  screenshot?: string
  url?: string
}

interface TestStep {
  action: string
  selector?: string
  value?: string
  expectedResult?: string
}

export async function executeTest(testRunId: string, config: TestConfig & { projectId: string }): Promise<TestResult[]> {
  // Ensure browsers are installed before running tests
  await ensurePlaywrightBrowsers()
  
  const results: TestResult[] = []
  
  // Get project with auth settings
  const project = await prisma.project.findUnique({
    where: { id: config.projectId }
  })
  
  if (!project) {
    throw new Error('プロジェクトが見つかりません')
  }
  
  // Get test cases to execute
  let testCases: any[] = []
  
  if (config.testCaseIds && config.testCaseIds.length > 0) {
    testCases = await prisma.testCase.findMany({
      where: { id: { in: config.testCaseIds } }
    })
  } else if (config.testSuiteId) {
    testCases = await prisma.testCase.findMany({
      where: { suiteId: config.testSuiteId }
    })
  }
  
  // If no test cases, run a simple navigation test
  if (testCases.length === 0) {
    console.log('No test cases found, running simple navigation test')
    const result = await runSimpleTest(testRunId, 'chromium', config)
    results.push(result)
    return results
  }
  
  // Run each test case
  for (const testCase of testCases) {
    console.log(`Running test case: ${testCase.name}`)
    const result = await runTestCase(testRunId, 'chromium', config, testCase, project)
    results.push(result)
  }
  
  return results
}

async function runSimpleTest(
  testRunId: string,
  browserType: string,
  config: TestConfig
): Promise<TestResult> {
  let browser: Browser | null = null
  let page: Page | null = null
  const startTime = Date.now()
  const screenshots: string[] = []
  const steps: StepResult[] = []
  
  try {
    // Try to launch browser with error handling
    try {
      browser = await chromium.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      })
    } catch (launchError: any) {
      console.error('Failed to launch browser:', launchError.message)
      throw new Error(`ブラウザの起動に失敗しました: ${launchError.message}`)
    }
    
    const viewport = parseScreenshotSize(config.screenshotSize)
    page = await browser.newPage({ viewport })
    
    // Navigate to URL
    const navigateStep = await executeStep(async () => {
      await page!.goto(config.baseUrl)
    }, 'Navigate to URL')
    steps.push(navigateStep)
    
    if (config.screenshot === 'always') {
      const screenshot = await takeScreenshot(page, testRunId, browserType, 'navigate')
      if (screenshot) screenshots.push(screenshot)
    }
    
    return {
      browser: browserType,
      success: steps.every(s => s.success),
      duration: Date.now() - startTime,
      steps,
      screenshots
    }
  } catch (error) {
    return {
      browser: browserType,
      success: false,
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : String(error),
      screenshots
    }
  } finally {
    if (browser) await browser.close()
  }
}

async function runTestCase(
  testRunId: string,
  browserType: string,
  config: TestConfig,
  testCase: any,
  project: any
): Promise<TestResult> {
  let browser: Browser | null = null
  let context: BrowserContext | null = null
  let page: Page | null = null
  const startTime = Date.now()
  const screenshots: string[] = []
  const steps: StepResult[] = []
  
  try {
    console.log(`Launching browser for test case: ${testCase.name}`)
    console.log(`Project auth settings: requiresAuth=${project.requiresAuth}, hasEmail=${!!project.authEmail}, hasPassword=${!!project.authPassword}, loginUrl=${project.loginUrl}`)
    
    // Try to launch browser with different configurations
    try {
      browser = await chromium.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      })
    } catch (launchError: any) {
      console.error('Failed to launch browser with default settings:', launchError.message)
      
      // Try alternative launch without sandbox
      try {
        browser = await chromium.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          ignoreDefaultArgs: ['--disable-extensions']
        })
      } catch (altError: any) {
        console.error('Failed to launch browser with alternative settings:', altError.message)
        throw new Error(`ブラウザの起動に失敗しました。Playwrightのインストールを確認してください: ${altError.message}`)
      }
    }
    
    const viewport = parseScreenshotSize(config.screenshotSize)
    context = await browser.newContext({
      locale: 'ja-JP',
      viewport
    })
    
    page = await context.newPage()
    page.setDefaultTimeout(config.timeout || 30000)
    
    // Handle authentication if required
    if (project.requiresAuth && project.authEmail && project.authPassword) {
      console.log('Project requires authentication, attempting login...')
      
      try {
        // Navigate to login page
        const loginUrl = project.loginUrl || `${project.baseUrl}/login`
        console.log(`Navigating to login page: ${loginUrl}`)
        await page.goto(loginUrl)
        
        // Wait for login form to be visible
        await page.waitForLoadState('networkidle', { timeout: 10000 })
        
        // Try common login selectors
        const emailSelectors = [
          'input[type="email"]',
          'input[name="email"]',
          'input[name="username"]',
          'input[id="email"]',
          'input[id="username"]',
          'input[placeholder*="email" i]',
          'input[placeholder*="メール" i]'
        ]
        
        const passwordSelectors = [
          'input[type="password"]',
          'input[name="password"]',
          'input[id="password"]',
          'input[placeholder*="password" i]',
          'input[placeholder*="パスワード" i]'
        ]
        
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("ログイン")',
          'button:has-text("Login")',
          'button:has-text("Sign in")',
          'input[type="submit"]'
        ]
        
        // Find and fill email field
        let emailFilled = false
        for (const selector of emailSelectors) {
          try {
            const element = await page.$(selector)
            if (element) {
              await element.fill(project.authEmail)
              console.log(`Filled email field with selector: ${selector}`)
              emailFilled = true
              break
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (!emailFilled) {
          console.warn('Could not find email/username field')
        }
        
        // Find and fill password field
        let passwordFilled = false
        for (const selector of passwordSelectors) {
          try {
            const element = await page.$(selector)
            if (element) {
              await element.fill(project.authPassword)
              console.log(`Filled password field with selector: ${selector}`)
              passwordFilled = true
              break
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (!passwordFilled) {
          console.warn('Could not find password field')
        }
        
        // Find and click submit button
        if (emailFilled && passwordFilled) {
          let submitted = false
          for (const selector of submitSelectors) {
            try {
              const element = await page.$(selector)
              if (element) {
                await element.click()
                console.log(`Clicked submit button with selector: ${selector}`)
                submitted = true
                break
              }
            } catch (e) {
              // Continue to next selector
            }
          }
          
          if (submitted) {
            // Wait for navigation after login
            await page.waitForLoadState('networkidle', { timeout: 10000 })
            console.log('Login completed successfully')
          } else {
            console.warn('Could not find submit button')
          }
        }
      } catch (error) {
        console.error('Login failed:', error)
        // Continue with test execution even if login fails
      }
    }
    
    // Parse test steps
    const testSteps: TestStep[] = JSON.parse(testCase.steps || '[]')
    
    // Execute each step
    for (let i = 0; i < testSteps.length; i++) {
      const step = testSteps[i]
      const stepName = `Step ${i + 1}: ${step.action}${step.selector ? ` on ${step.selector}` : ''}${step.value ? ` with "${step.value}"` : ''}`
      
      console.log(`Executing: ${stepName}`)
      
      const stepResult = await executeTestStep(page, step, stepName, project)
      
      // Capture current URL after step execution
      try {
        stepResult.url = page.url()
        console.log(`Current URL after step ${i + 1}: ${stepResult.url}`)
      } catch (e) {
        console.error('Failed to get current URL:', e)
      }
      
      steps.push(stepResult)
      
      // Wait a bit for any animations or dynamic content to settle
      await page.waitForTimeout(500)
      
      // Take screenshot if needed
      if (config.screenshot === 'always' || (config.screenshot === 'on-failure' && !stepResult.success)) {
        try {
          // Wait for page to be stable before screenshot
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
            console.log('Network idle timeout, continuing with screenshot')
          })
          
          const screenshot = await takeScreenshot(page, testRunId, browserType, `step_${i + 1}_${step.action}`)
          if (screenshot) {
            screenshots.push(screenshot)
            stepResult.screenshot = screenshot
          }
        } catch (screenshotError) {
          console.error(`Failed to take screenshot for step ${i + 1}:`, screenshotError)
          // Mark step as failed if screenshot was required but failed
          if (config.screenshot === 'always') {
            stepResult.success = false
            stepResult.error = (stepResult.error ? stepResult.error + ' | ' : '') + 'スクリーンショットの取得に失敗しました'
          }
        }
      }
      
      // Stop if step failed
      if (!stepResult.success) {
        console.error(`Step failed: ${stepName}`)
        break
      }
    }
    
    // Take final screenshot after all steps are completed
    if (config.screenshot === 'always' && steps.length > 0) {
      try {
        console.log('Taking final screenshot after test completion')
        await page.waitForTimeout(1000) // Wait for any final animations
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
          console.log('Network idle timeout for final screenshot, continuing')
        })
        
        const finalScreenshot = await takeScreenshot(page, testRunId, browserType, 'final_result')
        if (finalScreenshot) {
          screenshots.push(finalScreenshot)
          console.log('Final screenshot captured successfully')
        }
      } catch (error) {
        console.error('Failed to take final screenshot:', error)
      }
    }
    
    const success = steps.every(step => step.success)
    
    return {
      browser: browserType,
      success,
      duration: Date.now() - startTime,
      steps,
      screenshots,
      testCaseName: testCase.name,
      testCase: {
        id: testCase.id,
        name: testCase.name,
        description: testCase.description,
        steps: testCase.steps
      }
    }
  } catch (error) {
    console.error(`Error in test case ${testCase.name}:`, error)
    
    if (page && config.screenshot !== 'never') {
      try {
        const errorScreenshot = await takeScreenshot(page, testRunId, browserType, 'error')
        if (errorScreenshot) screenshots.push(errorScreenshot)
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError)
      }
    }
    
    return {
      browser: browserType,
      success: false,
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : String(error),
      screenshots,
      testCaseName: testCase.name,
      testCase: {
        id: testCase.id,
        name: testCase.name,
        description: testCase.description,
        steps: testCase.steps
      }
    }
  } finally {
    if (browser) await browser.close()
  }
}

async function executeTestStep(
  page: Page,
  step: TestStep,
  stepName: string,
  project: any
): Promise<StepResult> {
  const startTime = Date.now()
  
  try {
    switch (step.action.toLowerCase()) {
      case 'navigate':
      case 'goto':
        let url = step.value || project.baseUrl
        // Handle relative URLs
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          // If it's a path starting with /, append to baseUrl
          if (url.startsWith('/')) {
            url = `${project.baseUrl}${url}`
          } else {
            // Otherwise treat as full URL or path
            url = url.includes('://') ? url : `${project.baseUrl}/${url}`
          }
        }
        console.log(`Navigating to: ${url}`)
        await page.goto(url, { waitUntil: 'networkidle' })
        break
        
      case 'click':
        if (step.selector) {
          // Handle multiple selectors separated by comma
          const selectors = step.selector.split(',').map(s => s.trim());
          let clicked = false;
          
          for (const selector of selectors) {
            try {
              // Check if selector exists and is visible
              const element = await page.$(selector);
              if (element) {
                const isVisible = await element.isVisible();
                if (isVisible) {
                  await element.click();
                  console.log(`Clicked element with selector: ${selector}`);
                  clicked = true;
                  break;
                }
              }
            } catch (e) {
              // Try next selector
              console.log(`Selector failed: ${selector}, trying next...`);
            }
          }
          
          if (!clicked) {
            throw new Error(`要素が見つかりません: ${step.selector}`);
          }
          
          // Wait for navigation or page changes after click
          await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
        }
        break
        
      case 'fill':
      case 'type':
      case 'input':
        if (step.selector && step.value) {
          // Handle multiple selectors separated by comma
          const selectors = step.selector.split(',').map(s => s.trim());
          let filled = false;
          
          for (const selector of selectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                const isVisible = await element.isVisible();
                if (isVisible) {
                  await element.fill(step.value);
                  console.log(`Filled element with selector: ${selector}`);
                  filled = true;
                  break;
                }
              }
            } catch (e) {
              console.log(`Selector failed: ${selector}, trying next...`);
            }
          }
          
          if (!filled) {
            throw new Error(`入力フィールドが見つかりません: ${step.selector}`);
          }
        }
        break
        
      case 'select':
        if (step.selector && step.value) {
          // Handle multiple selectors separated by comma
          const selectors = step.selector.split(',').map(s => s.trim());
          let selected = false;
          
          for (const selector of selectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                const isVisible = await element.isVisible();
                if (isVisible) {
                  await page.selectOption(selector, step.value);
                  console.log(`Selected option in element with selector: ${selector}`);
                  selected = true;
                  break;
                }
              }
            } catch (e) {
              console.log(`Selector failed: ${selector}, trying next...`);
            }
          }
          
          if (!selected) {
            throw new Error(`選択フィールドが見つかりません: ${step.selector}`);
          }
        }
        break
        
      case 'wait':
        if (step.value) {
          const waitTime = parseInt(step.value)
          if (!isNaN(waitTime)) {
            await page.waitForTimeout(waitTime)
          }
        }
        break
        
      case 'waitfor':
      case 'wait_for_selector':
        if (step.selector) {
          // Handle multiple selectors separated by comma
          const selectors = step.selector.split(',').map(s => s.trim());
          let found = false;
          
          for (const selector of selectors) {
            try {
              await page.waitForSelector(selector, { state: 'visible', timeout: 2000 });
              console.log(`Found element with selector: ${selector}`);
              found = true;
              break;
            } catch (e) {
              console.log(`Selector not found: ${selector}, trying next...`);
            }
          }
          
          if (!found) {
            throw new Error(`要素が見つかりません: ${step.selector}`);
          }
        }
        break
        
      case 'screenshot':
        // Screenshot will be taken after step execution
        break
        
      case 'assert':
      case 'verify':
        if (step.selector) {
          // Handle multiple selectors separated by comma
          const selectors = step.selector.split(',').map(s => s.trim());
          let verified = false;
          let lastError = '';
          
          for (const selector of selectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                if (step.value) {
                  const text = await element.textContent();
                  if (text?.includes(step.value)) {
                    console.log(`Verified element with selector: ${selector}`);
                    verified = true;
                    break;
                  } else {
                    lastError = `期待値と一致しません。期待値: "${step.value}", 実際: "${text}"`;
                  }
                } else {
                  // Just verify element exists
                  console.log(`Verified element exists with selector: ${selector}`);
                  verified = true;
                  break;
                }
              }
            } catch (e) {
              console.log(`Selector failed: ${selector}, trying next...`);
            }
          }
          
          if (!verified) {
            throw new Error(lastError || `要素が見つかりません: ${step.selector}`);
          }
        }
        break
        
      case 'press':
        if (step.value) {
          await page.keyboard.press(step.value)
        }
        break
        
      default:
        console.warn(`Unknown action: ${step.action}`)
    }
    
    return {
      name: stepName,
      success: true,
      duration: Date.now() - startTime
    }
  } catch (error) {
    console.error(`Step failed: ${stepName}`, error)
    return {
      name: stepName,
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function executeStep(
  action: () => Promise<void>,
  name: string
): Promise<StepResult> {
  const startTime = Date.now()
  try {
    await action()
    return {
      name,
      success: true,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      name,
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function takeScreenshot(
  page: Page,
  testRunId: string,
  browser: string,
  stepName: string
): Promise<string | null> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${testRunId}_${browser}_${stepName}_${timestamp}.png`
    const filepath = path.join(process.cwd(), 'public', 'screenshots', filename)
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true })
    
    // Take screenshot with timeout
    await page.screenshot({ 
      path: filepath, 
      fullPage: true,
      timeout: 10000 // 10 second timeout
    })
    
    // Save to database
    await prisma.screenshot.create({
      data: {
        testRunId,
        browser,
        pageName: stepName,
        url: page.url(),
        filePath: `/screenshots/${filename}`,
      },
    })
    
    console.log(`Screenshot saved: ${filename}`)
    return `/screenshots/${filename}`
  } catch (error) {
    console.error('Failed to take screenshot:', error)
    // Throw error instead of returning null so caller can handle it
    throw new Error(`スクリーンショットの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
  }
}