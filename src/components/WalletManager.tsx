'use client'

import React, { useState } from 'react'
import { useDisconnect } from 'wagmi'
import { useDriftBottle } from '@/hooks/useDriftBottle'
import toast from 'react-hot-toast'

interface WalletManagerProps {
  showAdvancedOptions?: boolean
}

export function WalletManager({ showAdvancedOptions = false }: WalletManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { disconnect } = useDisconnect()
  const { isConnected, isConnectionStable, address, rawConnectionState } = useDriftBottle()

  const handleDisconnect = async () => {
    try {
      // Clear local storage first
      localStorage.removeItem('driftBottle.connectionStable')
      localStorage.removeItem('driftBottle.lastConnectionTime')
      
      // Disconnect wallet
      await disconnect()
      
      // Clear wagmi storage
      localStorage.removeItem('wagmi.connected')
      localStorage.removeItem('wagmi.recentConnectorId')
      
      toast.success('钱包已断开连接')
    } catch (error) {
      console.error('断开钱包连接失败:', error)
      toast.error('断开连接失败')
    }
  }

  const handleClearCache = () => {
    try {
      // Clear all driftBottle related cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('driftBottle.') || key.startsWith('wagmi.')) {
          localStorage.removeItem(key)
        }
      })
      
      toast.success('缓存已清理')
    } catch (error) {
      console.error('清理缓存失败:', error)
      toast.error('清理缓存失败')
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="text-center">
          <div className="text-red-400 mb-2">💔</div>
          <p className="text-ocean-200 text-sm">钱包未连接</p>
          <p className="text-ocean-400 text-xs mt-2">
            点击右上角按钮连接钱包
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="space-y-3">
        {/* Basic Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isConnectionStable ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
            }`}></div>
            <div>
              <p className="text-white text-sm font-medium">
                {formatAddress(address || '')}
              </p>
              <p className="text-ocean-300 text-xs">
                {isConnectionStable ? '连接稳定' : '连接中...'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-ocean-400 hover:text-ocean-300 text-xs"
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>

        {/* Quick Disconnect */}
        <button
          onClick={handleDisconnect}
          className="w-full py-2 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg text-sm transition-colors duration-200"
        >
          断开钱包连接
        </button>

        {/* Advanced Options */}
        {isExpanded && (
          <div className="space-y-2 pt-2 border-t border-ocean-700">
            <h4 className="text-ocean-300 text-xs font-medium">高级选项</h4>
            
            {showAdvancedOptions && (
              <>
                <button
                  onClick={handleClearCache}
                  className="w-full py-2 px-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 rounded-lg text-sm transition-colors duration-200"
                >
                  清理本地缓存
                </button>
                
                <div className="text-xs text-ocean-400 space-y-1">
                  <p>连接状态: {rawConnectionState.status}</p>
                  <p>连接中: {rawConnectionState.isConnecting ? '是' : '否'}</p>
                  <p>重连中: {rawConnectionState.isReconnecting ? '是' : '否'}</p>
                </div>
              </>
            )}
            
            <div className="text-xs text-ocean-500">
              <p>网络: Sepolia 测试网</p>
              <p>协议: Web3 / WalletConnect</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 简化版钱包断开按钮
export function QuickDisconnectButton() {
  const { disconnect } = useDisconnect()
  const { isConnected } = useDriftBottle()

  const handleQuickDisconnect = async () => {
    if (!isConnected) return

    try {
      // Clear local storage
      localStorage.removeItem('driftBottle.connectionStable')
      localStorage.removeItem('driftBottle.lastConnectionTime')
      
      await disconnect()
      toast.success('已断开连接')
    } catch (error) {
      console.error('断开连接失败:', error)
      toast.error('断开失败')
    }
  }

  if (!isConnected) return null

  return (
    <button
      onClick={handleQuickDisconnect}
      className="text-red-400 hover:text-red-300 text-sm transition-colors duration-200"
      title="断开钱包连接"
    >
      断开连接
    </button>
  )
}