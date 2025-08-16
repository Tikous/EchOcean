'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: React.ReactNode
}

export const PageTransition = React.memo(function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    // Start transition
    setIsTransitioning(true)
    
    // Short delay to show loading state
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setIsTransitioning(false)
    }, 150) // Quick transition

    return () => clearTimeout(timer)
  }, [pathname, children])

  return (
    <div className={`page-transition-wrapper ${isTransitioning ? 'transitioning' : ''}`}>
      {/* Loading overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-950/50 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-8 h-8 border-2 border-coral-300/30 rounded-full"></div>
            </div>
            <p className="text-coral-300 text-sm font-medium">切换页面中...</p>
          </div>
        </div>
      )}
      
      {/* Page content */}
      <div 
        className="will-change-transform"
        style={{
          transform: isTransitioning 
            ? 'translate3d(0, 8px, 0) scale3d(0.95, 0.95, 1)'
            : 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
          opacity: isTransitioning ? 0 : 1,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'center center'
        }}
      >
        {displayChildren}
      </div>
    </div>
  )
})

// Route-aware navigation loading indicator
export const NavigationLoader = React.memo(function NavigationLoader() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [pathname])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-coral-500 to-coral-400">
      <div className="h-full bg-gradient-to-r from-coral-400 to-coral-300 animate-pulse"></div>
    </div>
  )
})