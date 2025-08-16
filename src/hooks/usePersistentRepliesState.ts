import { useState, useEffect, useCallback } from 'react'

// Conversation data interfaces for replies page
export interface ConversationData {
  bottleId: number
  originalContent: string
  originalSender: string
  originalTimestamp: number
  myReply: string
  myReplyTimestamp: number
  replyCount: number
  isActive: boolean
}

export interface FullConversationData {
  [bottleId: number]: any[]
}

export interface CachedRepliesState {
  conversations: ConversationData[]
  fullConversationData: FullConversationData
  lastUpdated: number
  userAddress: string
}

const REPLIES_CACHE_KEY_PREFIX = 'drift-bottle-replies'
const CACHE_EXPIRY_TIME = 1000 * 60 * 30 // 30 minutes

// Generate cache key for user-specific replies data
function getRepliesCacheKey(address: string): string {
  return `${REPLIES_CACHE_KEY_PREFIX}-${address.toLowerCase()}`
}

// Save replies data to localStorage
function saveRepliesToCache(address: string, data: CachedRepliesState): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheData = {
      ...data,
      lastUpdated: Date.now(),
      userAddress: address.toLowerCase()
    }
    localStorage.setItem(getRepliesCacheKey(address), JSON.stringify(cacheData))
    console.log('💾 Saved replies data to cache:', data.conversations.length, 'conversations')
  } catch (error) {
    console.warn('Failed to save replies data to cache:', error)
  }
}

// Load replies data from localStorage
function loadRepliesFromCache(address: string): CachedRepliesState | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(getRepliesCacheKey(address))
    if (!cached) return null
    
    const data: CachedRepliesState = JSON.parse(cached)
    
    // Check if cache is expired
    if (Date.now() - data.lastUpdated > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(getRepliesCacheKey(address))
      return null
    }
    
    // Verify cache belongs to correct user
    if (data.userAddress !== address.toLowerCase()) {
      return null
    }
    
    console.log('📁 Loaded replies data from cache:', data.conversations.length, 'conversations')
    return data
  } catch (error) {
    console.warn('Failed to load replies data from cache:', error)
    return null
  }
}

// Hook for persistent replies state management
export function usePersistentRepliesState(userAddress: string | undefined) {
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [fullConversationData, setFullConversationData] = useState<FullConversationData>({})
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // Load cached data on mount or when address changes
  useEffect(() => {
    if (!userAddress) {
      setConversations([])
      setFullConversationData({})
      setIsDataLoaded(true)
      return
    }

    const cached = loadRepliesFromCache(userAddress)
    if (cached) {
      setConversations(cached.conversations)
      setFullConversationData(cached.fullConversationData)
    } else {
      // Clear data if no cache
      setConversations([])
      setFullConversationData({})
    }
    setIsDataLoaded(true)
  }, [userAddress])

  // Save data to cache whenever state changes
  const saveToCache = useCallback(() => {
    if (!userAddress || !isDataLoaded) return

    const currentState: CachedRepliesState = {
      conversations,
      fullConversationData,
      lastUpdated: Date.now(),
      userAddress
    }

    saveRepliesToCache(userAddress, currentState)
  }, [userAddress, conversations, fullConversationData, isDataLoaded])

  // Auto-save on state changes (debounced)
  useEffect(() => {
    if (!isDataLoaded) return

    const saveTimer = setTimeout(() => {
      saveToCache()
    }, 1000) // Debounce saves by 1 second

    return () => clearTimeout(saveTimer)
  }, [saveToCache, isDataLoaded])

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userAddress && isDataLoaded) {
        // Synchronous save for unload
        const currentState: CachedRepliesState = {
          conversations,
          fullConversationData,
          lastUpdated: Date.now(),
          userAddress
        }
        saveRepliesToCache(userAddress, currentState)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveToCache() // Save when component unmounts
    }
  }, [saveToCache, userAddress, conversations, fullConversationData, isDataLoaded])

  // Clear all data
  const clearData = useCallback(() => {
    setConversations([])
    setFullConversationData({})
  }, [])

  // Update conversation data
  const updateConversation = useCallback((bottleId: number, updates: Partial<ConversationData>) => {
    setConversations(prev => prev.map(conv => 
      conv.bottleId === bottleId 
        ? { ...conv, ...updates }
        : conv
    ))
  }, [])

  // Add or update full conversation data
  const updateFullConversationData = useCallback((bottleId: number, data: any[]) => {
    setFullConversationData(prev => ({ ...prev, [bottleId]: data }))
  }, [])

  return {
    // State
    conversations,
    fullConversationData,
    isDataLoaded,
    
    // Setters
    setConversations,
    setFullConversationData,
    
    // Utilities
    clearData,
    updateConversation,
    updateFullConversationData,
    saveToCache
  }
}