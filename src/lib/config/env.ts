/**
 * Environment configuration utility
 */

export type Environment = 'development' | 'production' | 'test'

interface EnvConfig {
  // Application
  env: Environment
  appUrl: string
  isDevelopment: boolean
  isProduction: boolean
  isTest: boolean
  
  // Database
  databaseUrl: string
  
  // Authentication
  authSecret: string
  secureCookies: boolean
  
  // Features
  debug: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  enableCache: boolean
  
  // Playwright
  playwrightBrowsersPath: string
  headlessBrowser: boolean
  
  // External Services
  openAiApiKey?: string
  redisUrl?: string
}

class Config {
  private static instance: Config
  private config: EnvConfig

  private constructor() {
    const env = (process.env.NODE_ENV || 'development') as Environment
    
    this.config = {
      // Application
      env,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      isDevelopment: env === 'development',
      isProduction: env === 'production',
      isTest: env === 'test',
      
      // Database
      databaseUrl: process.env.DATABASE_URL || 'file:./prisma/dev.db',
      
      // Authentication
      authSecret: process.env.AUTH_SECRET || 'dev-secret-key-for-development-min-32-chars',
      secureCookies: process.env.SECURE_COOKIES === 'true',
      
      // Features
      debug: process.env.DEBUG === 'true',
      logLevel: (process.env.LOG_LEVEL || 'info') as EnvConfig['logLevel'],
      enableCache: process.env.NEXT_PUBLIC_ENABLE_CACHE === 'true',
      
      // Playwright
      playwrightBrowsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || '0',
      headlessBrowser: process.env.HEADLESS_BROWSER !== 'false',
      
      // External Services
      openAiApiKey: process.env.OPENAI_API_KEY,
      redisUrl: process.env.REDIS_URL,
    }
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config()
    }
    return Config.instance
  }

  public get(): EnvConfig {
    return this.config
  }

  /**
   * Get database file path based on environment
   */
  public getDatabasePath(): string {
    switch (this.config.env) {
      case 'production':
        return './prisma/prod.db'
      case 'test':
        return './prisma/test.db'
      default:
        return './prisma/dev.db'
    }
  }

  /**
   * Get cookie options based on environment
   */
  public getCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.secureCookies || this.config.isProduction,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    }
  }

  /**
   * Get log configuration
   */
  public getLogConfig() {
    return {
      enabled: this.config.debug || !this.config.isProduction,
      level: this.config.logLevel,
      prettyPrint: this.config.isDevelopment,
    }
  }

  /**
   * Validate required environment variables
   */
  public validate(): void {
    const required: (keyof EnvConfig)[] = ['databaseUrl', 'authSecret']
    
    for (const key of required) {
      if (!this.config[key]) {
        throw new Error(`Missing required environment variable: ${key}`)
      }
    }

    // Validate AUTH_SECRET length
    if (this.config.authSecret.length < 32) {
      console.warn('AUTH_SECRET should be at least 32 characters long')
    }

    // Production specific validations
    if (this.config.isProduction) {
      if (this.config.authSecret === 'dev-secret-key-for-development-min-32-chars') {
        throw new Error('Please change AUTH_SECRET for production environment')
      }
      
      if (!this.config.secureCookies) {
        console.warn('SECURE_COOKIES should be enabled in production')
      }
    }
  }
}

// Export singleton instance
export const config = Config.getInstance()
export const env = config.get()

// Validate on startup
if (typeof window === 'undefined') {
  config.validate()
}