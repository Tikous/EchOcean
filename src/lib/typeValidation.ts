// Type safety validation utilities for blockchain data

/**
 * Blockchain data type definitions with validation
 */
export interface ValidatedBottleData {
  id: bigint
  content: string
  timestamp: bigint
  sender: string
  isActive: boolean
  replyCount: bigint
}

export interface ValidatedReplyData {
  id: bigint
  bottleId: bigint
  content: string
  timestamp: bigint
  replier: string
}

/**
 * Type guard functions for runtime validation
 */
export function isValidAddress(value: unknown): value is string {
  return typeof value === 'string' && 
         value.length === 42 && 
         value.startsWith('0x') &&
         /^0x[a-fA-F0-9]{40}$/.test(value)
}

export function isValidBigInt(value: unknown): value is bigint {
  if (typeof value === 'bigint') return true
  if (typeof value === 'string') {
    try {
      BigInt(value)
      return true
    } catch {
      return false
    }
  }
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return true
  }
  return false
}

export function isValidTimestamp(value: unknown): value is bigint {
  if (!isValidBigInt(value)) return false
  
  const timestamp = typeof value === 'bigint' ? value : BigInt(value as string | number)
  const now = BigInt(Date.now())
  const oneYearAgo = now - BigInt(365 * 24 * 60 * 60 * 1000)
  const oneYearFromNow = now + BigInt(365 * 24 * 60 * 60 * 1000)
  
  // Timestamp should be reasonable (within a year of now, in milliseconds or seconds)
  return (timestamp >= oneYearAgo && timestamp <= oneYearFromNow) ||
         (timestamp >= oneYearAgo / BigInt(1000) && timestamp <= oneYearFromNow / BigInt(1000))
}

