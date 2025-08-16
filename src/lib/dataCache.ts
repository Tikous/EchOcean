// Data persistence and caching utilities for drift bottle data

import { safeCacheOperation } from '@/lib/cacheLock'
export interface BottleData {
  id: number
  content: string
  timestamp: number
  replyCount: number
  isActive: boolean
  sender: string
}

export interface ReplyData {
  id: number
  content: string
  timestamp: number
  replier: string
}

export interface CachedBottleState {
  bottles: BottleData[]
  replies: {[key: number]: ReplyData[]}
  canReplyTo: {[key: number]: boolean}
  lastUpdated: number
  userAddress: string
}

const CACHE_KEY_PREFIX = 'drift-bottle-data'
const CACHE_EXPIRY_TIME = 1000 * 60 * 30 // 30 minutes

// Generate cache key for user-specific data
function getCacheKey(address: string): string {
  return `${CACHE_KEY_PREFIX}-${address.toLowerCase()}`
}

// Save bottle data to localStorage with size and security checks
export async function saveBottleDataToCache(address: string, data: CachedBottleState): Promise<void> {
  if (typeof window === 'undefined') return
  
  const cacheKey = getCacheKey(address)
  
  await safeCacheOperation(
    cacheKey,
    async () => {
      const cacheData = {
        ...data,
        lastUpdated: Date.now(),
        userAddress: address.toLowerCase()
      }
      
      const dataString = JSON.stringify(cacheData)
      
      // Check data size to prevent quota exceeded errors
      const sizeInMB = new Blob([dataString]).size / (1024 * 1024)
      if (sizeInMB > 5) { // Limit to 5MB per cache entry
        console.warn('缓存数据过大，跳过保存:', sizeInMB.toFixed(2), 'MB')
        return
      }
      
      // Check total localStorage usage
      const totalSize = Object.keys(localStorage).reduce((size, key) => {
        return size + (localStorage.getItem(key)?.length || 0)
      }, 0)
      
      if (totalSize > 5 * 1024 * 1024) { // 5MB total limit
        console.warn('localStorage使用量过大，清理旧数据')
        clearOldCacheEntries()
      }
      
      localStorage.setItem(cacheKey, dataString)
      return true
    },
    {
      lockKey: `save_${cacheKey}`,
      expiryMs: 10000, // 10 second lock for save operations
      maxWaitMs: 3000, // 3 second max wait
      fallbackValue: false
    }
  ).catch(error => {
    if (error instanceof DOMException && error.code === 22) {
      console.warn('localStorage配额已满，清理旧数据并重试')
      clearOldCacheEntries()
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          ...data,
          lastUpdated: Date.now(),
          userAddress: address.toLowerCase()
        }))
      } catch (retryError) {
        console.error('重试保存缓存失败:', retryError)
      }
    } else {
      console.warn('保存缓存数据失败:', error)
    }
  })
}

// Helper function to clear old cache entries
function clearOldCacheEntries(): void {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX))
    
    // Sort by last updated time and remove oldest entries
    const cacheEntries = cacheKeys.map(key => {
      const data = localStorage.getItem(key)
      if (!data) return null
      
      try {
        const parsed = JSON.parse(data)
        return {
          key,
          lastUpdated: parsed.lastUpdated || 0
        }
      } catch {
        return { key, lastUpdated: 0 }
      }
    }).filter(Boolean).sort((a, b) => a!.lastUpdated - b!.lastUpdated)
    
    // Remove oldest 50% of entries
    const toRemove = cacheEntries.slice(0, Math.floor(cacheEntries.length / 2))
    toRemove.forEach(entry => {
      localStorage.removeItem(entry!.key)
    })
    
    console.log('清理了', toRemove.length, '个旧缓存条目')
  } catch (error) {
    console.warn('清理缓存失败:', error)
  }
}

// Load bottle data from localStorage
export function loadBottleDataFromCache(address: string): CachedBottleState | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(getCacheKey(address))
    if (!cached) return null
    
    const data: CachedBottleState = JSON.parse(cached)
    
    // Check if cache is expired
    if (Date.now() - data.lastUpdated > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(getCacheKey(address))
      return null
    }
    
    // Verify cache belongs to correct user
    if (data.userAddress !== address.toLowerCase()) {
      return null
    }
    
    return data
  } catch (error) {
    console.warn('Failed to load bottle data from cache:', error)
    return null
  }
}

// Clear cache for specific user
export function clearBottleDataCache(address: string): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(getCacheKey(address))
  } catch (error) {
    console.warn('Failed to clear bottle data cache:', error)
  }
}

// Clear all cached bottle data
export function clearAllBottleDataCache(): void {
  if (typeof window === 'undefined') return
  
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Failed to clear all bottle data cache:', error)
  }
}

