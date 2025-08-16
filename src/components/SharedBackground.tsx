'use client'

import { memo, useLayoutEffect, useRef } from 'react'
import { preserveAnimationContinuity, applyAnimationContinuity } from '@/lib/animationManager'

// Memoized background component with enhanced animation continuity and stable references
export const SharedBackground = memo(function SharedBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null)
  const bubblesRef = useRef<HTMLDivElement>(null)

  // Use layoutEffect for synchronous animation setup
  useLayoutEffect(() => {
    // Initialize animation state management
    preserveAnimationContinuity()
    
    // Ensure animations are properly initialized and synced
    if (backgroundRef.current && bubblesRef.current) {
      // Force style recalculation to ensure animations start properly
      backgroundRef.current.style.willChange = 'transform'
      bubblesRef.current.style.willChange = 'transform'
      
      // Apply animation continuity to background layers
      const layers = backgroundRef.current.querySelectorAll('[class*="dynamic-background-layer"]')
      layers.forEach((layer, index) => {
        const animationName = index < 2 ? 'background-fade' : 'background-pulse'
        applyAnimationContinuity(layer as HTMLElement, animationName)
      })
      
      // Apply animation continuity to bubbles
      const bubbles = bubblesRef.current.querySelectorAll('.bubble')
      bubbles.forEach((bubble) => {
        applyAnimationContinuity(bubble as HTMLElement, 'bubble-rise')
      })
      
      // Trigger style recalculation to apply changes
      void backgroundRef.current.offsetHeight
      void bubblesRef.current.offsetHeight
    }
  }, [])

  return (
    <>
      {/* Dynamic background layers with enhanced animation stability */}
      <div 
        ref={backgroundRef}
        className="dynamic-background"
        style={{
          // Ensure stable animation context
          isolation: 'isolate',
          contain: 'layout style paint',
        }}
      >
        <div className="dynamic-background-layer-1"></div>
        <div className="dynamic-background-layer-2"></div>
        <div className="dynamic-background-layer-3"></div>
      </div>
      
      {/* Floating bubbles with continuous animation state */}
      <div 
        ref={bubblesRef}
        className="ocean-bubbles"
        style={{
          // Maintain animation layer isolation
          isolation: 'isolate',
          contain: 'layout style paint',
        }}
      >
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
        <div className="bubble bubble-4"></div>
      </div>
    </>
  )
}) // Use default memo behavior - no props to compare

SharedBackground.displayName = 'SharedBackground'