// Security utilities for data validation and sanitization

import DOMPurify from 'isomorphic-dompurify'

// Content validation patterns
const VALIDATION_PATTERNS = {
  // Basic text content (allows Chinese, English, numbers, common punctuation)
  content: /^[\w\s\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}.,!?;:'"()[\]\-—–…。，！？；：""''（）【】《》、～]+$/u,
  
  // Ethereum address pattern
  address: /^0x[a-fA-F0-9]{40}$/,
  
  // Transaction hash pattern
  txHash: /^0x[a-fA-F0-9]{64}$/,
  
  // Bottle ID (positive integer)
  bottleId: /^\d+$/,
  
  // Reply content (more restrictive)
  reply: /^[\w\s\u4e00-\u9fff.,!?;:'"()[\]\-—–…。，！？；：""''（）【】《》、～]{1,500}$/u
}

// Maximum lengths for different content types
const MAX_LENGTHS = {
  content: 500,
  reply: 500,
  address: 42,
  txHash: 66
}

// Dangerous patterns that should be rejected
const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<form[^>]*>.*?<\/form>/gi,
  /<input[^>]*>/gi,
  /expression\s*\(/gi, // CSS expression attacks
  /url\s*\(/gi // URL function in CSS
]

/**
 * Sanitize and validate bottle content
 */
export function sanitizeBottleContent(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new Error('内容不能为空')
  }

  // Trim whitespace
  const trimmed = content.trim()
  
  // Check length
  if (trimmed.length === 0) {
    throw new Error('内容不能为空')
  }
  
  if (trimmed.length > MAX_LENGTHS.content) {
    throw new Error(`内容长度不能超过 ${MAX_LENGTHS.content} 个字符`)
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error('内容包含不安全的代码，请检查后重试')
    }
  }

  // Validate content pattern
  if (!VALIDATION_PATTERNS.content.test(trimmed)) {
    throw new Error('内容包含不支持的字符，请使用中文、英文、数字和常见标点符号')
  }

  // Use DOMPurify to sanitize HTML (removes all HTML tags and attributes)
  const sanitized = DOMPurify.sanitize(trimmed, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })

  return sanitized
}

/**
 * Sanitize and validate reply content
 */
export function sanitizeReplyContent(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new Error('回复内容不能为空')
  }

  const trimmed = content.trim()
  
  if (trimmed.length === 0) {
    throw new Error('回复内容不能为空')
  }
  
  if (trimmed.length > MAX_LENGTHS.reply) {
    throw new Error(`回复长度不能超过 ${MAX_LENGTHS.reply} 个字符`)
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error('回复包含不安全的代码，请检查后重试')
    }
  }

  // Validate reply pattern
  if (!VALIDATION_PATTERNS.reply.test(trimmed)) {
    throw new Error('回复包含不支持的字符，请使用中文、英文、数字和常见标点符号')
  }

  const sanitized = DOMPurify.sanitize(trimmed, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })

  return sanitized
}

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }
  
  return VALIDATION_PATTERNS.address.test(address)
}

/**
 * Validate transaction hash
 */
export function validateTxHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false
  }
  
  return VALIDATION_PATTERNS.txHash.test(hash)
}

/**
 * Validate bottle ID
 */
export function validateBottleId(id: string | number): boolean {
  const idStr = typeof id === 'number' ? id.toString() : id
  
  if (!idStr || typeof idStr !== 'string') {
    return false
  }
  
  if (!VALIDATION_PATTERNS.bottleId.test(idStr)) {
    return false
  }
  
  const num = parseInt(idStr, 10)
  return num >= 0 && num <= Number.MAX_SAFE_INTEGER
}

/**
 * Sanitize data coming from blockchain
 */
export function sanitizeBlockchainData(data: any): any {
  if (data === null || data === undefined) {
    return data
  }
  
  if (typeof data === 'string') {
    // Remove potential HTML/script content
    const sanitized = DOMPurify.sanitize(data, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
    
    // Additional cleanup for blockchain data
    return sanitized
      .replace(/^["""]+|["""]+$/g, '') // Remove quotes
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim()
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitizeBlockchainData)
    }
    
    const sanitizedObj: any = {}
    for (const [key, value] of Object.entries(data)) {
      sanitizedObj[key] = sanitizeBlockchainData(value)
    }
    return sanitizedObj
  }
  
  return data
}

/**
 * Rate limiting for user actions
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  isAllowed(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.attempts.has(identifier)) {
      this.attempts.set(identifier, [])
    }
    
    const userAttempts = this.attempts.get(identifier)!
    
    // Remove expired attempts
    const validAttempts = userAttempts.filter(timestamp => timestamp > windowStart)
    this.attempts.set(identifier, validAttempts)
    
    if (validAttempts.length >= maxAttempts) {
      return false
    }
    
    // Add current attempt
    validAttempts.push(now)
    this.attempts.set(identifier, validAttempts)
    
    return true
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:",
} as const