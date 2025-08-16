'use client'

import React, { useState, useEffect } from 'react'
import { DataCacheManager } from '@/lib/dataCache'

interface HealthMetrics {
  cacheSize: number
  cacheEntries: number
  memoryUsage: number
  localStorageUsage: number
  performanceScore: number
}

export const SystemHealthMonitor = React.memo(function SystemHealthMonitor() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const cacheManager = DataCacheManager.getInstance()

  const collectMetrics = () => {
    try {
      // Calculate localStorage usage
      let localStorageSize = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += (localStorage[key].length + key.length)
        }
      }

      // Calculate cache entries
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('drift-bottle-data')
      )

      // Basic performance score (simplified)
      const performanceScore = Math.max(0, 100 - (localStorageSize / (1024 * 1024)) * 10)

      setMetrics({
        cacheSize: Math.round(localStorageSize / 1024), // KB
        cacheEntries: cacheKeys.length,
        memoryUsage: (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024)) : 0,
        localStorageUsage: Math.round((localStorageSize / (5 * 1024 * 1024)) * 100), // Percentage of 5MB
        performanceScore: Math.round(performanceScore)
      })
    } catch (error) {
      console.warn('无法收集系统指标:', error)
    }
  }

  useEffect(() => {
    collectMetrics()
    const interval = setInterval(collectMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Only show in development or when explicitly enabled
  useEffect(() => {
    const showHealthMonitor = localStorage.getItem('showHealthMonitor') === 'true' ||
      process.env.NODE_ENV === 'development'
    setIsVisible(showHealthMonitor)
  }, [])

  if (!isVisible || !metrics) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900/90 text-white p-3 rounded-lg text-xs font-mono backdrop-blur-sm border border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">系统状态</span>
        <button
          onClick={() => {
            localStorage.setItem('showHealthMonitor', 'false')
            setIsVisible(false)
          }}
          className="text-gray-400 hover:text-white ml-2"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>缓存大小:</span>
          <span className={metrics.cacheSize > 1024 ? 'text-yellow-400' : 'text-green-400'}>
            {metrics.cacheSize}KB
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>缓存条目:</span>
          <span className={metrics.cacheEntries > 10 ? 'text-yellow-400' : 'text-green-400'}>
            {metrics.cacheEntries}
          </span>
        </div>
        
        {metrics.memoryUsage > 0 && (
          <div className="flex justify-between">
            <span>内存使用:</span>
            <span className={metrics.memoryUsage > 50 ? 'text-red-400' : 'text-green-400'}>
              {metrics.memoryUsage}MB
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>存储使用:</span>
          <span className={metrics.localStorageUsage > 80 ? 'text-red-400' : 'text-green-400'}>
            {metrics.localStorageUsage}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>性能评分:</span>
          <span className={
            metrics.performanceScore > 80 ? 'text-green-400' : 
            metrics.performanceScore > 60 ? 'text-yellow-400' : 'text-red-400'
          }>
            {metrics.performanceScore}/100
          </span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-600">
        <button
          onClick={() => {
            cacheManager.triggerRefresh(true)
            collectMetrics()
          }}
          className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded mr-2"
        >
          清理缓存
        </button>
        <button
          onClick={collectMetrics}
          className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
        >
          刷新指标
        </button>
      </div>
    </div>
  )
})

SystemHealthMonitor.displayName = 'SystemHealthMonitor'