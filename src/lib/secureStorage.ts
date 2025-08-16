// Secure localStorage wrapper with encryption for sensitive data

/**
 * Simple encryption/decryption using Web Crypto API
 * Note: This provides basic obfuscation for localStorage data
 * For production, consider using more robust encryption methods
 */

/**
 * Interface for secure storage
 */
interface ISecureStorage {
  setItem(key: string, value: any): void
  getItem<T = any>(key: string): T | null
  removeItem(key: string): void
  clear(): void
  isAvailable(): boolean
  getStorageInfo(): { totalSize: number; secureItems: number; regularItems: number }
}

/**
 * Server-safe implementation that doesn't use browser APIs
 */
class ServerSafeSecureStorage implements ISecureStorage {
  setItem(key: string, value: any): void {
    // No-op on server side
  }

  getItem<T = any>(key: string): T | null {
    // Always return null on server side
    return null
  }

  removeItem(key: string): void {
    // No-op on server side
  }

  clear(): void {
    // No-op on server side
  }

  isAvailable(): boolean {
    return false
  }

  getStorageInfo(): { totalSize: number; secureItems: number; regularItems: number } {
    return { totalSize: 0, secureItems: 0, regularItems: 0 }
  }
}

class SecureStorage implements ISecureStorage {
  private static instance: SecureStorage
  private key: string

  private constructor() {
    // Generate a consistent key based on browser fingerprint
    this.key = this.generateKey()
  }

  public static getInstance(): ISecureStorage {
    // In server-side environment, return a minimal instance
    if (typeof window === 'undefined') {
      // Create a server-safe instance that won't use localStorage
      return new ServerSafeSecureStorage()
    }
    
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage()
    }
    return SecureStorage.instance
  }

  private generateKey(): string {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Fallback for server-side rendering
      return 'server-fallback-key'
    }
    
    // Create a deterministic key based on browser characteristics
    const fingerprint = [
      navigator?.userAgent || 'unknown',
      navigator?.language || 'unknown',
      screen?.width || 1920,
      screen?.height || 1080,
      new Date().getTimezoneOffset()
    ].join('|')
    
    // Simple hash function (not cryptographically secure, but adequate for localStorage obfuscation)
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36).padStart(8, '0')
  }

  private encrypt(data: string): string {
    try {
      // Simple XOR encryption for localStorage obfuscation
      const key = this.key
      let encrypted = ''
      
      for (let i = 0; i < data.length; i++) {
        const keyChar = key[i % key.length]
        const encryptedChar = String.fromCharCode(
          data.charCodeAt(i) ^ keyChar.charCodeAt(0)
        )
        encrypted += encryptedChar
      }
      
      // Base64 encode to make it localStorage-safe
      return btoa(encrypted)
    } catch (error) {
      console.warn('加密失败，使用明文存储:', error)
      return data
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      // Base64 decode first
      const encrypted = atob(encryptedData)
      const key = this.key
      let decrypted = ''
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key[i % key.length]
        const decryptedChar = String.fromCharCode(
          encrypted.charCodeAt(i) ^ keyChar.charCodeAt(0)
        )
        decrypted += decryptedChar
      }
      
      return decrypted
    } catch (error) {
      console.warn('解密失败，可能是明文数据:', error)
      return encryptedData
    }
  }

  /**
   * Set encrypted data in localStorage
   */
  setItem(key: string, value: any): void {
    if (typeof window === 'undefined') {
      return // No-op on server side
    }
    
    try {
      const serialized = JSON.stringify(value)
      const encrypted = this.encrypt(serialized)
      localStorage.setItem(`secure_${key}`, encrypted)
    } catch (error) {
      console.error('安全存储失败:', error)
      // Fallback to regular localStorage
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (fallbackError) {
        console.error('localStorage 存储失败:', fallbackError)
      }
    }
  }

  /**
   * Get and decrypt data from localStorage
   */
  getItem<T = any>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null // Always return null on server side
    }
    
    try {
      // Try secure storage first
      const encryptedData = localStorage.getItem(`secure_${key}`)
      if (encryptedData) {
        const decrypted = this.decrypt(encryptedData)
        return JSON.parse(decrypted)
      }
      
      // Fallback to regular localStorage for backward compatibility
      const regularData = localStorage.getItem(key)
      if (regularData) {
        return JSON.parse(regularData)
      }
      
      return null
    } catch (error) {
      console.error('安全读取失败:', error)
      return null
    }
  }

  /**
   * Remove item from both secure and regular storage
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      return // No-op on server side
    }
    
    try {
      localStorage.removeItem(`secure_${key}`)
      localStorage.removeItem(key) // Also remove regular version
    } catch (error) {
      console.error('安全删除失败:', error)
    }
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    if (typeof window === 'undefined') {
      return // No-op on server side
    }
    
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('安全清空失败:', error)
    }
  }

  /**
   * Check if secure storage is available
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false // Not available on server side
    }
    
    try {
      const testKey = 'secure_test'
      const testValue = 'test'
      this.setItem(testKey, testValue)
      const retrieved = this.getItem(testKey)
      this.removeItem(testKey)
      return retrieved === testValue
    } catch (error) {
      return false
    }
  }

  /**
   * Get storage size information
   */
  getStorageInfo(): { totalSize: number; secureItems: number; regularItems: number } {
    if (typeof window === 'undefined') {
      return { totalSize: 0, secureItems: 0, regularItems: 0 }
    }
    
    let totalSize = 0
    let secureItems = 0
    let regularItems = 0

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        const value = localStorage.getItem(key) || ''
        totalSize += key.length + value.length
        
        if (key.startsWith('secure_')) {
          secureItems++
        } else {
          regularItems++
        }
      })
    } catch (error) {
      console.error('获取存储信息失败:', error)
    }

    return { totalSize, secureItems, regularItems }
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance()

