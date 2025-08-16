// Enhanced error handling for security and user experience

export enum ErrorType {
  SECURITY = 'SECURITY',
  VALIDATION = 'VALIDATION', 
  NETWORK = 'NETWORK',
  BLOCKCHAIN = 'BLOCKCHAIN',
  RATE_LIMIT = 'RATE_LIMIT',
  STORAGE = 'STORAGE',
  USER_INPUT = 'USER_INPUT',
  SYSTEM = 'SYSTEM'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface DriftBottleError {
  type: ErrorType
  severity: ErrorSeverity
  code: string
  message: string
  userMessage: string
  originalError?: Error
  context?: Record<string, any>
  timestamp: number
  shouldLog: boolean
  shouldReport: boolean
}

/**
 * Create a structured error for the drift bottle application
 */
export function createDriftBottleError(
  type: ErrorType,
  severity: ErrorSeverity,
  code: string,
  message: string,
  userMessage: string,
  originalError?: Error,
  context?: Record<string, any>
): DriftBottleError {
  return {
    type,
    severity,
    code,
    message,
    userMessage,
    originalError,
    context: context || {},
    timestamp: Date.now(),
    shouldLog: severity !== ErrorSeverity.LOW,
    shouldReport: severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL
  }
}

/**
 * Security-specific error creator
 */
export function createSecurityError(
  code: string,
  message: string,
  userMessage: string = '检测到安全问题，操作已被阻止',
  originalError?: Error,
  context?: Record<string, any>
): DriftBottleError {
  return createDriftBottleError(
    ErrorType.SECURITY,
    ErrorSeverity.HIGH,
    code,
    message,
    userMessage,
    originalError,
    context
  )
}

/**
 * Validation error creator
 */
export function createValidationError(
  code: string,
  message: string,
  userMessage: string,
  originalError?: Error,
  context?: Record<string, any>
): DriftBottleError {
  return createDriftBottleError(
    ErrorType.VALIDATION,
    ErrorSeverity.MEDIUM,
    code,
    message,
    userMessage,
    originalError,
    context
  )
}

/**
 * Network error creator
 */
export function createNetworkError(
  code: string,
  message: string,
  userMessage: string = '网络连接出现问题，请稍后重试',
  originalError?: Error,
  context?: Record<string, any>
): DriftBottleError {
  return createDriftBottleError(
    ErrorType.NETWORK,
    ErrorSeverity.MEDIUM,
    code,
    message,
    userMessage,
    originalError,
    context
  )
}

/**
 * Blockchain error creator
 */
export function createBlockchainError(
  code: string,
  message: string,
  userMessage: string,
  originalError?: Error,
  context?: Record<string, any>
): DriftBottleError {
  return createDriftBottleError(
    ErrorType.BLOCKCHAIN,
    ErrorSeverity.MEDIUM,
    code,
    message,
    userMessage,
    originalError,
    context
  )
}

/**
 * Rate limiting error creator
 */
export function createRateLimitError(
  code: string,
  message: string,
  userMessage: string,
  originalError?: Error,
  context?: Record<string, any>
): DriftBottleError {
  return createDriftBottleError(
    ErrorType.RATE_LIMIT,
    ErrorSeverity.LOW,
    code,
    message,
    userMessage,
    originalError,
    context
  )
}

/**
 * Enhanced error logger that preserves security information
 */
export class ErrorLogger {
  private static instance: ErrorLogger
  private errorHistory: DriftBottleError[] = []
  private maxHistorySize = 100

  private constructor() {}

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  /**
   * Log error with proper security handling
   */
  public logError(error: DriftBottleError): void {
    // Add to history
    this.errorHistory.push(error)
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }

    if (error.shouldLog) {
      // Security errors get special treatment
      if (error.type === ErrorType.SECURITY) {
        console.warn(`🚨 SECURITY ERROR [${error.code}]:`, error.message)
        if (error.context) {
          console.warn('Security context:', error.context)
        }
        if (error.originalError) {
          console.warn('Original error:', error.originalError)
        }
      } else {
        console.error(`❌ ERROR [${error.type}/${error.code}]:`, error.message)
        if (error.originalError) {
          console.error('Original error:', error.originalError)
        }
      }
    }

    // For high-severity errors, also log structured data for debugging
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      console.error('Error details:', {
        type: error.type,
        severity: error.severity,
        code: error.code,
        timestamp: new Date(error.timestamp).toISOString(),
        context: error.context
      })
    }

    // In production, you might want to send high-severity errors to an error reporting service
    if (error.shouldReport && process.env.NODE_ENV === 'production') {
      this.reportError(error)
    }
  }

  /**
   * Report critical errors (placeholder for error reporting service)
   */
  private reportError(error: DriftBottleError): void {
    // In a real application, this would send to an error reporting service
    // like Sentry, LogRocket, etc.
    console.warn('Would report error to monitoring service:', {
      type: error.type,
      severity: error.severity,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp
    })
  }

  /**
   * Get recent errors for debugging
   */
  public getRecentErrors(count: number = 10): DriftBottleError[] {
    return this.errorHistory.slice(-count)
  }

  /**
   * Get security-related errors
   */
  public getSecurityErrors(): DriftBottleError[] {
    return this.errorHistory.filter(error => error.type === ErrorType.SECURITY)
  }

  /**
   * Clear error history
   */
  public clearHistory(): void {
    this.errorHistory = []
  }
}

export const errorLogger = ErrorLogger.getInstance()

/**
 * Safe error handler that preserves security context
 */
export function handleError(error: unknown, context?: Record<string, any>): DriftBottleError {
  let driftBottleError: DriftBottleError

  if (error instanceof Error) {
    // Analyze error to determine type and severity
    if (error.message.includes('unauthorized') || 
        error.message.includes('forbidden') ||
        error.message.includes('permission') ||
        error.message.includes('security')) {
      driftBottleError = createSecurityError(
        'UNKNOWN_SECURITY_ERROR',
        error.message,
        '检测到安全问题，操作已被阻止',
        error,
        context
      )
    } else if (error.message.includes('network') || 
               error.message.includes('timeout') ||
               error.message.includes('connection')) {
      driftBottleError = createNetworkError(
        'NETWORK_ERROR',
        error.message,
        '网络连接出现问题，请稍后重试',
        error,
        context
      )
    } else if (error.message.includes('rate limit') || 
               error.message.includes('too many requests')) {
      driftBottleError = createRateLimitError(
        'RATE_LIMIT_EXCEEDED',
        error.message,
        '操作过于频繁，请稍后再试',
        error,
        context
      )
    } else {
      driftBottleError = createDriftBottleError(
        ErrorType.SYSTEM,
        ErrorSeverity.MEDIUM,
        'UNKNOWN_ERROR',
        error.message,
        '发生未知错误，请稍后重试',
        error,
        context
      )
    }
  } else {
    driftBottleError = createDriftBottleError(
      ErrorType.SYSTEM,
      ErrorSeverity.LOW,
      'NON_ERROR_THROWN',
      String(error),
      '发生未知错误，请稍后重试',
      undefined,
      { thrownValue: error, ...context }
    )
  }

  errorLogger.logError(driftBottleError)
  return driftBottleError
}

/**
 * Wrapper for async functions with proper error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<{ success: true; data: T } | { success: false; error: DriftBottleError }> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    const driftBottleError = handleError(error, context)
    return { success: false, error: driftBottleError }
  }
}

/**
 * Error boundary utility functions for React components
 * Note: For actual React error boundaries, implement in component files as .tsx
 */
export function createErrorBoundaryContext(error: unknown): DriftBottleError {
  return handleError(error, { context: 'ErrorBoundary' })
}