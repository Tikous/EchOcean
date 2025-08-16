'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { BottleIcon, SendIconCustom, SearchIconCustom, MessageIconCustom } from './icons'
import { CustomTabs } from './CustomTabs'
import { WalletStatusIndicator } from './WalletConnectionStatus'
import { CustomConnectButton } from './CustomConnectButton'
import { useDriftBottle } from '@/hooks/useDriftBottle'

export const Navbar = React.memo(function Navbar() {
  const { isConnected } = useDriftBottle()

  const navTabs = [
    {
      id: 'send',
      label: '投递心声',
      path: '/send',
      icon: SendIconCustom
    },
    {
      id: 'receive',
      label: '捕捞回音',
      path: '/receive',
      icon: SearchIconCustom
    },
    {
      id: 'my-bottles',
      label: '我的涟漪',
      path: '/my-bottles',
      icon: BottleIcon
    },
    {
      id: 'replies',
      label: '共鸣足迹',
      path: '/replies',
      icon: MessageIconCustom
    }
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ocean-800/70 backdrop-blur-md border-b border-ocean-500/30 shadow-lg shadow-ocean-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 min-w-0">
            <BottleIcon className="flex-shrink-0" size={40} />
            <span className="text-2xl font-bold text-white tracking-wide whitespace-nowrap">回响洋流</span>
          </Link>

          {/* Navigation Tabs - Desktop */}
          <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-8">
            <CustomTabs tabs={navTabs} />
          </div>

          {/* Wallet Section */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Wallet Status Indicator - Only show when not connected */}
            {!isConnected && (
              <div className="hidden lg:block">
                <WalletStatusIndicator />
              </div>
            )}
            
            {/* Connect Wallet Button */}
            <div className="transition-all duration-300">
              <CustomConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="md:hidden">
        <CustomTabs tabs={navTabs} />
      </div>
    </nav>
  )
})