'use client'

import { useEffect, useState } from 'react'
import { SharedBackground } from './SharedBackground'

// Client-only wrapper to prevent hydration mismatches
export function ClientOnlyBackground() {
  const [mounted, setMounted] = useState(false)

  // Ensure component only renders on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent rendering during SSR to avoid hydration mismatches
  if (!mounted) {
    return null
  }

  return <SharedBackground />
}

ClientOnlyBackground.displayName = 'ClientOnlyBackground'