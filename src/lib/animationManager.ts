// Animation state manager for preserving animation continuity across page transitions

class AnimationStateManager {
  private static instance: AnimationStateManager
  private animationStates: Map<string, any> = new Map()
  private sessionKey = 'drift-bottle-animations'

  static getInstance(): AnimationStateManager {
    if (!AnimationStateManager.instance) {
      AnimationStateManager.instance = new AnimationStateManager()
    }
    return AnimationStateManager.instance
  }

  // Initialize animation tracking
  initializeAnimations() {
    if (typeof window === 'undefined') return

    // Create a stable session for animation continuity
    const sessionId = this.getOrCreateSessionId()
    
    // Track animation start time for synchronized playback
    if (!this.animationStates.has('backgroundStartTime')) {
      this.animationStates.set('backgroundStartTime', Date.now())
      this.saveToSession()
    }

    return sessionId
  }

  // Get or create a stable session ID
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'ssr'

    let sessionId = sessionStorage.getItem(`${this.sessionKey}-session`)
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      sessionStorage.setItem(`${this.sessionKey}-session`, sessionId)
    }
    return sessionId
  }

  // Calculate animation offset for consistent timing
  getAnimationOffset(animationName: string): number {
    const startTime = this.animationStates.get('backgroundStartTime') || Date.now()
    const currentTime = Date.now()
    const elapsed = currentTime - startTime

    // Return offset as percentage of animation cycle
    switch (animationName) {
      case 'background-fade':
        return (elapsed % 20000) / 20000 // 20s cycle
      case 'background-pulse':
        return (elapsed % 25000) / 25000 // 25s cycle
      case 'bubble-rise':
        return (elapsed % 10000) / 10000 // 10s cycle
      default:
        return 0
    }
  }

  // Preserve animation state to session storage
  private saveToSession() {
    if (typeof window === 'undefined') return

    const stateData = Object.fromEntries(this.animationStates)
    sessionStorage.setItem(this.sessionKey, JSON.stringify(stateData))
  }

  // Restore animation state from session storage
  private restoreFromSession() {
    if (typeof window === 'undefined') return

    const saved = sessionStorage.getItem(this.sessionKey)
    if (saved) {
      try {
        const stateData = JSON.parse(saved)
        this.animationStates = new Map(Object.entries(stateData))
      } catch (e) {
        console.warn('Failed to restore animation state:', e)
      }
    }
  }

  // Apply CSS animation delay based on session state
  applyAnimationContinuity(element: HTMLElement, animationName: string) {
    if (!element || typeof window === 'undefined') return

    const offset = this.getAnimationOffset(animationName)
    
    // Apply negative delay to sync with existing timeline
    if (offset > 0) {
      const duration = this.getAnimationDuration(animationName)
      const delay = -(offset * duration)
      element.style.animationDelay = `${delay}ms`
    }
  }

  // Get animation duration in milliseconds
  private getAnimationDuration(animationName: string): number {
    switch (animationName) {
      case 'background-fade':
        return 20000
      case 'background-pulse':
        return 25000
      case 'bubble-rise':
        return 10000
      default:
        return 1000
    }
  }

  // Reset animation state (useful for development)
  reset() {
    this.animationStates.clear()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.sessionKey)
      sessionStorage.removeItem(`${this.sessionKey}-session`)
    }
  }
}

export const animationManager = AnimationStateManager.getInstance()

// Utility function for easier use in components
export function preserveAnimationContinuity() {
  return animationManager.initializeAnimations()
}

// Apply animation continuity to an element
export function applyAnimationContinuity(element: HTMLElement, animationName: string) {
  animationManager.applyAnimationContinuity(element, animationName)
}