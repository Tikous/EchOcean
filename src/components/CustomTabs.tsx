'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface Tab {
  id: string
  label: string
  path: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

interface CustomTabsProps {
  tabs: Tab[]
  className?: string
}

export const CustomTabs = React.memo(function CustomTabs({ tabs, className = '' }: CustomTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Initialize activeTab with current path to prevent flickering
  const getCurrentTabId = () => {
    const currentTab = tabs.find(tab => tab.path === pathname)
    return currentTab?.id || ''
  }
  
  const [activeTab, setActiveTab] = useState<string>(getCurrentTabId)

  // Update active tab based on current path
  useEffect(() => {
    const currentTab = tabs.find(tab => tab.path === pathname)
    if (currentTab && currentTab.id !== activeTab) {
      setActiveTab(currentTab.id)
    }
  }, [pathname, tabs, activeTab])

  const handleTabClick = useCallback((tab: Tab) => {
    // Prevent unnecessary state updates if already on the same tab
    if (activeTab === tab.id) return
    
    setActiveTab(tab.id)
    // Ensure client-side navigation without refresh
    router.push(tab.path, { scroll: false })
  }, [router, activeTab])

  return (
    <div className={`custom-tabs ${className}`}>
      {/* Desktop Tabs */}
      <div className="hidden md:flex items-center space-x-1 bg-ocean-900/30 rounded-xl p-1 backdrop-blur-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const IconComponent = tab.icon
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`
                flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 ease-in-out min-w-max
                ${isActive 
                  ? 'bg-coral-500 text-white shadow-lg shadow-coral-500/25 transform scale-105' 
                  : 'text-ocean-200 hover:text-white hover:bg-ocean-800/50'
                }
              `}
            >
              <IconComponent 
                size={18} 
                className={`transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-ocean-300'
                }`} 
              />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden">
        <div className="border-t border-ocean-700 bg-ocean-900/50 backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-1 p-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const IconComponent = tab.icon
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`
                    flex flex-col items-center space-y-1 px-2 py-3 rounded-lg text-xs
                    transition-all duration-200 ease-in-out
                    ${isActive 
                      ? 'bg-coral-500/20 text-coral-300 border border-coral-500/30' 
                      : 'text-ocean-300 hover:text-white hover:bg-ocean-800/30'
                    }
                  `}
                >
                  <IconComponent 
                    size={20} 
                    className={`transition-colors duration-200 ${
                      isActive ? 'text-coral-400' : 'text-ocean-400'
                    }`} 
                  />
                  <span className="font-medium leading-tight">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})

// Advanced tab with indicator animation
export const AnimatedTabs = React.memo(function AnimatedTabs({ tabs, className = '' }: CustomTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Initialize activeTab with current path to prevent flickering
  const getCurrentTabId = () => {
    const currentTab = tabs.find(tab => tab.path === pathname)
    return currentTab?.id || ''
  }
  
  const [activeTab, setActiveTab] = useState<string>(getCurrentTabId)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const currentTab = tabs.find(tab => tab.path === pathname)
    if (currentTab && currentTab.id !== activeTab) {
      setActiveTab(currentTab.id)
      updateIndicator(currentTab.id)
    }
  }, [pathname, tabs, activeTab])

  const updateIndicator = (tabId: string) => {
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement
    if (tabElement) {
      const { offsetLeft, offsetWidth } = tabElement
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth })
    }
  }

  const handleTabClick = useCallback((tab: Tab) => {
    // Prevent unnecessary updates if already on the same tab
    if (activeTab === tab.id) return
    
    setActiveTab(tab.id)
    updateIndicator(tab.id)
    // Client-side navigation only
    router.push(tab.path, { scroll: false })
  }, [router, activeTab])

  return (
    <div className={`animated-tabs ${className}`}>
      <div className="hidden md:flex items-center relative bg-ocean-900/30 rounded-xl p-1 backdrop-blur-sm">
        {/* Animated indicator */}
        <div 
          className="absolute top-1 bottom-1 bg-coral-500 rounded-lg transition-all duration-300 ease-out shadow-lg shadow-coral-500/25"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
        
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const IconComponent = tab.icon
          
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`
                relative z-10 flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-200 min-w-max
                ${isActive 
                  ? 'text-white' 
                  : 'text-ocean-200 hover:text-white'
                }
              `}
            >
              <IconComponent size={18} className="transition-colors duration-200" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})