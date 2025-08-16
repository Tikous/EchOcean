'use client'

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'

// Types
interface BottleData {
  id: number
  content: string
  timestamp: number
  sender: string
  replyCount: number
  isActive: boolean
}

interface Web3DataState {
  // Global counters
  bottleCount: number
  activeBottleCount: number
  totalReplies: number
  
  // User-specific data
  userBottles: BottleData[]
  userReplies: any[]
  
  // Cache timestamps
  lastUpdated: {
    global: number
    userBottles: number
    userReplies: number
  }
  
  // Loading states
  isLoading: {
    global: boolean
    userBottles: boolean
    userReplies: boolean
  }
}

type Web3DataAction = 
  | { type: 'SET_GLOBAL_DATA'; payload: { bottleCount: number; activeBottleCount: number; totalReplies: number } }
  | { type: 'SET_USER_BOTTLES'; payload: BottleData[] }
  | { type: 'SET_USER_REPLIES'; payload: any[] }
  | { type: 'SET_LOADING'; payload: { key: keyof Web3DataState['isLoading']; value: boolean } }
  | { type: 'CLEAR_USER_DATA' }
  | { type: 'UPDATE_BOTTLE'; payload: { id: number; updates: Partial<BottleData> } }

const initialState: Web3DataState = {
  bottleCount: 0,
  activeBottleCount: 0,
  totalReplies: 0,
  userBottles: [],
  userReplies: [],
  lastUpdated: {
    global: 0,
    userBottles: 0,
    userReplies: 0,
  },
  isLoading: {
    global: false,
    userBottles: false,
    userReplies: false,
  },
}

function web3DataReducer(state: Web3DataState, action: Web3DataAction): Web3DataState {
  switch (action.type) {
    case 'SET_GLOBAL_DATA':
      return {
        ...state,
        ...action.payload,
        lastUpdated: {
          ...state.lastUpdated,
          global: Date.now(),
        },
      }
    
    case 'SET_USER_BOTTLES':
      return {
        ...state,
        userBottles: action.payload,
        lastUpdated: {
          ...state.lastUpdated,
          userBottles: Date.now(),
        },
      }
    
    case 'SET_USER_REPLIES':
      return {
        ...state,
        userReplies: action.payload,
        lastUpdated: {
          ...state.lastUpdated,
          userReplies: Date.now(),
        },
      }
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: {
          ...state.isLoading,
          [action.payload.key]: action.payload.value,
        },
      }
    
    case 'CLEAR_USER_DATA':
      return {
        ...state,
        userBottles: [],
        userReplies: [],
        lastUpdated: {
          ...state.lastUpdated,
          userBottles: 0,
          userReplies: 0,
        },
      }
    
    case 'UPDATE_BOTTLE':
      return {
        ...state,
        userBottles: state.userBottles.map(bottle =>
          bottle.id === action.payload.id
            ? { ...bottle, ...action.payload.updates }
            : bottle
        ),
      }
    
    default:
      return state
  }
}

// Context
const Web3DataContext = createContext<{
  state: Web3DataState
  dispatch: React.Dispatch<Web3DataAction>
  actions: {
    setGlobalData: (data: { bottleCount: number; activeBottleCount: number; totalReplies: number }) => void
    setUserBottles: (bottles: BottleData[]) => void
    setUserReplies: (replies: any[]) => void
    setLoading: (key: keyof Web3DataState['isLoading'], value: boolean) => void
    clearUserData: () => void
    updateBottle: (id: number, updates: Partial<BottleData>) => void
    // Cache utilities
    isDataStale: (key: keyof Web3DataState['lastUpdated'], maxAge?: number) => boolean
  }
} | null>(null)

// Provider component
export const Web3DataProvider = React.memo(function Web3DataProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [state, dispatch] = useReducer(web3DataReducer, initialState)
  const { address } = useAccount()

  // Clear user data when address changes
  React.useEffect(() => {
    if (!address) {
      dispatch({ type: 'CLEAR_USER_DATA' })
    }
  }, [address])

  // Memoized actions
  const actions = useMemo(() => ({
    setGlobalData: (data: { bottleCount: number; activeBottleCount: number; totalReplies: number }) => {
      dispatch({ type: 'SET_GLOBAL_DATA', payload: data })
    },
    
    setUserBottles: (bottles: BottleData[]) => {
      dispatch({ type: 'SET_USER_BOTTLES', payload: bottles })
    },
    
    setUserReplies: (replies: any[]) => {
      dispatch({ type: 'SET_USER_REPLIES', payload: replies })
    },
    
    setLoading: (key: keyof Web3DataState['isLoading'], value: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: { key, value } })
    },
    
    clearUserData: () => {
      dispatch({ type: 'CLEAR_USER_DATA' })
    },
    
    updateBottle: (id: number, updates: Partial<BottleData>) => {
      dispatch({ type: 'UPDATE_BOTTLE', payload: { id, updates } })
    },
    
    // Cache utility
    isDataStale: (key: keyof Web3DataState['lastUpdated'], maxAge = 60000) => { // 1 minute default
      const lastUpdate = state.lastUpdated[key]
      return !lastUpdate || (Date.now() - lastUpdate) > maxAge
    },
  }), [state.lastUpdated])

  const contextValue = useMemo(() => ({
    state,
    dispatch,
    actions,
  }), [state, actions])

  return (
    <Web3DataContext.Provider value={contextValue}>
      {children}
    </Web3DataContext.Provider>
  )
})

// Hook to use the context
export function useWeb3Data() {
  const context = useContext(Web3DataContext)
  if (!context) {
    throw new Error('useWeb3Data must be used within a Web3DataProvider')
  }
  return context
}

// Selectors for better performance
export const useWeb3DataSelectors = () => {
  const { state } = useWeb3Data()
  
  return useMemo(() => ({
    globalData: {
      bottleCount: state.bottleCount,
      activeBottleCount: state.activeBottleCount,
      totalReplies: state.totalReplies,
    },
    userBottles: state.userBottles,
    userReplies: state.userReplies,
    isLoading: state.isLoading,
    lastUpdated: state.lastUpdated,
  }), [state])
}