'use client'

import React from 'react'
import { ClipLoader, PulseLoader } from 'react-spinners'
import { useDriftBottle } from '@/hooks/useDriftBottle'

interface WalletConnectionStatusProps {
  children?: React.ReactNode
  showDetailedStatus?: boolean
  size?: 'small' | 'medium' | 'large'
  variant?: 'page' | 'inline' | 'modal'
}

export function WalletConnectionStatus({ 
  children, 
  showDetailedStatus = false,
  size = 'medium',
  variant = 'page'
}: WalletConnectionStatusProps) {
  const { isConnected, isConnecting, isConnectionStable, rawConnectionState } = useDriftBottle()

  // 如果已连接且稳定，直接渲染子内容
  if (isConnected && isConnectionStable) {
    return <>{children}</>
  }

  // 确定样式尺寸
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'p-4',
          icon: 'text-2xl',
          title: 'text-lg',
          description: 'text-sm',
          button: 'py-2 px-4 text-sm'
        }
      case 'large':
        return {
          container: 'p-10',
          icon: 'text-6xl',
          title: 'text-3xl',
          description: 'text-lg',
          button: 'py-4 px-8 text-lg'
        }
      default: // medium
        return {
          container: 'p-8',
          icon: 'text-4xl',
          title: 'text-xl',
          description: 'text-base',
          button: 'py-3 px-6'
        }
    }
  }

  // 确定容器样式
  const getContainerClasses = () => {
    const baseClasses = 'glass rounded-xl text-center'
    
    switch (variant) {
      case 'inline':
        return `${baseClasses} bg-ocean-800/30`
      case 'modal':
        return `${baseClasses} bg-ocean-800/70 backdrop-blur-lg border border-ocean-500/30`
      default: // page
        return `${baseClasses}`
    }
  }

  const sizeClasses = getSizeClasses()
  const containerClasses = getContainerClasses()

  // 连接中状态
  if (isConnecting) {
    return (
      <div className={`${containerClasses} ${sizeClasses.container}`}>
        <div className="flex items-center justify-center mb-4">
          <ClipLoader
            color="#f97316"
            size={size === 'small' ? 24 : size === 'large' ? 40 : 32}
            loading={true}
            cssOverride={{ marginRight: '12px' }}
          />
          <div className={`${sizeClasses.icon} animate-pulse`}>🔗</div>
        </div>
        <h3 className={`${sizeClasses.title} text-white mb-4`}>连接中...</h3>
        <p className={`${sizeClasses.description} text-ocean-200 mb-6`}>
          正在连接Web3钱包，请稍候
        </p>
        {showDetailedStatus && (
          <div className="text-ocean-300 text-sm space-y-1">
            <p>连接状态: {rawConnectionState.status}</p>
            <p>正在连接: {rawConnectionState.isConnecting ? '是' : '否'}</p>
            <p>正在重连: {rawConnectionState.isReconnecting ? '是' : '否'}</p>
          </div>
        )}
      </div>
    )
  }

  // 未连接状态
  if (!isConnected) {
    return (
      <div className={`${containerClasses} ${sizeClasses.container}`}>
        <div className={`${sizeClasses.icon} mb-4`}>🔗</div>
        <h3 className={`${sizeClasses.title} text-white mb-4`}>请连接钱包</h3>
        <p className={`${sizeClasses.description} text-ocean-200 mb-6`}>
          你需要连接Web3钱包才能使用回响洋流的功能
        </p>
        <div className="space-y-3">
          <p className="text-ocean-300 text-sm">
            点击右上角的连接按钮来连接你的钱包
          </p>
          {showDetailedStatus && (
            <div className="text-ocean-400 text-xs space-y-1 mt-4">
              <p>支持的钱包: MetaMask, WalletConnect, Coinbase Wallet</p>
              <p>网络: Sepolia 测试网</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 连接不稳定状态
  if (isConnected && !isConnectionStable) {
    return (
      <div className={`${containerClasses} ${sizeClasses.container}`}>
        <div className="flex items-center justify-center mb-4">
          <PulseLoader
            color="#f59e0b"
            size={size === 'small' ? 8 : size === 'large' ? 12 : 10}
            loading={true}
            speedMultiplier={0.8}
            cssOverride={{ marginRight: '12px' }}
          />
          <div className={`${sizeClasses.icon} text-orange-400`}>⚡</div>
        </div>
        <h3 className={`${sizeClasses.title} text-white mb-4`}>连接稳定中...</h3>
        <p className={`${sizeClasses.description} text-ocean-200 mb-6`}>
          钱包已连接，正在建立稳定连接
        </p>
        {showDetailedStatus && (
          <div className="text-ocean-300 text-sm space-y-1">
            <p>钱包地址: {rawConnectionState.isConnected ? '已获取' : '获取中'}</p>
            <p>连接状态: {rawConnectionState.status}</p>
            <p>预计还需: ~2秒</p>
          </div>
        )}
      </div>
    )
  }

  // 默认返回（不应该到达这里）
  return <>{children}</>
}

// 专门用于页面的简化版本
export function WalletConnectionRequired({ children }: { children: React.ReactNode }) {
  return (
    <WalletConnectionStatus variant="page" size="medium">
      {children}
    </WalletConnectionStatus>
  )
}

// 专门用于内联显示的版本
export function InlineWalletStatus({ children }: { children: React.ReactNode }) {
  return (
    <WalletConnectionStatus variant="inline" size="small">
      {children}
    </WalletConnectionStatus>
  )
}

// 钱包连接状态指示器（小型）
export function WalletStatusIndicator() {
  const { isConnected, isConnecting, isConnectionStable } = useDriftBottle()

  if (isConnecting) {
    return (
      <div className="flex items-center space-x-2 text-orange-400">
        <ClipLoader
          color="#f59e0b"
          size={12}
          loading={true}
        />
        <span className="text-sm">连接中</span>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 text-red-400">
        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
        <span className="text-sm">未连接</span>
      </div>
    )
  }

  if (!isConnectionStable) {
    return (
      <div className="flex items-center space-x-2 text-yellow-400">
        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
        <span className="text-sm">稳定中</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-green-400">
      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
      <span className="text-sm">已连接</span>
    </div>
  )
}