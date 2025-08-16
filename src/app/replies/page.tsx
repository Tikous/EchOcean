'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { useDriftBottle } from '@/hooks/useDriftBottle'
import { usePersistentRepliesState, type ConversationData } from '@/hooks/usePersistentRepliesState'
import { useReadContract } from 'wagmi'
import { DRIFT_BOTTLE_CONTRACT_ADDRESS, DRIFT_BOTTLE_ABI, config } from '@/lib/web3'
import { LoadingIndicator, ConversationListSkeleton } from '@/components/LoadingIndicator'
import { RefreshButton, CompactRefreshButton } from '@/components/RefreshButton'
import { DataCacheManager } from '@/lib/dataCache'
import toast from 'react-hot-toast'

// Use ConversationData from persistent state hook
type Conversation = ConversationData

export default function RepliesPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [backgroundUpdate, setBackgroundUpdate] = useState(false)
  const [loadingFullConversation, setLoadingFullConversation] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const router = useRouter()
  const { isConnected, address, isLoading: contractLoading, readBottleData, readBottleReplies } = useDriftBottle()
  const cacheManager = DataCacheManager.getInstance()
  
  // Use persistent state for conversations data
  const {
    conversations,
    fullConversationData,
    isDataLoaded,
    setConversations,
    setFullConversationData,
    updateFullConversationData,
    clearData
  } = usePersistentRepliesState(address)

  // Get user's replies from the blockchain with stale-while-revalidate strategy
  const { 
    data: userReplies, 
    isLoading: repliesLoading,
    isRefetching: repliesRefetching,
    error: repliesError,
    isPlaceholderData
  } = useReadContract({
    address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
    abi: DRIFT_BOTTLE_ABI,
    functionName: 'getUserReplies',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!DRIFT_BOTTLE_CONTRACT_ADDRESS && !!address && isConnected,
      // Optimized for faster navigation with immediate cache display
      staleTime: 1000 * 60 * 2, // 2 minutes - show cached data, background refetch
      gcTime: 1000 * 60 * 20, // 20 minutes - keep in cache for navigation
      refetchOnMount: 'always', // Always get fresh data when mounting
      refetchOnWindowFocus: true, // Refetch when user comes back to page
      placeholderData: (previousData) => previousData, // Keep previous data while refetching
      // Better deduplication for rapid navigation
      structuralSharing: true,
    },
  })

  // Handle background refetching indicator
  useEffect(() => {
    if (repliesRefetching && conversations.length > 0) {
      setBackgroundUpdate(true)
      // Hide indicator after 2 seconds
      const timer = setTimeout(() => setBackgroundUpdate(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [repliesRefetching, conversations.length])

  useEffect(() => {
    // Only process data if we have valid user replies data
    if (userReplies && Array.isArray(userReplies)) {
      if (userReplies.length > 0) {
        // Check if we have cached data first
        const cachedBottleIds = conversations.map(c => c.bottleId).sort()
        const freshBottleIds = userReplies.map(id => typeof id === 'bigint' ? Number(id) : Number(id)).sort()
        const hasAllData = cachedBottleIds.length === freshBottleIds.length && 
          cachedBottleIds.every((id, index) => id === freshBottleIds[index])
        
        if (!hasAllData || conversations.length === 0) {
          console.log('🔄 Loading conversation details (cache miss or empty data)')
          loadConversationDetails(userReplies)
        } else {
          console.log('✅ Using cached conversation data')
          setIsLoadingDetails(false)
        }
      } else {
        // Handle empty replies array
        clearData()
        setIsLoadingDetails(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userReplies, isDataLoaded])

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!address || !isConnected) return
    
    setIsRefreshing(true)
    try {
      console.log('🔄 手动刷新共鸣足迹数据')
      
      // Clear cache and reload fresh data
      clearData()
      
      // Force refetch from blockchain - this will trigger useEffect
      // The userReplies query will refetch automatically
      
      toast.success('数据已刷新')
    } catch (error) {
      console.error('手动刷新失败:', error)
      toast.error('刷新失败，请重试')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Register for global refresh events
  useEffect(() => {
    if (!address || !isConnected) return
    
    const unregister = cacheManager.onRefresh(() => {
      handleManualRefresh()
    })
    
    return unregister
  }, [address, isConnected])

  const loadConversationDetails = async (replyData: any[]) => {
    if (!isConnected || !address || replyData.length === 0) {
      setConversations([])
      setIsLoadingDetails(false)
      return
    }

    // Only show loading for initial load, not background updates
    if (conversations.length === 0 && !isPlaceholderData && !isDataLoaded) {
      setIsLoadingDetails(true)
    }

    try {
      console.log('正在加载对话详情...', replyData)
      
      // Progressive loading for conversations
      const loadConversationProgressively = async (replyId: any, index: number) => {
        try {
          // Handle different data structures from contract
          console.log(`Processing reply ID [${index}]:`, replyId, 'Type:', typeof replyId)
          
          // Convert reply ID to number
          const replyIdNumber = typeof replyId === 'bigint' ? Number(replyId) : Number(replyId)
          
          if (!replyId || isNaN(replyIdNumber) || replyIdNumber <= 0) {
            console.error('Invalid reply ID:', {
              replyId,
              replyIdNumber,
              replyType: typeof replyId,
              index
            })
            return
          }
          
          // Get detailed reply information using getReply function
          const { readContract } = await import('wagmi/actions')
          const reply = await readContract(config, {
            address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
            abi: DRIFT_BOTTLE_ABI,
            functionName: 'getReply',
            args: [BigInt(replyIdNumber)],
          })
          
          if (!reply) {
            console.error('Could not fetch reply data for reply ID:', replyIdNumber)
            return
          }
          
          // Extract bottle ID from reply
          const rawBottleId = reply.bottleId
          const bottleId = typeof rawBottleId === 'bigint' ? Number(rawBottleId) : Number(rawBottleId)
          
          if (!rawBottleId || isNaN(bottleId) || bottleId <= 0) {
            console.error('Invalid bottle ID in reply:', {
              reply,
              rawBottleId,
              bottleId,
              replyIdNumber,
              index
            })
            return
          }
          
          // Get original bottle details directly from blockchain with retry
          let originalBottle = null
          let retryCount = 0
          const maxRetries = 3
          
          while (!originalBottle && retryCount < maxRetries) {
            try {
              originalBottle = await readBottleData(bottleId)
              if (originalBottle) break
              
              retryCount++
              if (retryCount < maxRetries) {
                console.warn(`Retrying bottle data fetch for ID ${bottleId}, attempt ${retryCount + 1}`)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
              }
            } catch (error) {
              console.warn(`Error fetching bottle ${bottleId}, attempt ${retryCount + 1}:`, error)
              retryCount++
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
              }
            }
          }
          
          if (!originalBottle) {
            console.warn(`跳过瓶子 ${bottleId}: 无法获取数据 (可能已被删除或网络问题)`)
            return
          }
          
          // Extract reply details from the reply object
          let myReplyContent = (() => {
            if (reply.content) return reply.content
            if (Array.isArray(reply) && reply[2]) return reply[2] // content is at index 2
            return '[回复内容不可用]'
          })()
          
          const myReplyTimestamp = (() => {
            let rawTs = null
            if (reply.timestamp) rawTs = reply.timestamp
            else if (Array.isArray(reply) && reply[3]) rawTs = reply[3] // timestamp is at index 3
            else rawTs = Date.now()
            
            const ts = typeof rawTs === 'bigint' ? Number(rawTs) : Number(rawTs)
            // Handle timestamp conversion (seconds to milliseconds if needed)
            return ts > 0 ? (ts < 1e12 ? ts * 1000 : ts) : Date.now()
          })()
          
          if (!myReplyContent || myReplyContent.trim() === '') {
            console.warn('Empty reply content for bottle:', bottleId, 'using placeholder')
            myReplyContent = '[回复内容不可用]'
          }
          
          // Get total reply count for this bottle directly from blockchain (if not already fetched)
          let replyCount = 0
          try {
            const allReplies = await readBottleReplies(bottleId)
            replyCount = Array.isArray(allReplies) ? allReplies.length : 0
          } catch (err) {
            console.warn('Failed to get reply count for bottle:', bottleId, err)
            replyCount = 0
          }
          
          // Parse original bottle data with validation
          const originalContent = originalBottle.content || originalBottle[2] || '[内容不可用]'
          const originalSender = originalBottle.sender || originalBottle[1] || 'Anonymous'
          const originalTimestamp = (() => {
            const rawTs = originalBottle.timestamp || originalBottle[3] || Date.now()
            const ts = typeof rawTs === 'bigint' ? Number(rawTs) : Number(rawTs)
            return ts > 0 ? (ts < 1e12 ? ts * 1000 : ts) : Date.now()
          })()
          
          // Use placeholders instead of returning null to prevent crashes
          const safeOriginalContent = originalContent || '[原始内容不可用]'
          const safeOriginalSender = originalSender || 'Anonymous'
          const safeReplyContent = myReplyContent || '[回复内容不可用]'
          
          const conversation: Conversation = {
            bottleId,
            originalContent: safeOriginalContent.replace(/^["'"'"]+|["'"'"]+$/g, ''), // Remove decorative quotes
            originalSender: safeOriginalSender,
            originalTimestamp,
            myReply: safeReplyContent.replace(/^["'"'"]+|["'"'"]+$/g, ''), // Remove decorative quotes  
            myReplyTimestamp,
            replyCount,
            isActive: originalBottle.isActive !== false
          }

          // Add conversation immediately for progressive display
          setConversations(prev => {
            const filtered = prev.filter(c => c.bottleId !== bottleId)
            const updated = [...filtered, conversation]
            return updated.sort((a, b) => b.myReplyTimestamp - a.myReplyTimestamp)
          })
        } catch (error) {
          console.error(`Error loading conversation for reply:`, error)
        }
      }
      
      // Load conversations progressively instead of waiting for all
      replyData.forEach((replyId, index) => {
        loadConversationProgressively(replyId, index)
      })
    } catch (error) {
      console.error('Error loading conversation details:', error)
      // Only clear conversations if this was the initial load
      if (conversations.length === 0) {
        clearData()
      }
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp
    
    if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)} 分钟前`
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)} 小时前`
    } else {
      return `${Math.floor(diff / 86400000)} 天前`
    }
  }

  const handleViewConversation = async (bottleId: number) => {
    // If clicking to hide, just collapse
    if (selectedConversation === bottleId) {
      setSelectedConversation(null)
      return
    }

    // Show the conversation panel immediately
    setSelectedConversation(bottleId)

    // If we already have the full conversation data, no need to fetch again
    if (fullConversationData[bottleId]) {
      return
    }

    // Fetch full conversation data
    setLoadingFullConversation(bottleId)
    try {
      const replies = await readBottleReplies(bottleId)
      updateFullConversationData(bottleId, replies || [])
    } catch (error) {
      console.error('Error loading full conversation:', error)
      updateFullConversationData(bottleId, [])
    } finally {
      setLoadingFullConversation(null)
    }
  }

  const isInitialLoading = (repliesLoading || contractLoading) && conversations.length === 0 && !isDataLoaded
  const hasData = conversations.length > 0

  if (!isConnected) {
    return (
      <>
        <Navbar />
        
        
        <main className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
          <div className="glass rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl text-white mb-4">请连接钱包</h3>
            <p className="text-ocean-200 mb-6">
              你需要连接Web3钱包才能查看自己的回复记录
            </p>
          </div>
        </main>
      </>
    )
  }

  if (isInitialLoading || isLoadingDetails || isRefreshing) {
    return (
      <>
        <Navbar />
        
        
        
        <main className="min-h-screen pt-24 pb-12 px-4 page-transition">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">共鸣足迹</h1>
              <p className="text-xl text-ocean-200">
                {isRefreshing ? '🔄 正在刷新数据...' : '正在加载你的回复记录...'}
              </p>
            </div>
            
            {/* Loading skeleton */}
            <ConversationListSkeleton />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      
      
      <main className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">共鸣足迹</h1>
              <p className="text-xl text-ocean-200">
                重温你在数字海洋中建立的有意义的连接
              </p>
            </div>
            
            {/* Refresh Button */}
            {isConnected && (
              <div className="ml-4">
                <CompactRefreshButton 
                  onRefresh={handleManualRefresh}
                  className="!text-ocean-300 hover:!text-white"
                />
              </div>
            )}
          </div>
          
          <div className="relative">
            {/* Background update indicator */}
            {backgroundUpdate && (
              <div className="absolute top-0 right-0 bg-green-500/20 border border-green-400/30 rounded-lg px-3 py-1 text-green-300 text-sm animate-pulse">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-ping"></span>
                数据已更新
              </div>
            )}
            
            {/* Cache indicator */}
            {isPlaceholderData && conversations.length > 0 && (
              <div className="absolute top-0 left-0 bg-blue-500/20 border border-blue-400/30 rounded-lg px-3 py-1 text-blue-300 text-sm">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                来自缓存
              </div>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <h3 className="text-xl text-white mb-4">还没有对话</h3>
              <p className="text-ocean-200 mb-6">
                你还没有回复任何消息。开始探索并与他人连接吧！
              </p>
              <button
                onClick={() => router.push('/receive')}
                className="inline-block bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                捕捞回音
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {conversations.map((conversation) => (
                <div key={conversation.bottleId} className="glass rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">💬</span>
                      <div>
                        <h3 className="text-white font-medium">消息 #{conversation.bottleId}</h3>
                        <p className="text-ocean-300 text-sm">
                          原始: {formatTimestamp(conversation.originalTimestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-white text-sm">{conversation.replyCount} 条回复</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        conversation.isActive 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {conversation.isActive ? '活跃' : '非活跃'}
                      </div>
                    </div>
                  </div>

                  {/* Original Message */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-ocean-400 text-sm">来自以下用户的原始消息</span>
                      <span className="text-ocean-300 text-sm font-mono">{conversation.originalSender}</span>
                    </div>
                    <div className="bg-ocean-800/30 rounded-lg p-4">
                      <p className="text-white leading-relaxed">&ldquo;{conversation.originalContent}&rdquo;</p>
                    </div>
                  </div>

                  {/* My Reply */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-coral-400 text-sm">你的回复</span>
                      <span className="text-ocean-400 text-sm">• {formatTimestamp(conversation.myReplyTimestamp)}</span>
                    </div>
                    <div className="bg-coral-500/10 border border-coral-500/30 rounded-lg p-4">
                      <p className="text-white leading-relaxed">&ldquo;{conversation.myReply}&rdquo;</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleViewConversation(conversation.bottleId)}
                      className="text-ocean-400 hover:text-ocean-300 text-sm transition-colors duration-200"
                    >
                      {selectedConversation === conversation.bottleId ? '隐藏' : '查看'} 完整对话
                    </button>
                    
                    <div className="text-ocean-300 text-sm">
                      最后活动: {formatTimestamp(Math.max(conversation.originalTimestamp, conversation.myReplyTimestamp))}
                    </div>
                  </div>

                  {/* Expanded Conversation View */}
                  {selectedConversation === conversation.bottleId && (
                    <div className="mt-6 pt-6 border-t border-ocean-700">
                      <h4 className="text-white font-medium mb-4 flex items-center">
                        <span className="mr-2">💬</span>
                        完整对话线程
                      </h4>
                      
                      {loadingFullConversation === conversation.bottleId ? (
                        <div className="bg-ocean-900/50 rounded-lg p-6 text-center">
                          <LoadingIndicator size="sm" text="加载对话中..." />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {fullConversationData[conversation.bottleId]?.length > 0 ? (
                            <>
                              <div className="text-ocean-300 text-sm mb-3">
                                共 {fullConversationData[conversation.bottleId].length} 条回复
                              </div>
                              {fullConversationData[conversation.bottleId].map((reply: any, index: number) => {
                                const isMyReply = reply.replier?.toLowerCase() === address?.toLowerCase()
                                const replyContent = reply.content || '回复内容不可用'
                                const replyTimestamp = typeof reply.timestamp === 'bigint' 
                                  ? Number(reply.timestamp) * 1000 
                                  : Number(reply.timestamp)
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`p-4 rounded-lg ${
                                      isMyReply 
                                        ? 'bg-coral-500/10 border border-coral-500/30 ml-8' 
                                        : 'bg-ocean-800/30 mr-8'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`text-sm font-medium ${
                                        isMyReply ? 'text-coral-400' : 'text-ocean-400'
                                      }`}>
                                        {isMyReply ? '你' : '匿名用户'}
                                      </span>
                                      <span className="text-ocean-300 text-xs">
                                        {formatTimestamp(replyTimestamp)}
                                      </span>
                                    </div>
                                    <p className="text-white leading-relaxed">
                                      {replyContent}
                                    </p>
                                  </div>
                                )
                              })}
                            </>
                          ) : (
                            <div className="bg-ocean-900/50 rounded-lg p-6 text-center">
                              <p className="text-ocean-300 text-sm">
                                此对话目前只有原始消息和你的回复
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-ocean-300 text-sm">
              ✨ 每一次对话都是数字海洋中心灵之间的桥梁
            </p>
          </div>
        </div>
      </main>
    </>
  )
}