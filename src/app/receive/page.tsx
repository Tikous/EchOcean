'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { SearchIcon, MessageIcon, SkipIcon } from '@/components/icons'
import { useDriftBottle } from '@/hooks/useDriftBottle'
import { useReadContract } from 'wagmi'
import { DRIFT_BOTTLE_CONTRACT_ADDRESS, DRIFT_BOTTLE_ABI } from '@/lib/web3'
import { BottleDiscoverySkeleton, OceanLoadingIndicator } from '@/components/LoadingIndicator'
import { WalletConnectionRequired } from '@/components/WalletConnectionStatus'
import toast from 'react-hot-toast'

interface BottleData {
  id: number
  content: string
  timestamp: number
  sender: string
  replies?: Reply[]
}

interface Reply {
  id: number
  content: string
  timestamp: number
  replier: string
}

export default function ReceivePage() {
  const [currentBottle, setCurrentBottle] = useState<BottleData | null>(null)
  const [reply, setReply] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [lastBottleHash, setLastBottleHash] = useState<string>('')
  const [isRemoving, setIsRemoving] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [canReply, setCanReply] = useState<boolean>(true)
  const [replyBlockReason, setReplyBlockReason] = useState<string>('')
  
  const { 
    isConnected, 
    isConnecting,
    isConnectionStable,
    address, 
    getRandomBottle, 
    replyToBottle, 
    skipBottle, 
    isLoading: contractLoading,
    hash,
    isConfirmed,
    readBottleData,
    readBottleReplies,
    estimateReplyGas
  } = useDriftBottle()

  const findBottle = async (retryCount = 0) => {
    if (!isConnected || !isConnectionStable) {
      toast.error('请先连接钱包并等待连接稳定')
      return
    }

    if (isSearching && retryCount === 0) {
      return // 防止重复点击（但允许自动重试）
    }

    if (retryCount === 0) {
      setIsSearching(true)
    }
    
    try {
      console.log('寻找随机回音...', retryCount > 0 ? `(重试 ${retryCount})` : '')
      
      // Call the view function to get a random bottle ID (no gas cost!)
      const bottleId = await getRandomBottle()
      console.log(`获取到随机瓶子 #${bottleId}`)
      
      // Check if this is user's own bottle by reading bottle data first
      const bottleData = await readBottleData(bottleId)
      if (bottleData && (bottleData.sender === address || bottleData[1] === address)) {
        console.log('检测到自己的瓶子，自动重试...')
        
        // Auto retry up to 3 times to find someone else's bottle
        if (retryCount < 3) {
          toast('🎲 找到了你自己的瓶子，继续寻找其他回音...', {
            duration: 2000,
            icon: '🔄'
          })
          
          setTimeout(() => {
            findBottle(retryCount + 1)
          }, 1000)
          return
        } else {
          // After 3 retries, show the bottle anyway but user will get friendly error when trying to reply
          toast('🎲 多次尝试后仍找到自己的瓶子，你可以选择跳过', {
            duration: 3000
          })
        }
      }
      
      // Fetch and display the bottle data
      await fetchBottleData(bottleId)
      
    } catch (error) {
      console.error('Error finding bottle:', error)
      
      let errorMessage = '寻找回音失败'
      
      if ((error as Error).message.includes('No bottles available')) {
        errorMessage = '🌊 海洋中还没有回音\n\n💡 成为第一个投递心声的人吧！\n点击导航栏的"投递心声"来投递你的第一个心声'
      } else if ((error as Error).message.includes('Cannot view your own bottle')) {
        // This should be handled above, but keep as fallback
        if (retryCount < 3) {
          toast('🎲 找到了你自己的瓶子，继续寻找其他回音...', {
            duration: 2000,
            icon: '🔄'
          })
          setTimeout(() => {
            findBottle(retryCount + 1)
          }, 1000)
          return
        } else {
          errorMessage = '🎲 多次尝试后仍找到自己的瓶子\n\n请手动再试一次！'
        }
      } else if ((error as Error).message.includes('user rejected')) {
        errorMessage = '操作已取消'
      } else {
        errorMessage += ': ' + (error as Error).message
      }
      
      if (errorMessage.includes('🌊 海洋中还没有回音')) {
        toast('🌊 海洋中还没有回音\n\n💡 成为第一个投递心声的人吧！')
      } else if (errorMessage.includes('🎲 多次尝试后仍找到自己的瓶子')) {
        toast('🎲 多次尝试后仍找到自己的瓶子，请手动再试一次！')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      if (retryCount === 0) {
        setIsSearching(false)
      }
    }
  }

  // Check if user can reply to this bottle
  const checkReplyPermissions = (bottleData: BottleData) => {
    // Reset states
    setCanReply(true)
    setReplyBlockReason('')

    // If it's user's own bottle, they can't reply to it
    if (bottleData.sender === address) {
      setCanReply(false)
      setReplyBlockReason('不能回复自己的心声')
      return
    }

    // If there are replies, check if the last reply is from current user
    if (bottleData.replies && bottleData.replies.length > 0) {
      const lastReply = bottleData.replies[bottleData.replies.length - 1]
      if (lastReply.replier === address) {
        setCanReply(false)
        setReplyBlockReason('等待其他探索者的回音...')
        return
      }
    }

    // All checks passed
    setCanReply(true)
    setReplyBlockReason('')
  }

  // Fetch bottle data directly using bottle ID (no transaction needed!)
  const fetchBottleData = async (bottleId: number, retryCount = 0) => {
    try {
      console.log(`开始获取瓶子详细数据，ID: ${bottleId}`)
      
      // Fetch bottle details directly from blockchain (read-only, no gas cost)
      const bottleData = await readBottleData(bottleId)
      
      if (!bottleData) {
        // Retry up to 3 times with exponential backoff
        if (retryCount < 2) {
          const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s
          console.log(`将在 ${delay}ms 后重试获取瓶子数据...`)
          
          setTimeout(() => {
            fetchBottleData(bottleId, retryCount + 1)
          }, delay)
          return
        }
        
        throw new Error(`无法从区块链获取瓶子 ${bottleId} 的详细数据`)
      }
      
      console.log('✅ 成功获取瓶子数据:', bottleData)
      
      // Parse bottle data with better error handling
      const rawContent = bottleData?.content || bottleData?.[2] || '';
      
      // Get all replies for this bottle
      const bottleReplies = await readBottleReplies(bottleId);
      const replies: Reply[] = Array.isArray(bottleReplies) 
        ? bottleReplies.map((reply: any, index: number) => ({
            id: index,
            content: (reply.content || reply[1] || '').replace(/^["""]+|["""]+$/g, ''),
            timestamp: (() => {
              const rawTs = reply.timestamp || reply[2] || Date.now();
              const ts = typeof rawTs === 'bigint' ? Number(rawTs) : Number(rawTs);
              return ts > 0 ? (ts < 1e12 ? ts * 1000 : ts) : Date.now();
            })(),
            replier: reply.replier || reply[0] || 'Anonymous'
          }))
        : [];

      const parsedBottleData: BottleData = {
        id: bottleId,
        content: rawContent.replace(/^["""]+|["""]+$/g, ''), // Remove decorative quotes
        timestamp: (() => {
          const rawTs = bottleData?.timestamp || bottleData?.[3] || 0;
          const ts = typeof rawTs === 'bigint' ? Number(rawTs) : Number(rawTs);
          // If timestamp is in seconds, convert to milliseconds
          return ts > 0 ? (ts < 1e12 ? ts * 1000 : ts) : Date.now();
        })(),
        sender: bottleData?.sender || bottleData?.[1] || 'Anonymous',
        replies: replies
      };
      
      console.log('解析后的瓶子数据（包含回复）:', parsedBottleData);
      
      // Check reply permissions
      checkReplyPermissions(parsedBottleData);
      
      setCurrentBottle(parsedBottleData);
      
      console.log('✅ 回音数据设置完成 - 无gas费用！')
      
    } catch (error) {
      console.error('获取回音数据失败:', error)
      
      let errorMessage = '获取回音详情失败'
      if (error instanceof Error) {
        errorMessage += ': ' + error.message
      }
      
      toast.error(errorMessage)
    }
  }

  const handleReply = async () => {
    if (!reply.trim() || !currentBottle) return
    
    try {
      console.log('回复回音:', currentBottle.id, reply)
      
      // Estimate gas and show user the cost
      const gasInfo = await estimateReplyGas(currentBottle.id, reply)
      
      // Check if this is user's own bottle
      if (gasInfo && 'error' in gasInfo && gasInfo.error === 'OWN_BOTTLE') {
        toast('🎲 这是你自己的瓶子，为你寻找其他回音...', {
          duration: 3000,
          icon: '🔄'
        })
        
        // Auto skip to find another bottle
        setTimeout(async () => {
          setIsRemoving(true)
          setTimeout(() => {
            setCurrentBottle(null)
            setShowReplyForm(false)
            setReply('')
            setIsRemoving(false)
            // Automatically find a new bottle
            findBottle()
          }, 300)
        }, 1000)
        return
      }
      
      if (gasInfo && 'estimatedCostInETH' in gasInfo && gasInfo.estimatedCostInETH !== undefined && gasInfo.estimatedCostInETH > 0.015) {
        toast.error(
          `⚠️ 预估gas费用较高: ${gasInfo.estimatedCostInETH.toFixed(4)} ETH\n\n请确认后再次点击发送`,
          { duration: 5000 }
        )
        return
      } else if (gasInfo && 'estimatedCostInETH' in gasInfo && gasInfo.estimatedCostInETH !== undefined) {
        toast.success(
          `💰 预估gas费用: ${gasInfo.estimatedCostInETH.toFixed(4)} ETH`,
          { duration: 3000 }
        )
      }
      
      // Use the real blockchain contract to reply
      await replyToBottle(currentBottle.id, reply)
      
      toast.success('回复已发送到区块链！💬')
      setReply('')
      setShowReplyForm(false)
      
      // Smooth removal animation
      setIsRemoving(true)
      setTimeout(() => {
        setCurrentBottle(null)
        setIsRemoving(false)
      }, 300) // Wait for animation to complete
    } catch (error) {
      console.error('Error replying to bottle:', error)
      
      // Check if the actual reply also failed due to own bottle
      const errorMessage = (error as Error).message
      if (errorMessage.includes('Cannot reply to your own bottle')) {
        toast('🎲 这是你自己的瓶子，为你寻找其他回音...', {
          duration: 3000,
          icon: '🔄'
        })
        
        // Auto skip to find another bottle
        setTimeout(async () => {
          setIsRemoving(true)
          setTimeout(() => {
            setCurrentBottle(null)
            setShowReplyForm(false)
            setReply('')
            setIsRemoving(false)
            // Automatically find a new bottle
            findBottle()
          }, 300)
        }, 1000)
        return
      }
      
      toast.error('发送回复失败: ' + errorMessage)
    }
  }

  const handleSkip = async () => {
    if (!currentBottle) return
    
    try {
      console.log('跳过回音:', currentBottle.id)
      
      // No blockchain transaction needed - just skip locally (free!)
      // This makes skip operation consistent with the free getRandomBottle
      
      // Smooth removal animation
      setIsRemoving(true)
      setTimeout(() => {
        setCurrentBottle(null)
        setShowReplyForm(false)
        setReply('')
        setIsRemoving(false)
      }, 300) // Wait for animation to complete
      
    } catch (error) {
      console.error('Error skipping bottle:', error)
      toast.error('跳过回音失败: ' + (error as Error).message)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    try {
      // Validate timestamp
      if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
        return '刚刚';
      }
      
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '时间未知';
      }
      
      const now = Date.now();
      const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
      
      if (diffInMinutes < 1) return '刚刚';
      if (diffInMinutes < 60) return `${diffInMinutes} 分钟前`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} 小时前`;
      if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} 天前`;
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      console.error('时间格式化错误:', error);
      return '时间未知';
    }
  }


  return (
    <>
      <Navbar />
      
      <main className="min-h-screen pt-24 pb-12 px-4 page-transition">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">探索海洋</h1>
            <p className="text-ocean-200 text-lg">
              在区块链海洋中发现来自同行者的珍贵消息
            </p>
          </div>

          <WalletConnectionRequired>
            {!currentBottle ? (
            <div className="glass rounded-xl p-8 text-center">
              <div className="mb-6">
                <p className="text-ocean-200 mb-6">
                  浩瀚的海洋中，有无数回音等待被发现
                </p>
              </div>

              <button
                onClick={() => findBottle()}
                disabled={contractLoading || isSearching}
                className="bg-coral-500 hover:bg-coral-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 ripple-effect hover:shadow-lg hover:shadow-coral-500/25"
              >
                {(contractLoading || isSearching) ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>正在搜寻海洋...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>捕捞回音</span>
                  </div>
                )}
              </button>

              <div className="mt-8 text-ocean-300 text-sm">
                <p>✨ 每次搜寻都会发现来自深海的独特消息</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bottle Display */}
              <div className={`glass rounded-xl p-8 transition-all duration-300 ${isRemoving ? 'opacity-0 scale-95 transform -translate-y-4' : 'opacity-100 scale-100 transform translate-y-0'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-ocean-200 text-sm">
                      回音 #{currentBottle.id}
                    </span>
                  </div>
                  <span className="text-ocean-300 text-xs">
                    {formatTimestamp(currentBottle.timestamp)}
                  </span>
                </div>

                <div className="bg-ocean-800/30 rounded-lg p-6 mb-6">
                  <p className="text-white text-lg leading-relaxed">
                    {currentBottle.content}
                  </p>
                </div>

                <div className="text-ocean-300 text-sm mb-6">
                  {currentBottle.sender === address ? (
                    <div className="flex items-center space-x-2">
                      <p className="text-coral-400 font-medium">✨ 我发送的</p>
                      <span className="px-2 py-1 bg-coral-500/20 border border-coral-500/30 rounded-full text-coral-300 text-xs">
                        重温自己的话语
                      </span>
                    </div>
                  ) : (
                    <p>来自: {currentBottle.sender}</p>
                  )}
                  {currentBottle.replies && currentBottle.replies.length > 0 && (
                    <p className="mt-2">💬 已有 {currentBottle.replies.length} 条回复</p>
                  )}
                </div>

                {/* Show existing replies if any */}
                {currentBottle.replies && currentBottle.replies.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-ocean-300 text-sm font-medium mb-3">💬 之前的回复</h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {currentBottle.replies.map((reply) => (
                        <div key={reply.id} className="bg-ocean-900/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-ocean-400 text-xs">{reply.replier}</span>
                            <span className="text-ocean-500 text-xs">
                              {formatTimestamp(reply.timestamp)}
                            </span>
                          </div>
                          <p className="text-ocean-100 text-sm leading-relaxed">&ldquo;{reply.content}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!showReplyForm ? (
                  <div className="space-y-3">
                    {!canReply && replyBlockReason && (
                      <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3 text-center">
                        <p className="text-orange-300 text-sm">
                          {replyBlockReason}
                        </p>
                      </div>
                    )}
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setShowReplyForm(true)}
                        disabled={!canReply}
                        className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ripple-effect ${
                          canReply 
                            ? 'bg-coral-500 hover:bg-coral-600 text-white hover:shadow-lg hover:shadow-coral-500/25 hover:scale-105' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        💬 回复
                      </button>
                      <button
                        onClick={handleSkip}
                        className="flex-1 bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ripple-effect hover:shadow-lg hover:shadow-coral-500/25 hover:scale-105"
                      >
                        ⏭️ 跳过
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="写下你对这个漂流瓶的回复..."
                      className="w-full h-32 px-4 py-3 bg-ocean-800/50 border border-ocean-600 rounded-lg text-white placeholder-ocean-300 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-transparent resize-none"
                      maxLength={1000}
                    />
                    <div className="text-right mb-2">
                      <span className="text-ocean-300 text-sm">
                        {reply.length}/1000 字符
                      </span>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleReply}
                        disabled={contractLoading || !reply.trim()}
                        className="flex-1 bg-coral-500 hover:bg-coral-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ripple-effect hover:shadow-lg hover:shadow-coral-500/25 hover:scale-105 disabled:hover:scale-100"
                      >
                        {contractLoading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>正在发送...</span>
                          </div>
                        ) : (
                          '发送回复'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowReplyForm(false)
                          setReply('')
                        }}
                        className="px-6 py-3 border border-coral-500 text-coral-200 hover:bg-coral-500/20 rounded-lg transition-colors duration-200"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </WalletConnectionRequired>
        </div>
      </main>
    </>
  )
}