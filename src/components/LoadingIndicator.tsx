'use client'

import React from 'react'
import { ClipLoader, PulseLoader, ScaleLoader, GridLoader } from 'react-spinners'

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export const LoadingIndicator = React.memo(function LoadingIndicator({ 
  size = 'md', 
  text = '加载中...', 
  className = '' 
}: LoadingIndicatorProps) {
  const spinnerSizes = {
    sm: 25,
    md: 35,
    lg: 50
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <ClipLoader
        color="#06b6d4"
        size={spinnerSizes[size]}
        loading={true}
        cssOverride={{
          borderWidth: '3px',
          display: 'block',
          margin: '0 auto',
          borderTopColor: 'transparent',
        }}
        speedMultiplier={1.2} // Increase speed to make it more noticeable
        aria-label="Loading Spinner"
        data-testid="loader"
      />
      <p className={`text-ocean-200 ${textSizeClasses[size]} animate-pulse`}>
        {text}
      </p>
    </div>
  )
})

LoadingIndicator.displayName = 'LoadingIndicator'

// Ocean-themed loading component
export const OceanLoadingIndicator = React.memo(function OceanLoadingIndicator({ 
  size = 'md', 
  text = '海洋中探索...', 
  className = '' 
}: LoadingIndicatorProps) {
  const spinnerSizes = {
    sm: 20,
    md: 30,
    lg: 40
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="relative">
        <PulseLoader
          color="#0ea5e9"
          size={spinnerSizes[size]}
          loading={true}
          speedMultiplier={1.0} // Increase speed for better visibility
          margin={4}
          cssOverride={{
            display: 'block',
          }}
        />
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="text-2xl animate-bounce">🌊</div>
        </div>
      </div>
      <p className={`text-ocean-200 ${textSizeClasses[size]} animate-pulse`}>
        {text}
      </p>
    </div>
  )
})

OceanLoadingIndicator.displayName = 'OceanLoadingIndicator'

// Grid loading for complex operations
export const GridLoadingIndicator = React.memo(function GridLoadingIndicator({ 
  size = 'md', 
  text = '处理中...', 
  className = '' 
}: LoadingIndicatorProps) {
  const spinnerSizes = {
    sm: 8,
    md: 12,
    lg: 16
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <GridLoader
        color="#f97316"
        size={spinnerSizes[size]}
        loading={true}
        speedMultiplier={0.7}
        margin={2}
      />
      <p className={`text-ocean-200 ${textSizeClasses[size]} animate-pulse`}>
        {text}
      </p>
    </div>
  )
})

GridLoadingIndicator.displayName = 'GridLoadingIndicator'

// Scale loading for smooth effects
export const ScaleLoadingIndicator = React.memo(function ScaleLoadingIndicator({ 
  size = 'md', 
  text = '同步中...', 
  className = '' 
}: LoadingIndicatorProps) {
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <ScaleLoader
        color="#8b5cf6"
        height={size === 'sm' ? 20 : size === 'md' ? 35 : 50}
        width={size === 'sm' ? 3 : size === 'md' ? 4 : 6}
        loading={true}
        speedMultiplier={0.8}
        margin={2}
      />
      <p className={`text-ocean-200 ${textSizeClasses[size]} animate-pulse`}>
        {text}
      </p>
    </div>
  )
})

ScaleLoadingIndicator.displayName = 'ScaleLoadingIndicator'

// Skeleton components for better loading UX
export const ConversationSkeleton = React.memo(function ConversationSkeleton() {
  return (
    <div className="glass rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-ocean-600 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-ocean-600 rounded w-32"></div>
            <div className="h-3 bg-ocean-700 rounded w-24"></div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="h-4 bg-ocean-600 rounded w-16"></div>
          <div className="h-6 bg-ocean-600 rounded w-12"></div>
        </div>
      </div>
      
      {/* Original Message Skeleton */}
      <div className="mb-6">
        <div className="h-3 bg-ocean-700 rounded w-40 mb-2"></div>
        <div className="bg-ocean-800/30 rounded-lg p-4">
          <div className="space-y-2">
            <div className="h-4 bg-ocean-600 rounded w-full"></div>
            <div className="h-4 bg-ocean-600 rounded w-3/4"></div>
          </div>
        </div>
      </div>
      
      {/* Reply Skeleton */}
      <div className="mb-4">
        <div className="h-3 bg-ocean-700 rounded w-32 mb-2"></div>
        <div className="bg-coral-500/10 border border-coral-500/30 rounded-lg p-4">
          <div className="space-y-2">
            <div className="h-4 bg-coral-400/30 rounded w-full"></div>
            <div className="h-4 bg-coral-400/30 rounded w-2/3"></div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="h-4 bg-ocean-600 rounded w-24"></div>
        <div className="h-3 bg-ocean-700 rounded w-32"></div>
      </div>
    </div>
  )
})