// Specific utilities for drift bottle app
export const driftBottleStorage = {
  // Connection state
  setConnectionStable: (stable: boolean) => {
    secureStorage.setItem('connectionStable', stable)
  },
  
  getConnectionStable: (): boolean => {
    return secureStorage.getItem('connectionStable') || false
  },
  
  // Last connection time
  setLastConnectionTime: (timestamp: number) => {
    secureStorage.setItem('lastConnectionTime', timestamp)
  },
  
  getLastConnectionTime: (): number => {
    return secureStorage.getItem('lastConnectionTime') || 0
  },
  
  // User preferences
  setUserPreferences: (prefs: any) => {
    secureStorage.setItem('userPreferences', prefs)
  },
  
  getUserPreferences: (): any => {
    return secureStorage.getItem('userPreferences') || {}
  },
  
  // Cached bottle data (with encryption for privacy)
  setCachedBottleData: (bottleId: string, data: any) => {
    secureStorage.setItem(`bottleData_${bottleId}`, {
      data,
      timestamp: Date.now(),
      version: 1
    })
  },
  
  getCachedBottleData: (bottleId: string): { data: any; timestamp: number; version: number } | null => {
    return secureStorage.getItem(`bottleData_${bottleId}`)
  },
  
  // Clear connection-related data only
  clearConnectionData: () => {
    if (typeof window === 'undefined') {
      return // No-op on server side
    }
    
    try {
      secureStorage.removeItem('connectionStable')
      secureStorage.removeItem('lastConnectionTime')
      console.log('🧹 已清理钱包连接相关数据')
    } catch (error) {
      console.error('清理连接数据失败:', error)
    }
  },
  
  // Clear all drift bottle data
  clearAllData: () => {
    if (typeof window === 'undefined') {
      return // No-op on server side
    }
    
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('secure_connectionStable') ||
            key.startsWith('secure_lastConnectionTime') ||
            key.startsWith('secure_userPreferences') ||
            key.startsWith('secure_bottleData_')) {
          localStorage.removeItem(key)
        }
      })
      console.log('🧹 已清理所有漂流瓶应用数据')
    } catch (error) {
      console.error('清理全部数据失败:', error)
    }
  }
}