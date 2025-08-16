'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { DRIFT_BOTTLE_CONTRACT_ADDRESS, DRIFT_BOTTLE_ABI, config } from '@/lib/web3'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  sanitizeBottleContent, 
  sanitizeReplyContent, 
  validateBottleId, 
  sanitizeBlockchainData,
  rateLimiter 
} from '@/lib/security'
import { driftBottleStorage } from '@/lib/secureStorage'
import { 
  handleError, 
  createValidationError, 
  createSecurityError, 
  createNetworkError,
  createBlockchainError,
  createRateLimitError,
  ErrorType 
} from '@/lib/errorHandling'
import { validateBottleData, validateReplyDataArray, sanitizeForDisplay } from '@/lib/typeValidation'

export function useDriftBottle() {
  const { address, isConnected, isConnecting, isReconnecting, status } = useAccount()
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStable, setConnectionStable] = useState(false)

  // Improved connection state with better validation
  const actuallyConnected = useMemo(() => {
    // More precise connection validation
    const hasValidAddress = !!address && address !== '0x' && address.length === 42
    const isProperlyConnected = isConnected && status === 'connected'
    const isNotConnecting = !isConnecting && !isReconnecting
    
    return hasValidAddress && isProperlyConnected && isNotConnecting
  }, [isConnected, address, status, isConnecting, isReconnecting])
  
  // More accurate connection loading state
  const connectionLoading = useMemo(() => {
    // Consider connection as loading only during actual connection attempts
    const isActuallyConnecting = isConnecting || isReconnecting
    const hasIncompleteConnection = isConnected && (!address || address === '0x' || status !== 'connected')
    
    return isActuallyConnecting || hasIncompleteConnection
  }, [isConnecting, isReconnecting, isConnected, address, status])
  
  // Optimized connection stability tracking to reduce loading flashes
  useEffect(() => {
    let stabilityTimer: NodeJS.Timeout
    
    if (actuallyConnected && !connectionLoading) {
      // Immediate stability for better UX - no artificial delay
      setConnectionStable(true)
      try {
        driftBottleStorage.setConnectionStable(true)
        driftBottleStorage.setLastConnectionTime(Date.now())
      } catch (error) {
        // Ignore storage errors to prevent connection issues
      }
    } else {
      setConnectionStable(false)
      try {
        driftBottleStorage.setConnectionStable(false)
      } catch (error) {
        // Ignore storage errors
      }
    }
    
    return () => {
      if (stabilityTimer) clearTimeout(stabilityTimer)
    }
  }, [actuallyConnected, connectionLoading])

  // Secure storage restoration
  useEffect(() => {
    // Only run once on mount to avoid triggering during navigation
    if (actuallyConnected) {
      try {
        const savedStableState = driftBottleStorage.getConnectionStable()
        if (savedStableState) {
          setConnectionStable(true)
        }
      } catch (error) {
        // Ignore storage errors
      }
    }
  }, []) // Remove actuallyConnected dependency to prevent navigation issues

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Read functions with stability checking
  const { data: bottleCount } = useReadContract({
    address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
    abi: DRIFT_BOTTLE_ABI,
    functionName: 'getBottleCount',
    query: {
      enabled: !!DRIFT_BOTTLE_CONTRACT_ADDRESS && actuallyConnected && connectionStable,
      staleTime: 300000, // 5 minute cache for blockchain data
      gcTime: 600000, // 10 minute garbage collection
      retry: 2, // Reasonable retries for reliability
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnMount: false, // Use cache when available
    },
  })

  const { data: activeBottleCount } = useReadContract({
    address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
    abi: DRIFT_BOTTLE_ABI,
    functionName: 'getActiveBottleCount',
    query: {
      enabled: !!DRIFT_BOTTLE_CONTRACT_ADDRESS && actuallyConnected && connectionStable,
      staleTime: 300000, // 5 minute cache for blockchain data
      gcTime: 600000, // 10 minute garbage collection
      retry: 2, // Reasonable retries for reliability
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnMount: false, // Use cache when available
    },
  })

  // Send bottle function with security validation and rate limiting
  const sendBottle = useCallback(async (content: string) => {
    if (!actuallyConnected || !connectionStable) {
      throw new Error('请先连接钱包并等待连接稳定')
    }

    if (!DRIFT_BOTTLE_CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured')
    }

    // Rate limiting check
    if (!rateLimiter.isAllowed(address || 'anonymous', 5, 60000)) {
      const rateLimitError = createRateLimitError(
        'SEND_RATE_LIMIT',
        'User exceeded send rate limit',
        '发送过于频繁，请稍后再试'
      )
      throw new Error(rateLimitError.userMessage)
    }

    let sanitizedContent: string
    try {
      // Sanitize and validate content
      sanitizedContent = sanitizeBottleContent(content)
    } catch (error) {
      const validationError = createValidationError(
        'CONTENT_VALIDATION_FAILED',
        `Content validation failed: ${(error as Error).message}`,
        `内容验证失败: ${(error as Error).message}`,
        error as Error,
        { originalContent: content.slice(0, 50) + '...' }
      )
      throw new Error(validationError.userMessage)
    }

    setIsLoading(true)
    try {
      await writeContract({
        address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
        abi: DRIFT_BOTTLE_ABI,
        functionName: 'sendBottle',
        args: [sanitizedContent],
      })
    } catch (err) {
      const blockchainError = createBlockchainError(
        'BOTTLE_SEND_FAILED',
        `Failed to send bottle: ${(err as Error).message}`,
        '发送瓶子失败，请稍后重试',
        err as Error,
        { sanitizedContent: sanitizedContent.slice(0, 50) + '...' }
      )
      console.error('Error sending bottle:', blockchainError)
      throw new Error(blockchainError.userMessage)
    } finally {
      setIsLoading(false)
    }
  }, [actuallyConnected, connectionStable, writeContract, address])

  // Get random bottle function with stability check
  const getRandomBottle = useCallback(async () => {
    if (!actuallyConnected || !connectionStable) {
      throw new Error('请先连接钱包并等待连接稳定')
    }

    if (!DRIFT_BOTTLE_CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured')
    }

    try {
      const { readContract } = await import('wagmi/actions')
      const result = await readContract(config, {
        address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
        abi: DRIFT_BOTTLE_ABI,
        functionName: 'getRandomBottle',
      })
      // Handle BigInt conversion properly
      return typeof result === 'bigint' ? Number(result) : Number(result)
    } catch (err) {
      console.error('Error getting random bottle:', err)
      throw err
    }
  }, [actuallyConnected, connectionStable])

  // Reply to bottle function with security validation and rate limiting
  const replyToBottle = useCallback(async (bottleId: number, content: string) => {
    if (!actuallyConnected || !connectionStable) {
      throw new Error('请先连接钱包并等待连接稳定')
    }

    if (!DRIFT_BOTTLE_CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured')
    }

    // Validate bottle ID
    if (!validateBottleId(bottleId)) {
      const validationError = createValidationError(
        'INVALID_BOTTLE_ID',
        `Invalid bottle ID: ${bottleId}`,
        '无效的瓶子ID',
        undefined,
        { bottleId }
      )
      throw new Error(validationError.userMessage)
    }

    // Rate limiting check for replies
    if (!rateLimiter.isAllowed(`${address || 'anonymous'}_reply`, 10, 60000)) {
      const rateLimitError = createRateLimitError(
        'REPLY_RATE_LIMIT',
        'User exceeded reply rate limit',
        '回复过于频繁，请稍后再试'
      )
      throw new Error(rateLimitError.userMessage)
    }

    let sanitizedContent: string
    try {
      // Sanitize and validate reply content
      sanitizedContent = sanitizeReplyContent(content)
    } catch (error) {
      const validationError = createValidationError(
        'REPLY_VALIDATION_FAILED',
        `Reply validation failed: ${(error as Error).message}`,
        `回复验证失败: ${(error as Error).message}`,
        error as Error,
        { originalContent: content.slice(0, 50) + '...', bottleId }
      )
      throw new Error(validationError.userMessage)
    }

    setIsLoading(true)
    try {
      await writeContract({
        address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
        abi: DRIFT_BOTTLE_ABI,
        functionName: 'replyToBottle',
        args: [BigInt(bottleId), sanitizedContent],
      })
    } catch (err) {
      const blockchainError = createBlockchainError(
        'BOTTLE_REPLY_FAILED',
        `Failed to reply to bottle: ${(err as Error).message}`,
        '回复瓶子失败，请稍后重试',
        err as Error,
        { bottleId, sanitizedContent: sanitizedContent.slice(0, 50) + '...' }
      )
      console.error('Error replying to bottle:', blockchainError)
      throw new Error(blockchainError.userMessage)
    } finally {
      setIsLoading(false)
    }
  }, [actuallyConnected, connectionStable, writeContract, address])

  // Gas estimation function with security validation
  const estimateReplyGas = useCallback(async (bottleId: number, content: string) => {
    if (!actuallyConnected || !connectionStable || !DRIFT_BOTTLE_CONTRACT_ADDRESS) {
      return null
    }

    // Validate bottle ID before gas estimation
    if (!validateBottleId(bottleId)) {
      return {
        error: 'INVALID_BOTTLE_ID',
        message: '无效的瓶子ID'
      }
    }

    let sanitizedContent: string
    try {
      // Sanitize content before gas estimation to prevent malicious payloads
      sanitizedContent = sanitizeReplyContent(content)
    } catch (error) {
      return {
        error: 'INVALID_CONTENT',
        message: `内容验证失败: ${(error as Error).message}`
      }
    }

    try {
      const { estimateGas, getGasPrice } = await import('wagmi/actions')
      
      // Use estimateGas with sanitized content
      const gasEstimate = await estimateGas(config, {
        to: DRIFT_BOTTLE_CONTRACT_ADDRESS,
        account: address as `0x${string}`,
        data: (() => {
          // Encode the function call manually with sanitized content
          const { encodeFunctionData } = require('viem')
          return encodeFunctionData({
            abi: DRIFT_BOTTLE_ABI,
            functionName: 'replyToBottle',
            args: [BigInt(bottleId), sanitizedContent],
          })
        })(),
      })

      const gasPrice = await getGasPrice(config)
      const estimatedCost = gasEstimate * gasPrice
      const estimatedCostInETH = Number(estimatedCost) / 1e18

      // Security checks to prevent overpaying
      const maxReasonableGasLimit = BigInt(500000) // 500k gas limit max for replies
      const maxReasonableGasPrice = BigInt(100000000000) // 100 Gwei max
      const maxReasonableCostInETH = 0.02 // 0.02 ETH max (~$40-80 depending on ETH price)

      // Check for suspiciously high gas estimates
      if (gasEstimate > maxReasonableGasLimit) {
        console.warn('Gas limit unusually high:', gasEstimate.toString())
        return {
          error: 'HIGH_GAS_LIMIT',
          message: '交易费用过高，可能存在问题',
          gasLimit: gasEstimate,
          gasPrice: gasPrice,
          estimatedCost: estimatedCost,
          estimatedCostInETH,
          warning: `Gas limit (${gasEstimate.toString()}) exceeds reasonable maximum (${maxReasonableGasLimit.toString()})`
        }
      }

      if (gasPrice > maxReasonableGasPrice) {
        console.warn('Gas price unusually high:', gasPrice.toString())
        return {
          error: 'HIGH_GAS_PRICE',
          message: '当前网络费用过高，建议稍后重试',
          gasLimit: gasEstimate,
          gasPrice: gasPrice,
          estimatedCost: estimatedCost,
          estimatedCostInETH,
          warning: `Gas price (${(Number(gasPrice) / 1e9).toFixed(2)} Gwei) exceeds reasonable maximum (${Number(maxReasonableGasPrice) / 1e9} Gwei)`
        }
      }

      if (estimatedCostInETH > maxReasonableCostInETH) {
        console.warn('Transaction cost unusually high:', estimatedCostInETH)
        return {
          error: 'HIGH_TRANSACTION_COST',
          message: '交易费用过高，建议稍后重试',
          gasLimit: gasEstimate,
          gasPrice: gasPrice,
          estimatedCost: estimatedCost,
          estimatedCostInETH,
          warning: `Estimated cost (${estimatedCostInETH.toFixed(4)} ETH) exceeds reasonable maximum (${maxReasonableCostInETH} ETH)`
        }
      }

      return {
        gasLimit: gasEstimate,
        gasPrice: gasPrice,
        estimatedCost: estimatedCost,
        estimatedCostInETH,
        // Add safety recommendations
        recommendations: {
          gasLimitBuffer: Math.round(Number(gasEstimate) * 1.1), // 10% buffer
          maxGasPriceGwei: Math.min(Number(gasPrice) / 1e9 * 1.2, 50), // 20% buffer, max 50 Gwei
          isReasonable: true
        }
      }
    } catch (error) {
      console.error('Gas estimation failed:', error)
      
      // Check if this is a "Cannot reply to your own bottle" error
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message)
        if (errorMessage.includes('Cannot reply to your own bottle') || 
            errorMessage.includes('execution reverted: Cannot reply to your own bottle')) {
          return {
            error: 'OWN_BOTTLE',
            message: '这是你自己发送的瓶子，不能回复自己的消息'
          }
        }
      }
      
      // Return a conservative default estimate if gas estimation fails
      const fallbackGasLimit = BigInt(150000) // Conservative fallback
      const fallbackGasPrice = BigInt(30000000000) // 30 Gwei fallback (slightly higher for reliability)
      const fallbackCost = fallbackGasLimit * fallbackGasPrice
      
      return {
        gasLimit: fallbackGasLimit,
        gasPrice: fallbackGasPrice,
        estimatedCost: fallbackCost,
        estimatedCostInETH: Number(fallbackCost) / 1e18,
        fallback: true,
        warning: 'Gas estimation failed, using conservative fallback values',
        recommendations: {
          gasLimitBuffer: Math.round(Number(fallbackGasLimit) * 1.2), // 20% buffer for fallbacks
          maxGasPriceGwei: 50, // Conservative max
          isReasonable: true
        }
      }
    }
  }, [actuallyConnected, connectionStable, address])

  // Skip bottle function with security validation
  const skipBottle = useCallback(async (bottleId: number) => {
    if (!actuallyConnected || !connectionStable) {
      throw new Error('请先连接钱包并等待连接稳定')
    }

    if (!DRIFT_BOTTLE_CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured')
    }

    // Validate bottle ID
    if (!validateBottleId(bottleId)) {
      throw new Error('无效的瓶子ID')
    }

    // Rate limiting for skip actions
    if (!rateLimiter.isAllowed(`${address || 'anonymous'}_skip`, 20, 60000)) {
      throw new Error('跳过操作过于频繁，请稍后再试')
    }

    setIsLoading(true)
    try {
      await writeContract({
        address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
        abi: DRIFT_BOTTLE_ABI,
        functionName: 'skipBottle',
        args: [BigInt(bottleId)],
      })
    } catch (err) {
      console.error('Error skipping bottle:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [actuallyConnected, connectionStable, writeContract, address])

  // Enhanced bottle data cache with LRU cleanup to prevent memory leaks
  const [bottleDataCache] = useState<Map<string, any>>(() => {
    const cache = new Map()
    const MAX_CACHE_SIZE = 100 // Limit cache size to prevent memory leaks
    
    // Override set method to implement LRU cleanup
    const originalSet = cache.set.bind(cache)
    cache.set = (key: string, value: any) => {
      if (cache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry (LRU behavior)
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
        console.log('🧹 缓存清理: 移除过期数据', firstKey)
      }
      return originalSet(key, value)
    }
    
    return cache
  })

  // Enhanced helper function to read bottle data with better error handling
  const readBottleData = useCallback(async (bottleId: number, retryCount = 0): Promise<any> => {
    // Enhanced validation with better error messages
    if (!bottleId || isNaN(bottleId) || bottleId <= 0) {
      console.warn(`readBottleData: Invalid bottleId ${bottleId}`)
      return null
    }

    if (!DRIFT_BOTTLE_CONTRACT_ADDRESS) {
      console.warn('readBottleData: Contract address not configured')
      return null
    }

    if (!actuallyConnected || !connectionStable) {
      console.warn('readBottleData: Wallet not connected or connection unstable', {
        connected: actuallyConnected,
        stable: connectionStable
      })
      return null
    }

    // Enhanced cache check with expiration
    const cacheKey = `bottle_${bottleId}`
    if (bottleDataCache.has(cacheKey)) {
      const cached = bottleDataCache.get(cacheKey)
      // Cache data for 5 minutes to balance freshness and performance
      if (cached && cached.timestamp && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
        console.log(`使用缓存数据: 瓶子 ${bottleId}`)
        return cached.data
      } else {
        // Remove expired cache
        bottleDataCache.delete(cacheKey)
      }
    }
    
    try {
      console.log(`读取瓶子数据: ID ${bottleId}${retryCount > 0 ? ` (重试 ${retryCount})` : ''}`)
      
      const { readContract } = await import('wagmi/actions')
      const result = await readContract(config, {
        address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
        abi: DRIFT_BOTTLE_ABI,
        functionName: 'getBottle',
        args: [BigInt(bottleId)],
        // Add timeout to prevent hanging requests
        blockTag: 'latest'
      })
      
      // Enhanced result validation
      if (!result) {
        console.warn(`空的瓶子数据: ID ${bottleId}`)
        return null
      }

      // Validate and sanitize blockchain data before caching
      const validatedResult = validateBottleData(result)
      if (!validatedResult) {
        console.warn(`瓶子 ${bottleId} 数据验证失败`)
        return null
      }
      
      const sanitizedResult = sanitizeBlockchainData(validatedResult)
      const displayData = sanitizeForDisplay(validatedResult)
      
      // Cache with timestamp for expiration tracking
      const cacheData = {
        data: displayData,
        timestamp: Date.now()
      }
      bottleDataCache.set(cacheKey, cacheData)
      
      console.log(`✅ 成功读取瓶子 ${bottleId}:`, displayData)
      return displayData
      
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      console.error(`❌ 读取瓶子 ${bottleId} 失败 (尝试 ${retryCount + 1}):`, errorMsg)
      
      // Handle specific error types
      if (errorMsg.includes('Bottle does not exist') || 
          errorMsg.includes('execution reverted') ||
          errorMsg.includes('invalid bottle') ||
          error?.code === 'CALL_EXCEPTION') {
        console.warn(`瓶子 ${bottleId} 不存在或无效`)
        return null
      }
      
      // Handle network/connection errors with exponential backoff
      const isNetworkError = errorMsg.includes('network') ||
                           errorMsg.includes('timeout') ||
                           errorMsg.includes('connection') ||
                           errorMsg.includes('fetch') ||
                           error?.code === 'NETWORK_ERROR' ||
                           error?.code === 'TIMEOUT'
      
      if (retryCount < 3 && isNetworkError) {
        const delay = Math.min(Math.pow(2, retryCount) * 1000, 8000) // Max 8s delay
        console.log(`网络错误，${delay}ms 后重试...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return readBottleData(bottleId, retryCount + 1)
      }
      
      // For non-retryable errors, return null but don't spam console
      if (retryCount === 0) {
        console.error(`瓶子 ${bottleId} 读取失败，已停止重试:`, errorMsg)
      }
      
      return null
    }
  }, [actuallyConnected, connectionStable, bottleDataCache])

  // Enhanced helper function to read bottle replies with better error handling
  const readBottleReplies = useCallback(async (bottleId: number, retryCount = 0): Promise<any[]> => {
    // Enhanced validation
    if (!bottleId || isNaN(bottleId) || bottleId <= 0) {
      console.warn(`readBottleReplies: Invalid bottleId ${bottleId}`)
      return []
    }

    if (!DRIFT_BOTTLE_CONTRACT_ADDRESS) {
      console.warn('readBottleReplies: Contract address not configured')
      return []
    }

    if (!actuallyConnected || !connectionStable) {
      console.warn('readBottleReplies: Wallet not connected or connection unstable')
      return []
    }

    // Check cache for replies
    const repliesCacheKey = `replies_${bottleId}`
    if (bottleDataCache.has(repliesCacheKey)) {
      const cached = bottleDataCache.get(repliesCacheKey)
      if (cached && cached.timestamp && (Date.now() - cached.timestamp) < 3 * 60 * 1000) { // 3 min cache
        console.log(`使用缓存回复数据: 瓶子 ${bottleId}`)
        return cached.data
      } else {
        bottleDataCache.delete(repliesCacheKey)
      }
    }
    
    try {
      console.log(`读取瓶子回复: ID ${bottleId}${retryCount > 0 ? ` (重试 ${retryCount})` : ''}`)
      
      const { readContract } = await import('wagmi/actions')
      
      // Get reply IDs for this bottle
      const replyIds = await readContract(config, {
        address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
        abi: DRIFT_BOTTLE_ABI,
        functionName: 'getBottleReplies',
        args: [BigInt(bottleId)],
        blockTag: 'latest'
      })
      
      if (!replyIds || !Array.isArray(replyIds) || replyIds.length === 0) {
        console.log(`瓶子 ${bottleId} 暂无回复`)
        // Cache empty result
        bottleDataCache.set(repliesCacheKey, { data: [], timestamp: Date.now() })
        return []
      }
      
      console.log(`瓶子 ${bottleId} 找到 ${replyIds.length} 个回复`)
      
      // Get detailed reply information for each ID with parallel processing
      const replyPromises = replyIds.map(async (replyId: any, index: number) => {
        try {
          const reply = await readContract(config, {
            address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
            abi: DRIFT_BOTTLE_ABI,
            functionName: 'getReply',
            args: [replyId],
            blockTag: 'latest'
          })
          
          if (reply) {
            console.log(`✅ 回复 ${index + 1}/${replyIds.length} 读取成功`)
          }
          
          return reply
        } catch (error) {
          console.error(`❌ 读取回复 ${replyId} 失败:`, error)
          return null
        }
      })
      
      const replies = (await Promise.all(replyPromises)).filter(reply => reply !== null)
      
      // Validate and sanitize all reply data before caching
      const validatedReplies = validateReplyDataArray(replies)
      const displayReplies = validatedReplies.map(reply => sanitizeForDisplay(reply))
      
      console.log(`✅ 成功读取瓶子 ${bottleId} 的 ${displayReplies.length} 个回复 (原始: ${replies.length})`)
      
      // Cache validated and sanitized replies
      bottleDataCache.set(repliesCacheKey, { data: displayReplies, timestamp: Date.now() })
      
      return displayReplies
      
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      console.error(`❌ 读取瓶子 ${bottleId} 回复失败 (尝试 ${retryCount + 1}):`, errorMsg)
      
      // Handle network errors with retry
      const isNetworkError = errorMsg.includes('network') ||
                           errorMsg.includes('timeout') ||
                           errorMsg.includes('connection') ||
                           errorMsg.includes('fetch') ||
                           error?.code === 'NETWORK_ERROR' ||
                           error?.code === 'TIMEOUT'
      
      if (retryCount < 2 && isNetworkError) {
        const delay = Math.min(Math.pow(2, retryCount) * 1000, 4000) // Max 4s delay
        console.log(`网络错误，${delay}ms 后重试读取回复...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return readBottleReplies(bottleId, retryCount + 1)
      }
      
      console.error(`瓶子 ${bottleId} 回复读取失败，返回空数组`)
      return []
    }
  }, [actuallyConnected, connectionStable, bottleDataCache])

  // Simplified memoization with reduced dependencies to prevent unnecessary re-renders
  return useMemo(() => ({
    // Core connection state
    isConnected: actuallyConnected,
    isConnecting: connectionLoading,
    isConnectionStable: connectionStable,
    address,
    
    // Raw states for debugging
    rawConnectionState: {
      isConnected,
      isConnecting, 
      isReconnecting,
      status
    },
    
    // Transaction state
    isLoading: isLoading || isPending || isConfirming,
    isConfirmed,
    error,
    hash,

    // Contract data
    bottleCount: bottleCount ? Number(bottleCount) : 0,
    activeBottleCount: activeBottleCount ? Number(activeBottleCount) : 0,

    // Stable function references
    sendBottle,
    getRandomBottle,
    replyToBottle,
    skipBottle,
    estimateReplyGas,
    readBottleData,
    readBottleReplies,
  }), [
    // Reduced dependencies - only include essential state changes
    actuallyConnected,
    connectionLoading,
    connectionStable,
    address,
    isLoading,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    bottleCount,
    activeBottleCount,
    // Functions are already memoized via useCallback, so stable references
    sendBottle,
    getRandomBottle,
    replyToBottle,
    skipBottle,
    estimateReplyGas,
    readBottleData,
    readBottleReplies
  ])
}