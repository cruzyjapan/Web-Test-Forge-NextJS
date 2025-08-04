import { env } from '@/lib/config/env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
  context?: string
}

class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private isDevelopment: boolean
  private isProduction: boolean

  private constructor() {
    this.logLevel = env.logLevel
    this.isDevelopment = env.isDevelopment
    this.isProduction = env.isProduction
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentIndex = levels.indexOf(this.logLevel)
    const messageIndex = levels.indexOf(level)
    return messageIndex >= currentIndex
  }

  private formatMessage(entry: LogEntry): string {
    const prefix = entry.context ? `[${entry.context}]` : ''
    return `${entry.timestamp} [${entry.level.toUpperCase()}]${prefix} ${entry.message}`
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      context
    }

    const formattedMessage = this.formatMessage(entry)

    // In development, use colored console output
    if (this.isDevelopment) {
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
      }
      const reset = '\x1b[0m'
      const color = colors[level]

      switch (level) {
        case 'debug':
          console.debug(`${color}${formattedMessage}${reset}`, data || '')
          break
        case 'info':
          console.info(`${color}${formattedMessage}${reset}`, data || '')
          break
        case 'warn':
          console.warn(`${color}${formattedMessage}${reset}`, data || '')
          break
        case 'error':
          console.error(`${color}${formattedMessage}${reset}`, data || '')
          break
      }
    } else {
      // In production, use structured logging
      const logData = {
        ...entry,
        environment: env.env,
        appUrl: env.appUrl
      }

      switch (level) {
        case 'error':
          console.error(JSON.stringify(logData))
          break
        case 'warn':
          console.warn(JSON.stringify(logData))
          break
        default:
          console.log(JSON.stringify(logData))
      }
    }

    // In production, you might want to send logs to external service
    if (this.isProduction && level === 'error') {
      // TODO: Send to error tracking service (e.g., Sentry)
    }
  }

  public debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context)
  }

  public info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context)
  }

  public warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context)
  }

  public error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context)
  }

  // Performance logging
  public time(label: string) {
    if (this.isDevelopment) {
      console.time(label)
    }
  }

  public timeEnd(label: string) {
    if (this.isDevelopment) {
      console.timeEnd(label)
    }
  }

  // Database query logging
  public query(sql: string, params?: any) {
    if (this.shouldLog('debug')) {
      this.debug('Database Query', { sql, params }, 'DB')
    }
  }

  // API request/response logging
  public request(method: string, url: string, data?: any) {
    if (this.shouldLog('debug')) {
      this.debug(`${method} ${url}`, data, 'API')
    }
  }

  public response(status: number, url: string, data?: any) {
    const level = status >= 400 ? 'error' : 'debug'
    if (this.shouldLog(level)) {
      this.log(level, `Response ${status} from ${url}`, data, 'API')
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export convenience functions
export const log = {
  debug: (message: string, data?: any, context?: string) => logger.debug(message, data, context),
  info: (message: string, data?: any, context?: string) => logger.info(message, data, context),
  warn: (message: string, data?: any, context?: string) => logger.warn(message, data, context),
  error: (message: string, data?: any, context?: string) => logger.error(message, data, context),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  query: (sql: string, params?: any) => logger.query(sql, params),
  request: (method: string, url: string, data?: any) => logger.request(method, url, data),
  response: (status: number, url: string, data?: any) => logger.response(status, url, data)
}