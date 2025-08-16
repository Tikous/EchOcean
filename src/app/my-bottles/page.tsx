'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { useDriftBottle } from '@/hooks/useDriftBottle'
import { usePersistentBottleState } from '@/hooks/usePersistentState'
import { useReadContract } from 'wagmi'
import { DRIFT_BOTTLE_CONTRACT_ADDRESS, DRIFT_BOTTLE_ABI } from '@/lib/web3'
import { BottleListSkeleton } from '@/components/LoadingIndicator'
import { WalletConnectionRequired } from '@/components/WalletConnectionStatus'
import { RefreshButton, CompactRefreshButton } from '@/components/RefreshButton'
import { DataCacheManager } from '@/lib/dataCache'
import toast from 'react-hot-toast'
import type { BottleData, ReplyData } from '@/lib/dataCache'

// Use types from dataCache for consistency
type Bottle = BottleData
type Reply = ReplyData

export default function MyBottlesPage() {
  const [selectedBottle, setSelectedBottle] = useState<number | null>(null)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()
  const { isConnected, address, isLoading: contractLoading, readBottleData, readBottleReplies, replyToBottle } = useDriftBottle()
  const cacheManager = DataCacheManager.getInstance()
  
  // Use persistent state management for bottles data
  const {
    bottles,
    replies,
    canReplyTo,
    isDataLoaded,
    setBottles,
    setReplies,
    setCanReplyTo,
    updateBottle,
    updateBottleReplies,
    updateCanReplyTo,
    mergeFreshData,
    clearData
  } = usePersistentBottleState(address)

  // Get user's bottles from the blockchain with optimized caching
  const { data: userBottleIds, isLoading: bottlesLoading, isPlaceholderData } = useReadContract({
    address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
    abi: DRIFT_BOTTLE_ABI,
    functionName: 'getUserBottles',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!DRIFT_BOTTLE_CONTRACT_ADDRESS && !!address && isConnected,
      // Optimized for faster navigation with immediate cache display
      staleTime: 1000 * 60 * 5, // 5 minutes - longer cache to reduce refetches
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer for navigation
      refetchOnMount: false, // Don't refetch on mount, use cache first
      refetchOnWindowFocus: false, // Prevent focus refetches that cause flickering
      placeholderData: (previousData) => previousData, // Keep previous data while refetching
      // Better deduplication for rapid navigation
      structuralSharing: true,
      notifyOnChangeProps: ['data', 'error'], // Reduce notifications to prevent rerenders
    },
  })

  useEffect(() => {
    if (userBottleIds && Array.isArray(userBottleIds)) {
      const bottleIds = userBottleIds.map(id => typeof id === 'bigint' ? Number(id) : Number(id))
      
      // Always load bottle details when userBottleIds are available
      // This ensures data is loaded even when coming back from other pages
      if (bottleIds.length > 0) {
        loadBottleDetails(bottleIds)
      } else {
        // Handle empty bottle list
        clearData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBottleIds, address, isConnected])

  const loadBottleDetails = async (bottleIds: number[]) => {
    if (!isConnected || !address || bottleIds.length === 0) {
      clearData()
      return
    }

    // Check if we already have all the required bottles to avoid unnecessary reloading
    const existingBottleIds = bottles.map(b => b.id).sort()
    const requiredBottleIds = bottleIds.sort()
    const hasAllBottles = existingBottleIds.length === requiredBottleIds.length && 
      existingBottleIds.every((id, index) => id === requiredBottleIds[index])
    
    if (hasAllBottles && bottles.length > 0) {
      console.log('Bottles already loaded, skipping reload')
      return
    }

    try {
      console.log('正在加载用户漂流瓶详情...', bottleIds)
      
      // Progressive loading - load bottles one by one for faster perceived performance
      const loadBottleProgressively = async (bottleId: number) => {
        try {
          // Get bottle details directly from blockchain with enhanced error handling
          const bottleData = await readBottleData(bottleId)
          if (!bottleData) {
            console.warn(`跳过瓶子 ${bottleId}: 数据不可用 (可能已被删除或不存在)`)
            return
          }
          
          // Get bottle replies directly from blockchain
          const bottleReplies = await readBottleReplies(bottleId)
          
          // Process replies for UI with enhanced error handling
          const processedReplies: Reply[] = Array.isArray(bottleReplies) 
            ? bottleReplies.map((reply: any, index: number) => {
                try {
                  return {
                    id: index,
                    content: (reply.content || reply[1] || '').toString().replace(/^["""]+|["""]+$/g, ''),
                    timestamp: (() => {
                      const rawTs = reply.timestamp || reply[2] || Date.now();
                      const ts = typeof rawTs === 'bigint' ? Number(rawTs) : Number(rawTs);
                      return ts > 0 ? (ts < 1e12 ? ts * 1000 : ts) : Date.now();
                    })(),
                    replier: (reply.replier || reply[0] || 'Anonymous').toString()
                  }
                } catch (error) {
                  console.warn(`处理回复 ${index} 时出错:`, error)
                  return {
                    id: index,
                    content: '回复数据解析失败',
                    timestamp: Date.now(),
                    replier: 'Anonymous'
                  }
                }
              }).filter(reply => reply.content && reply.content !== '回复数据解析失败')
            : []
          
          // Store replies using persistent state
          if (processedReplies.length > 0) {
            updateBottleReplies(bottleId, processedReplies)
            
            // Check if user can reply (last reply should not be from current user)
            const lastReply = processedReplies[processedReplies.length - 1]
            const canReply = lastReply.replier !== address
            updateCanReplyTo(bottleId, canReply)
          } else {
            // No replies yet, user can reply
            updateCanReplyTo(bottleId, true)
          }
          
          // Process bottle data with enhanced error handling
          const bottle: Bottle = (() => {
            try {
              return {
                id: bottleId,
                content: (bottleData.content || bottleData[2] || '').toString().replace(/^["""]+|["""]+$/g, ''),
                timestamp: (() => {
                  const rawTs = bottleData.timestamp || bottleData[3] || 0;
                  const ts = typeof rawTs === 'bigint' ? Number(rawTs) : Number(rawTs);
                  return ts > 0 ? (ts < 1e12 ? ts * 1000 : ts) : Date.now();
                })(),
                replyCount: processedReplies.length,
                isActive: bottleData.isActive !== false, // Default to true if undefined
                sender: (bottleData.sender || bottleData[1] || address || '').toString()
              }
            } catch (error) {
              console.warn(`处理瓶子 ${bottleId} 数据时出错:`, error)
              return {
                id: bottleId,
                content: '瓶子数据解析失败',
                timestamp: Date.now(),
                replyCount: 0,
                isActive: false,
                sender: address || ''
              }
            }
          })()

          // Add bottle immediately when loaded for progressive display (skip failed parses)
          if (bottle.content !== '瓶子数据解析失败') {
            setBottles(prev => {
              const filtered = prev.filter(b => b.id !== bottleId)
              const updated = [...filtered, bottle]
              return updated.sort((a, b) => b.timestamp - a.timestamp)
            })
          } else {
            console.warn(`跳过瓶子 ${bottleId}: 数据解析失败`)
          }
        } catch (error) {
          console.error(`Error loading bottle ${bottleId}:`, error)
        }
      }

      // Load bottles progressively instead of waiting for all
      bottleIds.forEach(bottleId => {
        loadBottleProgressively(bottleId)
      })
    } catch (error) {
      console.error('Error loading bottle details:', error)
      clearData()
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

  const handleDeactivateBottle = async (bottleId: number) => {
    if (!confirm('你确定要停用这个消息吗？此操作无法撤销。')) {
      return
    }
    
    try {
      console.log('停用消息:', bottleId)
      
      // TODO: This feature would require a contract function to deactivate bottles
      // For now, just update local state as a temporary solution
      console.warn('Deactivate bottle contract function not yet implemented')
      
      // Update local state using persistent state
      updateBottle(bottleId, { isActive: false })
      
      toast.success('海中消息已标记为停用')
    } catch (error) {
      console.error('Error deactivating bottle:', error)
      toast.error('停用消息失败')
    }
  }

  const handleReply = async (bottleId: number) => {
    if (!replyText.trim()) {
      toast.error('请输入回复内容')
      return
    }

    try {
      console.log('回复涟漪:', bottleId, replyText)
      
      // Send reply to blockchain
      await replyToBottle(bottleId, replyText)
      
      toast.success('回复已发送！')
      
      // Clear reply form
      setReplyText('')
      setReplyingTo(null)
      
      // Refresh the bottle data to get updated replies
      const bottleReplies = await readBottleReplies(bottleId)
      const processedReplies: Reply[] = Array.isArray(bottleReplies) 
        ? bottleReplies.map((reply: any, index: number) => ({
            id: index,
            content: reply.content || reply[1] || '',
            timestamp: (() => {
              const rawTs = reply.timestamp || reply[2] || Date.now();
              const ts = typeof rawTs === 'bigint' ? Number(rawTs) : Number(rawTs);
              return ts > 0 ? (ts < 1e12 ? ts * 1000 : ts) : Date.now();
            })(),
            replier: reply.replier || reply[0] || 'Anonymous'
          }))
        : []
      
      // Update replies and reply count using persistent state
      updateBottleReplies(bottleId, processedReplies)
      updateBottle(bottleId, { replyCount: processedReplies.length })
      
      // Update reply permissions
      if (processedReplies.length > 0) {
        const lastReply = processedReplies[processedReplies.length - 1]
        const canReply = lastReply.replier !== address
        updateCanReplyTo(bottleId, canReply)
      }
      
    } catch (error) {
      console.error('Error replying to bottle:', error)
      toast.error('发送回复失败: ' + (error as Error).message)
    }
  }

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!address || !isConnected) return
    
    setIsRefreshing(true)
    try {
      console.log('🔄 手动刷新我的涟漪数据')
      
      // Clear cache and reload fresh data
      clearData()
      
      // Force refetch from blockchain
      const bottleIds = userBottleIds?.map(id => typeof id === 'bigint' ? Number(id) : Number(id)) || []
      if (bottleIds.length > 0) {
        await loadBottleDetails(bottleIds)
      }
      
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

  // Improved loading logic to prevent flickering
  const isLoading = bottlesLoading && !isDataLoaded && bottles.length === 0 && !isRefreshing
  const showSkeleton = isLoading || (isRefreshing && bottles.length === 0)

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen pt-24 pb-12 px-4 page-transition">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">我的涟漪</h1>
              <p className="text-ocean-200">追踪你的涟漪，感受它们在数字海洋中产生的回响</p>
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

          <WalletConnectionRequired>
            {showSkeleton ? (
              <div className="space-y-6">
                <BottleListSkeleton />
                {isRefreshing && (
                  <div className="text-center">
                    <p className="text-ocean-300 text-sm">🔄 正在刷新数据...</p>
                  </div>
                )}
              </div>
            ) : bottles.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <h3 className="text-xl text-white mb-4">还没有投递心声</h3>
                <p className="text-ocean-200 mb-6">
                  你还没有向海洋中投递任何心声。开始分享你的想法吧！
                </p>
                <button
                  onClick={() => router.push('/send')}
                  className="inline-block bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer"
                >
                  投递你的第一个心声
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {bottles.map((bottle) => (
                  <div key={bottle.id} className="glass rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="text-white font-medium">涟漪 #{bottle.id}</h3>
                          <p className="text-ocean-300 text-sm">{formatTimestamp(bottle.timestamp)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-coral-400">💬</span>
                          <span className="text-white text-sm">{bottle.replyCount}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          bottle.isActive 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {bottle.isActive ? '活跃' : '非活跃'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-ocean-800/30 rounded-lg p-4 mb-4">
                      <p className="text-white leading-relaxed">&ldquo;{bottle.content}&rdquo;</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-3">
                        {bottle.replyCount > 0 && (
                          <button
                            onClick={() => setSelectedBottle(selectedBottle === bottle.id ? null : bottle.id)}
                            className="text-ocean-400 hover:text-ocean-300 text-sm transition-colors duration-200"
                          >
                            {selectedBottle === bottle.id ? '隐藏回复' : `查看回复 (${bottle.replyCount})`}
                          </button>
                        )}
                      </div>
                      
                      {bottle.isActive && (
                        <button
                          onClick={() => handleDeactivateBottle(bottle.id)}
                          className="text-red-400 hover:text-red-300 text-sm transition-colors duration-200"
                        >
                          停用
                        </button>
                      )}
                    </div>

                    {/* Replies Section */}
                    {selectedBottle === bottle.id && (
                      <div className="mt-6 pt-6 border-t border-ocean-700">
                        {replies[bottle.id] && replies[bottle.id].length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-white font-medium mb-4">回复</h4>
                            <div className="space-y-4">
                              {replies[bottle.id].map((reply) => (
                                <div key={reply.id} className="bg-ocean-900/50 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-ocean-300 text-sm">{reply.replier}</span>
                                    <span className="text-ocean-400 text-xs">
                                      {formatTimestamp(reply.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-ocean-100">&ldquo;{reply.content}&rdquo;</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Reply Form */}
                        {bottle.replyCount > 0 && (
                          <div className="mt-6">
                            {canReplyTo[bottle.id] ? (
                              replyingTo === bottle.id ? (
                                <div className="space-y-4">
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="回复其他探索者的发言..."
                                    className="w-full h-24 px-4 py-3 bg-ocean-800/50 border border-ocean-600 rounded-lg text-white placeholder-ocean-300 focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent resize-none"
                                    maxLength={500}
                                  />
                                  <div className="flex items-center justify-between">
                                    <span className="text-ocean-300 text-sm">
                                      {replyText.length}/500 字符
                                    </span>
                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() => {
                                          setReplyingTo(null)
                                          setReplyText('')
                                        }}
                                        className="px-4 py-2 text-ocean-300 hover:text-white text-sm transition-colors duration-200"
                                      >
                                        取消
                                      </button>
                                      <button
                                        onClick={() => handleReply(bottle.id)}
                                        disabled={!replyText.trim() || contractLoading}
                                        className="px-6 py-2 bg-coral-500 hover:bg-coral-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-medium rounded-lg transition-colors duration-200"
                                      >
                                        {contractLoading ? '发送中...' : '发送回复'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setReplyingTo(bottle.id)}
                                  className="text-coral-400 hover:text-coral-300 text-sm font-medium transition-colors duration-200"
                                >
                                  💬 回复参与对话
                                </button>
                              )
                            ) : (
                              <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3 text-center">
                                <p className="text-orange-300 text-sm">
                                  等待其他人回复后可以继续参与对话
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
                ✨ 你的涟漪在回响洋流中传播，连接着心灵的共鸣
              </p>
            </div>
          </WalletConnectionRequired>
        </div>
      </main>
    </>
  )
}