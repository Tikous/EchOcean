// Cache lock mechanism to prevent race conditions

export interface CacheLock {
  key: string
  timestamp: number
  expiry: number
}

/**
 * Simple in-memory lock manager for cache operations
 */
class CacheLockManager {
  private static instance: CacheLockManager
  private locks: Map<string, CacheLock> = new Map()
  private readonly defaultExpiry = 30000 // 30 seconds default
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Start periodic cleanup of expired locks
    this.startCleanup()
  }

  public static getInstance(): CacheLockManager {
    if (!CacheLockManager.instance) {
      CacheLockManager.instance = new CacheLockManager()
    }
    return CacheLockManager.instance
  }

  /**
   * Acquire a lock for a cache key
   */
  public async acquireLock(key: string, expiryMs: number = this.defaultExpiry): Promise<boolean> {
    const now = Date.now()
    const existingLock = this.locks.get(key)

    // Check if existing lock is still valid
    if (existingLock && existingLock.expiry > now) {
      return false // Lock is already held
    }

    // Create new lock
    const lock: CacheLock = {
      key,
      timestamp: now,
      expiry: now + expiryMs
    }

    this.locks.set(key, lock)
    return true
  }

  /**
   * Release a lock for a cache key
   */
  public releaseLock(key: string): void {
    this.locks.delete(key)
  }

  /**
   * Check if a key is currently locked
   */
  public isLocked(key: string): boolean {
    const lock = this.locks.get(key)
    if (!lock) return false
    
    const now = Date.now()
    if (lock.expiry <= now) {
      // Lock has expired, remove it
      this.locks.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Wait for a lock to be available with timeout
   */
  public async waitForLock(
    key: string, 
    maxWaitMs: number = 5000, 
    pollIntervalMs: number = 100
  ): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitMs) {
      if (!this.isLocked(key)) {
        return true // Lock is available
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
    
    return false // Timeout reached
  }

  /**
   * Execute a function with a lock (auto-acquire and release)
   */
  public async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: { expiryMs?: number; maxWaitMs?: number } = {}
  ): Promise<T | null> {
    const { expiryMs = this.defaultExpiry, maxWaitMs = 5000 } = options

    // Wait for lock to be available
    const lockAvailable = await this.waitForLock(key, maxWaitMs)
    if (!lockAvailable) {
      console.warn(`Failed to acquire lock for ${key} within ${maxWaitMs}ms`)
      return null
    }

    // Acquire lock
    const acquired = await this.acquireLock(key, expiryMs)
    if (!acquired) {
      console.warn(`Failed to acquire lock for ${key}`)
      return null
    }

    try {
      const result = await fn()
      return result
    } catch (error) {
      console.error(`Error executing function with lock for ${key}:`, error)
      throw error
    } finally {
      // Always release lock
      this.releaseLock(key)
    }
  }

  /**
   * Get all current locks (for debugging)
   */
  public getAllLocks(): CacheLock[] {
    return Array.from(this.locks.values())
  }

  /**
   * Clear all locks
   */
  public clearAllLocks(): void {
    this.locks.clear()
  }

  /**
   * Start periodic cleanup of expired locks
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const expiredKeys: string[] = []

      for (const [key, lock] of this.locks.entries()) {
        if (lock.expiry <= now) {
          expiredKeys.push(key)
        }
      }

      expiredKeys.forEach(key => {
        this.locks.delete(key)
      })

      if (expiredKeys.length > 0) {
        console.log(`Cleaned up ${expiredKeys.length} expired cache locks`)
      }
    }, 10000) // Clean up every 10 seconds
  }

  /**
   * Stop cleanup interval (for cleanup)
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

export const cacheLockManager = CacheLockManager.getInstance()

/**
 * Higher-level cache operation with lock protection
 */
export async function safeCacheOperation<T>(
  cacheKey: string,
  operation: () => Promise<T>,
  options: {
    lockKey?: string
    expiryMs?: number
    maxWaitMs?: number
    fallbackValue?: T
  } = {}
): Promise<T> {
  const {
    lockKey = `cache_${cacheKey}`,
    expiryMs = 30000,
    maxWaitMs = 5000,
    fallbackValue
  } = options

  try {
    const result = await cacheLockManager.withLock(
      lockKey,
      operation,
      { expiryMs, maxWaitMs }
    )

    if (result === null && fallbackValue !== undefined) {
      return fallbackValue
    }

    return result!
  } catch (error) {
    console.error(`Safe cache operation failed for ${cacheKey}:`, error)
    
    if (fallbackValue !== undefined) {
      return fallbackValue
    }
    
    throw error
  }
}

/**
 * Cache-aware data fetcher with lock protection
 */
export async function fetchWithCacheLock<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: {
    ttlMs?: number
    lockExpiryMs?: number
    maxWaitMs?: number
  } = {}
): Promise<T> {
  const {
    ttlMs = 300000, // 5 minutes TTL
    lockExpiryMs = 30000, // 30 seconds lock
    maxWaitMs = 5000 // 5 seconds max wait
  } = options

  const lockKey = `fetch_${cacheKey}`

  return await safeCacheOperation(
    cacheKey,
    async () => {
      // Check if we have cached data
      const cached = getCachedData<T>(cacheKey, ttlMs)
      if (cached) {
        return cached
      }

      // Fetch new data
      const data = await fetchFn()
      
      // Cache the result
      setCachedData(cacheKey, data)
      
      return data
    },
    {
      lockKey,
      expiryMs: lockExpiryMs,
      maxWaitMs
    }
  )
}

/**
 * Simple in-memory cache for demonstration
 * In production, this would integrate with your actual cache system
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const memoryCache = new Map<string, CacheEntry<any>>()

function getCachedData<T>(key: string, ttlMs: number): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null

  const now = Date.now()
  if (now - entry.timestamp > entry.ttl) {
    memoryCache.delete(key)
    return null
  }

  return entry.data as T
}

function setCachedData<T>(key: string, data: T, ttlMs: number = 300000): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  })
}