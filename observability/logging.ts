type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

class Logger {
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    }

    const logLine = JSON.stringify(entry)
    console.log(logLine)
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.log('debug', message, metadata)
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata)
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, metadata)
  }

  error(message: string, metadata?: Record<string, unknown>) {
    this.log('error', message, metadata)
  }
}

export const logger = new Logger()