ConversationSkeleton.displayName = 'ConversationSkeleton'

export const ConversationListSkeleton = React.memo(function ConversationListSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <ConversationSkeleton key={index} />
      ))}
    </div>
  )
})

ConversationListSkeleton.displayName = 'ConversationListSkeleton'

// Bottle Card Skeleton for My Bottles page
export const BottleCardSkeleton = React.memo(function BottleCardSkeleton() {
  return (
    <div className="glass rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-ocean-600 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-ocean-600 rounded w-24"></div>
            <div className="h-3 bg-ocean-700 rounded w-32"></div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-5 bg-ocean-600 rounded w-12"></div>
          <div className="h-5 bg-ocean-600 rounded w-16"></div>
        </div>
      </div>
      
      <div className="bg-ocean-800/30 rounded-lg p-4 mb-4">
        <div className="space-y-2">
          <div className="h-4 bg-ocean-600 rounded w-full"></div>
          <div className="h-4 bg-ocean-600 rounded w-4/5"></div>
          <div className="h-4 bg-ocean-600 rounded w-3/5"></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="h-4 bg-ocean-600 rounded w-20"></div>
        <div className="h-8 bg-ocean-600 rounded w-16"></div>
      </div>
    </div>
  )
})

BottleCardSkeleton.displayName = 'BottleCardSkeleton'

// Bottle List Skeleton for My Bottles page
export const BottleListSkeleton = React.memo(function BottleListSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <BottleCardSkeleton key={index} />
      ))}
    </div>
  )
})

BottleListSkeleton.displayName = 'BottleListSkeleton'

// Stats Card Skeleton for Homepage
export const StatsCardSkeleton = React.memo(function StatsCardSkeleton() {
  return (
    <div className="glass rounded-lg p-4 text-center">
      <div className="animate-pulse">
        <div className="h-8 bg-gradient-to-r from-ocean-600 to-coral-600 rounded mb-2"></div>
        <div className="h-4 bg-ocean-700 rounded mx-auto w-16"></div>
      </div>
    </div>
  )
})

StatsCardSkeleton.displayName = 'StatsCardSkeleton'

// Form Skeleton for Send page
export const FormSkeleton = React.memo(function FormSkeleton() {
  return (
    <div className="glass rounded-xl p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-6 bg-ocean-600 rounded w-32"></div>
        <div className="bg-ocean-800/30 rounded-lg p-4">
          <div className="space-y-3">
            <div className="h-4 bg-ocean-600 rounded w-full"></div>
            <div className="h-4 bg-ocean-600 rounded w-5/6"></div>
            <div className="h-4 bg-ocean-600 rounded w-4/6"></div>
            <div className="h-4 bg-ocean-600 rounded w-3/6"></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-ocean-700 rounded w-20"></div>
          <div className="h-10 bg-ocean-600 rounded w-24"></div>
        </div>
      </div>
    </div>
  )
})

FormSkeleton.displayName = 'FormSkeleton'

// Random Bottle Discovery Skeleton for Receive page
export const BottleDiscoverySkeleton = React.memo(function BottleDiscoverySkeleton() {
  return (
    <div className="glass rounded-xl p-8 max-w-2xl mx-auto">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <OceanLoadingIndicator size="lg" text="在数字海洋中寻找回音..." />
        </div>
        <div className="bg-ocean-800/30 rounded-lg p-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-gradient-to-r from-ocean-600 to-transparent rounded w-full"></div>
            <div className="h-4 bg-gradient-to-r from-ocean-600 to-transparent rounded w-5/6 mx-auto"></div>
            <div className="h-4 bg-gradient-to-r from-ocean-600 to-transparent rounded w-4/6 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  )
})

BottleDiscoverySkeleton.displayName = 'BottleDiscoverySkeleton'