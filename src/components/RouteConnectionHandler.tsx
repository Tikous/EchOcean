'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAccount, useDisconnect } from 'wagmi'

export function RouteConnectionHandler() {
  const pathname = usePathname()
  const { isConnected, isConnecting, isReconnecting } = useAccount()
  const { disconnect } = useDisconnect()
  
  // Track connection state for logging purposes only
  const previousConnected = useRef(isConnected)
  const hasLoggedFirstConnection = useRef(false)
  
  // Connection state change handler - only log significant changes
  useEffect(() => {
    const wasConnected = previousConnected.current
    const isNowConnected = isConnected
    
    // Log significant state changes for debugging
    if (wasConnected !== isNowConnected) {
      console.log(`钱包连接状态变化: ${wasConnected ? '已连接' : '未连接'} -> ${isNowConnected ? '已连接' : '未连接'}`)
      previousConnected.current = isNowConnected
      
      // Only log the first successful connection
      if (isNowConnected && !hasLoggedFirstConnection.current) {
        console.log('✅ 钱包首次连接成功')
        hasLoggedFirstConnection.current = true
        // Store the first connection timestamp for "connect once" strategy
        localStorage.setItem('driftBottle.firstConnected', Date.now().toString())
      } else if (!isNowConnected) {
        // Reset the flag when disconnected
        hasLoggedFirstConnection.current = false
        localStorage.removeItem('driftBottle.firstConnected')
      }
    }
  }, [isConnected])
  
  // Completely disable automatic reconnection during route changes
  // This prevents the main issue of reconnecting every time user navigates
  useEffect(() => {
    // Silent operation - no automatic connection attempts during navigation
    // Users should only connect once manually, then stay connected
    if (pathname) {
      console.log(`🛣️ 导航到: ${pathname} (不触发钱包重连)`)
    }
  }, [pathname])
  
  // Handle storage changes from other tabs - sync disconnect only
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      // Only handle wagmi-related storage changes
      if (!e.key?.startsWith('wagmi.')) return
      
      console.log(`存储变更: ${e.key} = ${e.newValue}`)
      
      // Handle disconnection from other tabs only - no automatic connection
      if (e.key === 'wagmi.connected') {
        if (e.newValue === 'true' && !isConnected) {
          console.log('💡 其他标签页连接了钱包 - 此标签页保持当前状态')
          // Don't auto-connect, let user manually connect if needed
        } else if (e.newValue === 'false' && isConnected) {
          console.log('检测到其他标签页断开了钱包，同步断开...')
          try {
            await disconnect()
          } catch (error) {
            console.warn('同步断开连接时出错:', error)
          }
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isConnected, disconnect])
  
  // Enhanced cleanup on disconnect
  useEffect(() => {
    if (!isConnected && !isConnecting && !isReconnecting) {
      // Clear all driftBottle connection state
      try {
        localStorage.removeItem('driftBottle.connectionStable')
        localStorage.removeItem('driftBottle.lastConnectionTime')
      } catch (error) {
        console.warn('清理localStorage失败:', error)
      }
    }
  }, [isConnected, isConnecting, isReconnecting])

  // Manual disconnect function for enhanced disconnect functionality
  const manualDisconnect = useCallback(async () => {
    try {
      console.log('手动断开钱包连接...')
      
      // Clear localStorage
      try {
        localStorage.removeItem('driftBottle.connectionStable')
        localStorage.removeItem('driftBottle.lastConnectionTime')
        localStorage.removeItem('wagmi.connected')
      } catch (error) {
        console.warn('清理localStorage失败:', error)
      }
      
      // Disconnect wallet
      await disconnect()
      
      console.log('✅ 钱包连接已断开')
    } catch (error) {
      console.error('❌ 手动断开连接失败:', error)
      throw error
    }
  }, [disconnect])

  // Expose manual disconnect globally for debugging and emergency use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).emergencyDisconnectWallet = manualDisconnect
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).emergencyDisconnectWallet
      }
    }
  }, [manualDisconnect])

  // Cleanup on unmount - simplified
  useEffect(() => {
    return () => {
      // Cleanup any pending operations
      console.log('🧹 RouteConnectionHandler unmounting')
    }
  }, [])
  
  return null // This component doesn't render anything
}