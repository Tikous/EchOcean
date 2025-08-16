'use client'

import { useEffect, useState } from 'react'
import { useDriftBottle } from '@/hooks/useDriftBottle'
import { usePathname } from 'next/navigation'

interface ConnectionEvent {
  timestamp: number
  type: 'connect' | 'disconnect' | 'reconnect' | 'stable' | 'navigation'
  details: string
  path?: string
}

export function WalletDebugMonitor() {
  const [events, setEvents] = useState<ConnectionEvent[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const { isConnected, isConnecting, isConnectionStable, rawConnectionState } = useDriftBottle()
  const pathname = usePathname()

  // Track connection state changes
  useEffect(() => {
    const newEvent: ConnectionEvent = {
      timestamp: Date.now(),
      type: isConnected ? (isConnectionStable ? 'stable' : 'connect') : 'disconnect',
      details: `连接状态: ${isConnected ? '已连接' : '未连接'}, 稳定: ${isConnectionStable ? '是' : '否'}, 连接中: ${isConnecting ? '是' : '否'}`,
      path: pathname
    }

    setEvents(prev => [...prev.slice(-9), newEvent]) // Keep last 10 events
  }, [isConnected, isConnectionStable, isConnecting, pathname])

  // Track navigation events
  useEffect(() => {
    const navigationEvent: ConnectionEvent = {
      timestamp: Date.now(),
      type: 'navigation',
      details: `导航至: ${pathname}`,
      path: pathname
    }

    setEvents(prev => [...prev.slice(-9), navigationEvent])
  }, [pathname])

  // Add keyboard shortcut to toggle monitor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Only show in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && !isVisible) {
    return null
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const getEventColor = (type: ConnectionEvent['type']) => {
    switch (type) {
      case 'connect': return 'text-blue-400'
      case 'stable': return 'text-green-400'
      case 'disconnect': return 'text-red-400'
      case 'reconnect': return 'text-yellow-400'
      case 'navigation': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <>
      {/* Toggle button */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-gray-800/90 text-white p-2 rounded-lg text-xs backdrop-blur-sm border border-gray-600/50 hover:bg-gray-700/90"
          title="切换钱包调试监控 (Ctrl+Shift+W)"
        >
          🔍 钱包监控
        </button>
      </div>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed bottom-16 left-4 bg-gray-900/95 text-white p-4 rounded-lg backdrop-blur-sm border border-gray-600/50 max-w-md z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">钱包连接监控</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          
          {/* Current status */}
          <div className="bg-gray-800/50 rounded p-2 mb-3 text-xs">
            <div className="grid grid-cols-2 gap-1">
              <span>状态: <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? '已连接' : '未连接'}
              </span></span>
              <span>稳定: <span className={isConnectionStable ? 'text-green-400' : 'text-yellow-400'}>
                {isConnectionStable ? '是' : '否'}
              </span></span>
              <span>连接中: <span className={isConnecting ? 'text-yellow-400' : 'text-gray-400'}>
                {isConnecting ? '是' : '否'}
              </span></span>
              <span>路径: <span className="text-blue-400">{pathname}</span></span>
            </div>
          </div>

          {/* Raw connection state */}
          <div className="bg-gray-800/50 rounded p-2 mb-3 text-xs">
            <div className="text-gray-300 mb-1">原始状态:</div>
            <div className="text-xs space-y-1">
              <div>isConnected: {rawConnectionState.isConnected ? '✓' : '✗'}</div>
              <div>isConnecting: {rawConnectionState.isConnecting ? '✓' : '✗'}</div>
              <div>isReconnecting: {rawConnectionState.isReconnecting ? '✓' : '✗'}</div>
              <div>status: {rawConnectionState.status}</div>
            </div>
          </div>

          {/* Event log */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <div className="text-xs text-gray-300 mb-2">事件日志:</div>
            {events.slice(-10).reverse().map((event, index) => (
              <div key={index} className="text-xs py-1 border-b border-gray-700/50 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className={getEventColor(event.type)}>
                    {event.type.toUpperCase()}
                  </span>
                  <span className="text-gray-400">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                <div className="text-gray-300 mt-1">
                  {event.details}
                </div>
                {event.path && (
                  <div className="text-gray-500 text-xs">
                    路径: {event.path}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-700/50 text-xs text-gray-400">
            按 Ctrl+Shift+W 切换显示
          </div>
        </div>
      )}
    </>
  )
}

// Global debugging functions
export function addWalletDebugTools() {
  if (typeof window !== 'undefined') {
    // Add global debugging functions
    (window as any).debugWallet = {
      checkConnection: () => {
        const wagmiConnected = localStorage.getItem('wagmi.connected')
        const driftBottleStable = localStorage.getItem('driftBottle.connectionStable')
        const lastConnectionTime = localStorage.getItem('driftBottle.lastConnectionTime')
        
        console.log('🔍 Wallet Debug Info:', {
          wagmiConnected,
          driftBottleStable,
          lastConnectionTime: lastConnectionTime ? new Date(parseInt(lastConnectionTime)).toLocaleString() : null,
          localStorage: Object.keys(localStorage).filter(key => 
            key.startsWith('wagmi.') || key.startsWith('driftBottle.')
          )
        })
      },
      
      clearConnection: () => {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith('wagmi.') || key.startsWith('driftBottle.')
        )
        keys.forEach(key => localStorage.removeItem(key))
        console.log('🧹 Cleared wallet localStorage:', keys)
      },
      
      forceReconnect: async () => {
        if ((window as any).emergencyDisconnectWallet) {
          await (window as any).emergencyDisconnectWallet()
          console.log('🔌 Forced wallet disconnection')
        } else {
          console.warn('⚠️ Emergency disconnect function not available')
        }
      }
    }
    
    console.log('🛠️ Wallet debug tools loaded. Use window.debugWallet to access.')
  }
}