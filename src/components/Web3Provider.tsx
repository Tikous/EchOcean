'use client'

import { useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { config } from '@/lib/web3'
import { RouteConnectionHandler } from './RouteConnectionHandler'
import { Web3ErrorBoundary } from './ErrorBoundary'
import { addWalletDebugTools } from './WalletDebugMonitor'

// Stable QueryClient instance - avoid recreation during navigation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Comprehensive error filtering to prevent unnecessary retries
        const errorMessage = error?.message || ''
        const shouldSkipRetry = [
          'Failed to fetch',
          'Connection interrupted', 
          'WebSocket',
          'WalletConnect',
          'Analytics SDK',
          'analytics',
          'NETWORK_ERROR',
          'TIMEOUT'
        ].some(pattern => errorMessage.includes(pattern))
        
        if (shouldSkipRetry) {
          return false
        }
        return failureCount < 1 // Minimal retries to reduce connection churn
      },
      retryDelay: 2000, // Fixed delay to avoid exponential backoff issues
      
      // Navigation-optimized settings
      refetchOnWindowFocus: false, // Prevent refetch on tab focus
      refetchOnReconnect: 'always', // Only refetch on genuine network reconnection
      refetchOnMount: false, // Use cached data when available
      
      // Optimized cache settings for better performance
      staleTime: 1000 * 60 * 3, // 3 minutes - balance between freshness and performance
      gcTime: 1000 * 60 * 15, // 15 minutes - prevent excessive memory usage
      
      // Stability optimizations
      structuralSharing: false, // Disable to prevent reference issues
      placeholderData: (previousData: unknown) => previousData,
      networkMode: 'online', // Simpler network mode
      notifyOnChangeProps: ['data', 'error'], // Reduced notifications
    },
    mutations: {
      retry: false, // No retries for mutations to prevent multiple wallet prompts
      networkMode: 'online',
    },
  },
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // Simplified hydration handling - avoid conditional rendering that causes remounting
  const [isClient, setIsClient] = useState(false)
  const [shouldPreventAutoReconnect, setShouldPreventAutoReconnect] = useState(false)
  
  useEffect(() => {
    // Set client flag only once during initial mount
    setIsClient(true)
    
    // Initialize debug tools
    addWalletDebugTools()
    
    // Enhanced page refresh detection and wallet reconnection handling
    const checkPageRefreshAndConnection = () => {
      // Multiple ways to detect page refresh for better compatibility
      const isPageRefresh = (
        window.performance.navigation?.type === 1 || // TYPE_RELOAD
        (window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload' ||
        document.referrer === '' || document.referrer === window.location.href
      )
      
      const firstConnected = localStorage.getItem('driftBottle.firstConnected')
      const wasConnected = localStorage.getItem('wagmi.connected') === 'true'
      
      if (isPageRefresh && firstConnected && wasConnected) {
        console.log('🔄 页面刷新检测 - 用户之前已连接，尝试静默重连')
        setShouldPreventAutoReconnect(false)
        
        // Add a small delay to ensure wagmi is properly initialized
        setTimeout(() => {
          // Check if wagmi has automatically reconnected after refresh
          const currentConnection = localStorage.getItem('wagmi.connected')
          if (currentConnection !== 'true') {
            console.log('🔌 检测到刷新后连接丢失，可能需要用户手动重连')
            // Clear the connection flags to require manual reconnection
            localStorage.removeItem('driftBottle.firstConnected')
          }
        }, 2000)
      } else {
        console.log('🆕 首次访问或清洁导航 - 需要手动连接钱包')
        setShouldPreventAutoReconnect(true)
        // Clear any stale connection state
        localStorage.removeItem('driftBottle.firstConnected')
      }
    }
    
    checkPageRefreshAndConnection()
  }, [])

  // Enhanced global error handler for WalletConnect and relayer errors
  useEffect(() => {
    if (!isClient) return
    
    // Override console methods to filter WalletConnect noise
    const originalConsoleLog = console.log
    const originalConsoleWarn = console.warn
    const originalConsoleError = console.error

    console.log = (...args) => {
      const message = args.join(' ')
      // More selective filtering - only suppress known harmless messages
      const shouldFilter = [
        'core/relayer: subscription error',
        'WalletConnect v2 socket error',
        'subscription error: reconnection in progress'
      ].some(pattern => message.includes(pattern))
      
      if (shouldFilter && !message.includes('error')) {
        return // Only suppress non-error relayer noise
      }
      originalConsoleLog.apply(console, args)
    }

    console.warn = (...args) => {
      const message = args.join(' ')
      const shouldFilter = [
        'core/relayer',
        'subscription',
        'WalletConnect',
        'relayer',
        'socket',
        'Failed to fetch',
        'Connection interrupted',
        'WebSocket',
        'Analytics SDK',
        'analytics'
      ].some(pattern => message.includes(pattern))
      
      if (shouldFilter) {
        return // Silently suppress
      }
      originalConsoleWarn.apply(console, args)
    }

    console.error = (...args) => {
      const message = args.join(' ')
      const shouldFilter = [
        'Subscribing to',
        'subscription',
        'Fatal socket error',
        'WebSocket connection failed',
        'Connection interrupted',
        'Unauthorized: invalid key',
        'relayer/subscription',
        'core/relayer',
        'WalletConnect error',
        'socket error'
      ].some(pattern => message.includes(pattern) && 
        (message.includes('failed') || message.includes('error') || message.includes('invalid')))
      
      if (shouldFilter) {
        return // Silently suppress subscription and connection errors
      }
      originalConsoleError.apply(console, args)
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const errorMessage = error?.message || String(error)
      
      // Enhanced comprehensive error filtering
      const shouldFilter = [
        'Connection interrupted',
        'Fatal socket error',
        'WebSocket connection failed',
        'WebSocket connection closed abnormally',
        'Subscribing to',
        'core/relayer',
        'WalletConnect',
        'relayer/subscription',
        'Unauthorized: invalid key',
        'Invalid key for target',
        'socket error',
        'subscription error',
        'Failed to fetch',
        'Network request failed',
        'Analytics SDK',
        'analytics',
        'code: 3000'
      ].some(pattern => errorMessage.includes(pattern))
      
      if (shouldFilter) {
        event.preventDefault() // Prevent the error from being logged as unhandled
        return
      }
    }

    const handleError = (event: ErrorEvent) => {
      const error = event.error
      const errorMessage = error?.message || String(error)
      
      const shouldFilter = [
        'Connection interrupted',
        'Fatal socket error',
        'WebSocket connection failed',
        'WebSocket connection closed abnormally',
        'core/relayer',
        'WalletConnect',
        'relayer/subscription',
        'Unauthorized: invalid key',
        'socket error',
        'subscription error',
        'code: 3000'
      ].some(pattern => errorMessage.includes(pattern))
      
      if (shouldFilter) {
        event.preventDefault()
        return
      }
    }

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
      // Restore original console methods
      console.log = originalConsoleLog
      console.warn = originalConsoleWarn  
      console.error = originalConsoleError
    }
  }, [isClient])

  // Simplified rendering - always render provider but conditionally initialize features
  // This prevents remounting issues during navigation

  return (
    <Web3ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider
            theme="auto"
            mode="dark"
            options={{
              hideBalance: true, // Hide balance, only show address
              hideTooltips: false,
              hideQuestionMarkCTA: true,
              hideNoWalletCTA: true,
              walletConnectName: "回响洋流",
              disclaimer: "连接钱包以投递心声、捕捞回音",
              enforceSupportedChains: false,
              embedGoogleFonts: false,
              // Enhanced wallet connection persistence
              initialChainId: 10143, // Monad Testnet as primary
              // Additional stability options
              avoidLayoutShift: true,
              // Wallet connection persistence settings
              bufferPolyfill: false,
              // Force address display instead of "Connected" text
              truncateLongENSAddress: true,
              // Prioritize browser extensions over QR code
              walletConnectCTA: 'link',
              // Note: retryConnectorOnFailure is not a valid ConnectKit option, removed for type safety
            }}
            customTheme={{
              // Connect button styles (when not connected)
              '--ck-connectbutton-font-size': '14px',
              '--ck-connectbutton-font-weight': '600',
              '--ck-connectbutton-border-radius': '12px',
              '--ck-connectbutton-background': 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              '--ck-connectbutton-hover-background': 'linear-gradient(135deg, #0284c7, #0369a1)',
              '--ck-connectbutton-color': '#ffffff',
              '--ck-connectbutton-box-shadow': '0 4px 12px rgba(14, 165, 233, 0.4)',
              '--ck-connectbutton-hover-box-shadow': '0 6px 16px rgba(14, 165, 233, 0.6)',
              
              // Connected button styles (showing address)
              '--ck-primary-button-background': 'linear-gradient(135deg, #10b981, #059669)',
              '--ck-primary-button-hover-background': 'linear-gradient(135deg, #059669, #047857)',
              '--ck-primary-button-color': '#ffffff',
              '--ck-primary-button-border-radius': '12px',
              '--ck-primary-button-font-size': '14px',
              '--ck-primary-button-font-weight': '500',
              '--ck-primary-button-box-shadow': '0 4px 12px rgba(16, 185, 129, 0.4)',
              '--ck-primary-button-hover-box-shadow': '0 6px 16px rgba(16, 185, 129, 0.6)',
              
              // Modal and dropdown styles
              '--ck-body-background': 'rgba(12, 74, 110, 0.95)',
              '--ck-body-background-secondary': 'rgba(7, 89, 133, 0.9)',
              '--ck-body-color': '#f0f9ff',
              '--ck-body-divider': 'rgba(51, 231, 255, 0.2)',
              '--ck-secondary-button-background': 'rgba(255, 255, 255, 0.1)',
              '--ck-secondary-button-hover-background': 'rgba(255, 255, 255, 0.15)',
              '--ck-secondary-button-color': '#f0f9ff',
              '--ck-border-radius': '16px',
              '--ck-overlay-background': 'rgba(12, 74, 110, 0.8)',
              '--ck-body-action-color': '#33e7ff',
              '--ck-body-color-muted': 'rgba(240, 249, 255, 0.7)',
              
              // Tooltip styles
              '--ck-tooltip-background': 'rgba(12, 74, 110, 0.95)',
              '--ck-tooltip-color': '#f0f9ff',
              '--ck-tooltip-border-radius': '8px',
            }}
          >
            <Web3ErrorBoundary>
              <RouteConnectionHandler />
            </Web3ErrorBoundary>
            {children}
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Web3ErrorBoundary>
  )
}