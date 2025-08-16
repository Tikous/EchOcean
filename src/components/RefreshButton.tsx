'use client'

import React, { useState } from 'react'
import { DataCacheManager } from '@/lib/dataCache'

interface RefreshButtonProps {
  onRefresh?: () => void | Promise<void>
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
  children?: React.ReactNode
}

export const RefreshButton = React.memo(function RefreshButton({
  onRefresh,
  className = '',
  size = 'md',
  variant = 'default',
  children
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const cacheManager = DataCacheManager.getInstance()

  const sizeClasses = {
    sm: 'p-2 text-sm',
    md: 'p-3 text-base',
    lg: 'p-4 text-lg'
  }

  const variantClasses = {
    default: 'bg-ocean-500 hover:bg-ocean-600 text-white shadow-lg shadow-ocean-500/30',
    ghost: 'bg-transparent hover:bg-ocean-500/10 text-ocean-400 hover:text-ocean-300',
    outline: 'bg-transparent border border-ocean-400 hover:bg-ocean-500/10 text-ocean-400 hover:text-ocean-300'
  }

  const handleRefresh = async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    
    try {
      // Call local refresh callback if provided
      if (onRefresh) {
        await onRefresh()
      }
      
      // Trigger global refresh
      await cacheManager.triggerRefresh(true)
      
    } catch (error) {
      console.error('刷新失败:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 
        disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95
        ${sizeClasses[size]} ${variantClasses[variant]} ${className}
      `}
      title="刷新数据"
    >
      {children || (
        <>
          <svg 
            className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''} ${children ? 'mr-2' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          {children && (isRefreshing ? '刷新中...' : '刷新')}
        </>
      )}
    </button>
  )
})

RefreshButton.displayName = 'RefreshButton'

// Compact refresh button for toolbars
export const CompactRefreshButton = React.memo(function CompactRefreshButton({
  onRefresh,
  className = ''
}: Pick<RefreshButtonProps, 'onRefresh' | 'className'>) {
  return (
    <RefreshButton
      onRefresh={onRefresh}
      size="sm"
      variant="ghost"
      className={`!p-2 ${className}`}
    />
  )
})

CompactRefreshButton.displayName = 'CompactRefreshButton'

// Floating refresh button
export const FloatingRefreshButton = React.memo(function FloatingRefreshButton({
  onRefresh,
  className = ''
}: Pick<RefreshButtonProps, 'onRefresh' | 'className'>) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <RefreshButton
        onRefresh={onRefresh}
        size="lg"
        className="!rounded-full shadow-2xl shadow-ocean-500/50"
      />
    </div>
  )
})

FloatingRefreshButton.displayName = 'FloatingRefreshButton'