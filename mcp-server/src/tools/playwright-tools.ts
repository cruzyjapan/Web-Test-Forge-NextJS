import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright'

let browser: Browser | null = null
let context: BrowserContext | null = null
let page: Page | null = null

export async function navigateToUrl(url: string, browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium') {
  try {
    if (browser) {
      await browser.close()
    }

    switch (browserType) {
      case 'firefox':
        browser = await firefox.launch({ headless: false })
        break
      case 'webkit':
        browser = await webkit.launch({ headless: false })
        break
      default:
        browser = await chromium.launch({ headless: false })
    }

    context = await browser.newContext()
    page = await context.newPage()
    
    await page.goto(url)
    
    return {
      success: true,
      url: page.url(),
      title: await page.title()
    }
  } catch (error) {
    throw new Error(`Failed to navigate to URL: ${error}`)
  }
}

export async function takeScreenshot(path: string, fullPage: boolean = false) {
  if (!page) {
    throw new Error('No page is currently open. Please navigate to a URL first.')
  }

  try {
    await page.screenshot({ path, fullPage })
    return {
      success: true,
      path,
      message: `Screenshot saved to ${path}`
    }
  } catch (error) {
    throw new Error(`Failed to take screenshot: ${error}`)
  }
}

export async function clickElement(selector: string) {
  if (!page) {
    throw new Error('No page is currently open. Please navigate to a URL first.')
  }

  try {
    await page.click(selector)
    return {
      success: true,
      message: `Clicked element: ${selector}`
    }
  } catch (error) {
    throw new Error(`Failed to click element: ${error}`)
  }
}

export async function fillInput(selector: string, text: string) {
  if (!page) {
    throw new Error('No page is currently open. Please navigate to a URL first.')
  }

  try {
    await page.fill(selector, text)
    return {
      success: true,
      message: `Filled input ${selector} with text`
    }
  } catch (error) {
    throw new Error(`Failed to fill input: ${error}`)
  }
}

export async function getText(selector: string) {
  if (!page) {
    throw new Error('No page is currently open. Please navigate to a URL first.')
  }

  try {
    const text = await page.textContent(selector)
    return {
      success: true,
      text,
      selector
    }
  } catch (error) {
    throw new Error(`Failed to get text: ${error}`)
  }
}

export async function waitForSelector(selector: string, timeout: number = 30000) {
  if (!page) {
    throw new Error('No page is currently open. Please navigate to a URL first.')
  }

  try {
    await page.waitForSelector(selector, { timeout })
    return {
      success: true,
      message: `Element ${selector} is visible`
    }
  } catch (error) {
    throw new Error(`Failed to wait for selector: ${error}`)
  }
}

export async function executeScript(script: string) {
  if (!page) {
    throw new Error('No page is currently open. Please navigate to a URL first.')
  }

  try {
    const result = await page.evaluate(script)
    return {
      success: true,
      result
    }
  } catch (error) {
    throw new Error(`Failed to execute script: ${error}`)
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
    context = null
    page = null
  }
}

process.on('SIGINT', async () => {
  await closeBrowser()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeBrowser()
  process.exit(0)
})