// Merge cached data with fresh data
export function mergeBottleData(
  cached: CachedBottleState | null, 
  fresh: Partial<CachedBottleState>
): CachedBottleState {
  const now = Date.now()
  
  if (!cached) {
    return {
      bottles: fresh.bottles || [],
      replies: fresh.replies || {},
      canReplyTo: fresh.canReplyTo || {},
      lastUpdated: now,
      userAddress: fresh.userAddress || ''
    }
  }
  
  // Merge bottles, preferring fresh data
  const mergedBottles = fresh.bottles || cached.bottles
  
  // Merge replies, combining old and new
  const mergedReplies = {
    ...cached.replies,
    ...fresh.replies
  }
  
  // Merge reply permissions
  const mergedCanReplyTo = {
    ...cached.canReplyTo,
    ...fresh.canReplyTo
  }
  
  return {
    bottles: mergedBottles,
    replies: mergedReplies,
    canReplyTo: mergedCanReplyTo,
    lastUpdated: now,
    userAddress: fresh.userAddress || cached.userAddress
  }
}

// Advanced DataCacheManager for intelligent caching
export class DataCacheManager {
  private static instance: DataCacheManager
  private refreshCallbacks: Set<() => void> = new Set()
  private lastRefreshTime: number = 0
  private isRefreshing: boolean = false
  
  static getInstance(): DataCacheManager {
    if (!DataCacheManager.instance) {
      DataCacheManager.instance = new DataCacheManager()
    }
    return DataCacheManager.instance
  }
  
  // Register callback for global refresh events
  onRefresh(callback: () => void): () => void {
    this.refreshCallbacks.add(callback)
    return () => this.refreshCallbacks.delete(callback)
  }
  
  // Trigger global refresh
  async triggerRefresh(forceRefresh: boolean = false): Promise<void> {
    const now = Date.now()
    
    // Prevent rapid refresh (debounce 5 seconds)
    if (!forceRefresh && now - this.lastRefreshTime < 5000) {
      console.log('⏱️ 刷新频率限制，请稍后再试')
      return
    }
    
    if (this.isRefreshing && !forceRefresh) {
      console.log('🔄 正在刷新中，请等待')
      return
    }
    
    this.isRefreshing = true
    this.lastRefreshTime = now
    
    try {
      console.log('🔄 开始全局数据刷新')
      
      // Notify all registered components
      this.refreshCallbacks.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('刷新回调出错:', error)
        }
      })
      
      console.log('✅ 全局数据刷新完成')
    } catch (error) {
      console.error('❌ 全局数据刷新失败:', error)
    } finally {
      this.isRefreshing = false
    }
  }
  
  // Check if data is stale and needs refresh
  isDataStale(lastUpdated: number, maxAge: number = CACHE_EXPIRY_TIME): boolean {
    return Date.now() - lastUpdated > maxAge
  }
  
  // Get cache status for debugging
  getCacheStatus(address: string): {
    exists: boolean
    isStale: boolean
    lastUpdated: number
    age: number
  } {
    const cached = loadBottleDataFromCache(address)
    const now = Date.now()
    
    if (!cached) {
      return {
        exists: false,
        isStale: true,
        lastUpdated: 0,
        age: Infinity
      }
    }
    
    const age = now - cached.lastUpdated
    
    return {
      exists: true,
      isStale: this.isDataStale(cached.lastUpdated),
      lastUpdated: cached.lastUpdated,
      age
    }
  }
  
  // Intelligent cache update - only save if data has changed
  updateCacheIfChanged(address: string, newData: CachedBottleState): boolean {
    const existing = loadBottleDataFromCache(address)
    
    if (!existing) {
      saveBottleDataToCache(address, newData)
      return true
    }
    
    // Compare data to see if it's different
    const hasChanges = (
      existing.bottles.length !== newData.bottles.length ||
      JSON.stringify(existing.bottles) !== JSON.stringify(newData.bottles) ||
      JSON.stringify(existing.replies) !== JSON.stringify(newData.replies) ||
      JSON.stringify(existing.canReplyTo) !== JSON.stringify(newData.canReplyTo)
    )
    
    if (hasChanges) {
      saveBottleDataToCache(address, newData)
      console.log('💾 数据已更新并保存到缓存')
      return true
    }
    
    return false
  }
  
  // Preload data for better performance
  async preloadData(address: string, dataLoader: () => Promise<CachedBottleState>): Promise<CachedBottleState | null> {
    const cached = loadBottleDataFromCache(address)
    
    if (cached && !this.isDataStale(cached.lastUpdated)) {
      // Return cached data immediately, optionally refresh in background
      setTimeout(async () => {
        try {
          const fresh = await dataLoader()
          this.updateCacheIfChanged(address, fresh)
        } catch (error) {
          console.warn('后台数据更新失败:', error)
        }
      }, 1000)
      
      return cached
    }
    
    // Load fresh data
    try {
      const fresh = await dataLoader()
      saveBottleDataToCache(address, fresh)
      return fresh
    } catch (error) {
      console.error('数据加载失败:', error)
      return cached // Fall back to stale cache if available
    }
  }
}