export function isValidContent(value: unknown): value is string {
  return typeof value === 'string' && 
         value.length > 0 && 
         value.length <= 1000 && // Reasonable content length
         !/[<>\"'&]/.test(value) // Basic XSS prevention
}

export function isValidBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Comprehensive validation for bottle data from blockchain
 */
export function validateBottleData(data: unknown): ValidatedBottleData | null {
  if (!data || typeof data !== 'object') {
    console.warn('Invalid bottle data: not an object')
    return null
  }

  const obj = data as any

  // Validate id
  if (!isValidBigInt(obj.id) && !isValidBigInt(obj[0])) {
    console.warn('Invalid bottle data: missing or invalid id')
    return null
  }

  // Validate content
  const content = obj.content || obj[1]
  if (!isValidContent(content)) {
    console.warn('Invalid bottle data: missing or invalid content')
    return null
  }

  // Validate timestamp
  const timestamp = obj.timestamp || obj[2]
  if (!isValidTimestamp(timestamp)) {
    console.warn('Invalid bottle data: missing or invalid timestamp')
    return null
  }

  // Validate sender
  const sender = obj.sender || obj[3]
  if (!isValidAddress(sender)) {
    console.warn('Invalid bottle data: missing or invalid sender address')
    return null
  }

  // Validate isActive (may be undefined, default to true)
  const isActive = obj.isActive !== undefined ? obj.isActive : (obj[4] !== undefined ? obj[4] : true)
  if (!isValidBoolean(isActive)) {
    console.warn('Invalid bottle data: invalid isActive field')
    return null
  }

  // Validate replyCount (may be undefined, default to 0)
  const replyCount = obj.replyCount !== undefined ? obj.replyCount : (obj[5] !== undefined ? obj[5] : 0)
  if (!isValidBigInt(replyCount)) {
    console.warn('Invalid bottle data: invalid replyCount')
    return null
  }

  return {
    id: typeof obj.id === 'bigint' ? obj.id : (typeof obj[0] === 'bigint' ? obj[0] : BigInt(obj.id || obj[0])),
    content: content as string,
    timestamp: typeof timestamp === 'bigint' ? timestamp : BigInt(timestamp as string | number),
    sender: sender as string,
    isActive: isActive as boolean,
    replyCount: typeof replyCount === 'bigint' ? replyCount : BigInt(replyCount as string | number)
  }
}

/**
 * Comprehensive validation for reply data from blockchain
 */
export function validateReplyData(data: unknown): ValidatedReplyData | null {
  if (!data || typeof data !== 'object') {
    console.warn('Invalid reply data: not an object')
    return null
  }

  const obj = data as any

  // Validate id
  if (!isValidBigInt(obj.id) && !isValidBigInt(obj[0])) {
    console.warn('Invalid reply data: missing or invalid id')
    return null
  }

  // Validate bottleId
  const bottleId = obj.bottleId || obj[1]
  if (!isValidBigInt(bottleId)) {
    console.warn('Invalid reply data: missing or invalid bottleId')
    return null
  }

  // Validate content
  const content = obj.content || obj[2]
  if (!isValidContent(content)) {
    console.warn('Invalid reply data: missing or invalid content')
    return null
  }

  // Validate timestamp
  const timestamp = obj.timestamp || obj[3]
  if (!isValidTimestamp(timestamp)) {
    console.warn('Invalid reply data: missing or invalid timestamp')
    return null
  }

  // Validate replier
  const replier = obj.replier || obj[4]
  if (!isValidAddress(replier)) {
    console.warn('Invalid reply data: missing or invalid replier address')
    return null
  }

  return {
    id: typeof obj.id === 'bigint' ? obj.id : (typeof obj[0] === 'bigint' ? obj[0] : BigInt(obj.id || obj[0])),
    bottleId: typeof bottleId === 'bigint' ? bottleId : BigInt(bottleId as string | number),
    content: content as string,
    timestamp: typeof timestamp === 'bigint' ? timestamp : BigInt(timestamp as string | number),
    replier: replier as string
  }
}

/**
 * Validate and convert blockchain data array to validated objects
 */
export function validateBottleDataArray(data: unknown[]): ValidatedBottleData[] {
  if (!Array.isArray(data)) {
    console.warn('Expected array for bottle data validation')
    return []
  }

  const validatedBottles: ValidatedBottleData[] = []
  
  for (let i = 0; i < data.length; i++) {
    const validated = validateBottleData(data[i])
    if (validated) {
      validatedBottles.push(validated)
    } else {
      console.warn(`Skipping invalid bottle data at index ${i}`)
    }
  }

  return validatedBottles
}

/**
 * Validate and convert blockchain data array to validated reply objects
 */
export function validateReplyDataArray(data: unknown[]): ValidatedReplyData[] {
  if (!Array.isArray(data)) {
    console.warn('Expected array for reply data validation')
    return []
  }

  const validatedReplies: ValidatedReplyData[] = []
  
  for (let i = 0; i < data.length; i++) {
    const validated = validateReplyData(data[i])
    if (validated) {
      validatedReplies.push(validated)
    } else {
      console.warn(`Skipping invalid reply data at index ${i}`)
    }
  }

  return validatedReplies
}

/**
 * Safe conversion from blockchain numeric values
 */
export function safeToNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      console.warn('BigInt value too large for safe conversion to number:', value.toString())
      return Number.MAX_SAFE_INTEGER
    }
    return Number(value)
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

/**
 * Safe conversion to BigInt from various types
 */
export function safeToBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(Math.floor(value))
  if (typeof value === 'string') {
    try {
      return BigInt(value)
    } catch {
      return BigInt(0)
    }
  }
  return BigInt(0)
}

/**
 * Comprehensive data sanitization for display
 */
export function sanitizeForDisplay(data: ValidatedBottleData | ValidatedReplyData): any {
  if ('bottleId' in data) {
    // Reply data
    return {
      id: safeToNumber(data.id),
      bottleId: safeToNumber(data.bottleId),
      content: data.content,
      timestamp: safeToNumber(data.timestamp),
      replier: data.replier
    }
  } else {
    // Bottle data
    return {
      id: safeToNumber(data.id),
      content: data.content,
      timestamp: safeToNumber(data.timestamp),
      sender: data.sender,
      isActive: data.isActive,
      replyCount: safeToNumber(data.replyCount)
    }
  }
}

/**
 * Type-safe error result for validation functions
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  warnings?: string[]
}

/**
 * Enhanced validation with detailed error reporting
 */
export function validateWithResult<T>(
  data: unknown,
  validator: (data: unknown) => T | null,
  context?: string
): ValidationResult<T> {
  try {
    const result = validator(data)
    if (result === null) {
      return {
        success: false,
        error: `Validation failed${context ? ` for ${context}` : ''}`
      }
    }
    return {
      success: true,
      data: result
    }
  } catch (error) {
    return {
      success: false,
      error: `Validation error${context ? ` for ${context}` : ''}: ${(error as Error).message}`
    }
  }
}