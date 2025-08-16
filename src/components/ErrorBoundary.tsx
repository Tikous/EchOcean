'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error but don't spam console with Web3 connection errors
    if (
      !error.message?.includes('Connection interrupted') &&
      !error.message?.includes('Cross-Origin-Opener-Policy') &&
      !error.message?.includes('WalletConnect') &&
      !error.message?.includes('Analytics SDK')
    ) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="glass rounded-xl p-8 text-center max-w-md mx-auto">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl text-white mb-4">出现了一些问题</h3>
          <p className="text-ocean-200 mb-6">
            请刷新页面重试，或检查钱包连接状态
          </p>
          <button
            onClick={() => {
              // Soft reset without full page reload to preserve wallet connection
              this.setState({ hasError: false, error: undefined })
              // Force re-render by updating a key or triggering navigation
              window.history.pushState(null, '', window.location.pathname)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
            className="bg-coral-500 hover:bg-coral-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Web3-specific error boundary for handling blockchain connection issues
export class Web3ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Only catch Web3-related errors
    if (
      error.message?.includes('Connection interrupted') ||
      error.message?.includes('Cross-Origin-Opener-Policy') ||
      error.message?.includes('WalletConnect') ||
      error.message?.includes('Analytics SDK') ||
      error.message?.includes('wagmi') ||
      error.message?.includes('viem')
    ) {
      return { hasError: true, error }
    }
    // Let other errors bubble up
    throw error
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Silently handle Web3 connection errors
    console.warn('Web3 connection error handled:', error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="glass rounded-xl p-6 text-center">
          <div className="text-3xl mb-3">🔗</div>
          <h4 className="text-lg text-white mb-2">连接问题</h4>
          <p className="text-ocean-200 text-sm mb-4">
            钱包连接遇到问题，请检查网络或重新连接
          </p>
          <button
            onClick={() => {
              // Soft reset for Web3 errors - preserve connection state
              this.setState({ hasError: false, error: undefined })
              // Trigger a gentle state refresh
              setTimeout(() => {
                window.dispatchEvent(new Event('wallet-retry'))
              }, 100)
            }}
            className="bg-ocean-500 hover:bg-ocean-600 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}