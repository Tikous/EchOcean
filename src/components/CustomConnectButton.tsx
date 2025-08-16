'use client'

import React from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'

export const CustomConnectButton = React.memo(function CustomConnectButton() {
  const { address, isConnected } = useAccount()

  // Format address for display  
  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Generate a colorful avatar based on wallet address
  const generateAvatarColor = (addr: string) => {
    if (!addr) return '#f97316' // Default orange
    
    // Use address hash to generate consistent color
    const hash = addr.slice(2, 8) // Use first 6 hex chars after 0x
    const hue = parseInt(hash, 16) % 360
    const saturation = 65 + (parseInt(hash.slice(0, 2), 16) % 35) // 65-100%
    const lightness = 45 + (parseInt(hash.slice(2, 4), 16) % 25) // 45-70%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  return (
    <ConnectKitButton.Custom>
      {({ isConnected: ckConnected, show, truncatedAddress, ensName, address: ckAddress }) => {
        // Use both wagmi and ConnectKit connection states for reliability
        const actuallyConnected = isConnected || ckConnected
        const displayAddress = ckAddress || address
        
        // Determine what text to show
        const displayText = actuallyConnected 
          ? ensName || truncatedAddress || formatAddress(displayAddress || '') 
          : 'Connect Wallet'

        const avatarColor = generateAvatarColor(displayAddress || '')

        return (
          <button
            onClick={show}
            className={`
              flex items-center space-x-3 px-4 py-2.5 rounded-2xl font-medium text-sm transition-all duration-200 hover:scale-105 min-w-[140px]
              ${actuallyConnected 
                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 shadow-lg shadow-gray-800/40 hover:shadow-gray-700/60' 
                : 'bg-gradient-to-r from-ocean-500 to-coral-500 hover:from-ocean-600 hover:to-coral-600 text-white shadow-lg shadow-ocean-500/40 hover:shadow-ocean-500/60'
              }
            `}
            title={actuallyConnected ? `Connected: ${displayText}` : 'Connect your wallet to start using the app'}
          >
            {actuallyConnected ? (
              <>
                {/* Colorful Avatar Dot */}
                <div 
                  className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-white/20"
                  style={{ backgroundColor: avatarColor }}
                />
                {/* Wallet Address */}
                <span className="font-mono">{displayText}</span>
              </>
            ) : (
              <>
                {/* Connect Wallet Icon */}
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
                <span>Connect Wallet</span>
              </>
            )}
          </button>
        )
      }}
    </ConnectKitButton.Custom>
  )
})

CustomConnectButton.displayName = 'CustomConnectButton'