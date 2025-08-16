import { useState, useEffect, useCallback } from 'react'
import { 
  saveBottleDataToCache, 
  loadBottleDataFromCache, 
  mergeBottleData, 
  DataCacheManager,
  type CachedBottleState,
  type BottleData,
  type ReplyData
} from '@/lib/dataCache'

// Hook for persistent bottle state management with intelligent caching
export function usePersistentBottleState(userAddress: string | undefined) {
  const [bottles, setBottles] = useState<BottleData[]>([])
  const [replies, setReplies] = useState<{[key: number]: ReplyData[]}>({})
  const [canReplyTo, setCanReplyTo] = useState<{[key: number]: boolean}>({})
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [isStale, setIsStale] = useState(false)
  
  const cacheManager = DataCacheManager.getInstance()

  // Enhanced cache loading with staleness detection and single render
  useEffect(() => {
    if (!userAddress) {
      setIsDataLoaded(true)
      return
    }

    const cached = loadBottleDataFromCache(userAddress)
    if (cached) {
      // Use single state update to prevent multiple renders
      const cacheStatus = cacheManager.getCacheStatus(userAddress)
      setIsStale(cacheStatus.isStale)
      
      // Batch state updates to prevent flickering
      Promise.resolve().then(() => {
        setBottles(cached.bottles)
        setReplies(cached.replies)
        setCanReplyTo(cached.canReplyTo)
        setIsDataLoaded(true)
      })
      
      console.log('📦 加载缓存数据:', cached.bottles.length, '个涟漪', cacheStatus.isStale ? '(已过期)' : '(新鲜)')
    } else {
      setIsDataLoaded(true)
    }
  }, [userAddress, cacheManager])

  // Enhanced save to cache with intelligent updates
  const saveToCache = useCallback(() => {
    if (!userAddress || !isDataLoaded) return

    const currentState: CachedBottleState = {
      bottles,
      replies,
      canReplyTo,
      lastUpdated: Date.now(),
      userAddress
    }

    // Use intelligent cache update - only save if data has changed
    const hasChanged = cacheManager.updateCacheIfChanged(userAddress, currentState)
    if (hasChanged) {
      setIsStale(false) // Mark as fresh after update
    }
  }, [userAddress, bottles, replies, canReplyTo, isDataLoaded, cacheManager])

  // Auto-save on state changes
  useEffect(() => {
    if (isDataLoaded) {
      saveToCache()
    }
  }, [saveToCache, isDataLoaded])

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToCache()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveToCache() // Save when component unmounts
    }
  }, [saveToCache])

  // Merge fresh data with existing data
  const mergeFreshData = useCallback((freshData: Partial<CachedBottleState>) => {
    if (!userAddress) return

    const currentState: CachedBottleState = {
      bottles,
      replies,
      canReplyTo,
      lastUpdated: Date.now(),
      userAddress
    }

    const merged = mergeBottleData(currentState, freshData)
    
    if (freshData.bottles) setBottles(merged.bottles)
    if (freshData.replies) setReplies(merged.replies)
    if (freshData.canReplyTo) setCanReplyTo(merged.canReplyTo)
  }, [userAddress, bottles, replies, canReplyTo])

  // Clear all data
  const clearData = useCallback(() => {
    setBottles([])
    setReplies({})
    setCanReplyTo({})
  }, [])

  // Update individual bottle
  const updateBottle = useCallback((bottleId: number, updates: Partial<BottleData>) => {
    setBottles(prev => prev.map(bottle => 
      bottle.id === bottleId 
        ? { ...bottle, ...updates }
        : bottle
    ))
  }, [])

  // Update replies for a bottle
  const updateBottleReplies = useCallback((bottleId: number, newReplies: ReplyData[]) => {
    setReplies(prev => ({ ...prev, [bottleId]: newReplies }))
  }, [])

  // Update reply permission for a bottle
  const updateCanReplyTo = useCallback((bottleId: number, canReply: boolean) => {
    setCanReplyTo(prev => ({ ...prev, [bottleId]: canReply }))
  }, [])

  return {
    // State
    bottles,
    replies,
    canReplyTo,
    isDataLoaded,
    
    // Setters
    setBottles,
    setReplies,
    setCanReplyTo,
    
    // Utilities
    mergeFreshData,
    clearData,
    updateBottle,
    updateBottleReplies,
    updateCanReplyTo,
    saveToCache
  }
}