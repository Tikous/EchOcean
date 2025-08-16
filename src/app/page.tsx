'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { BottleIcon, WavesIcon, SearchIcon, EditIcon, SparkleIcon, MessageIcon } from '@/components/icons'
import { StatsCardSkeleton, OceanLoadingIndicator } from '@/components/LoadingIndicator'
import { useDriftBottle } from '@/hooks/useDriftBottle'
import { useReadContract } from 'wagmi'
import { DRIFT_BOTTLE_CONTRACT_ADDRESS, DRIFT_BOTTLE_ABI } from '@/lib/web3'

const Home = React.memo(function Home() {
  const [userCount, setUserCount] = useState<number>(0)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  
  const { bottleCount, activeBottleCount, isConnected } = useDriftBottle()
  
  // Get total reply count from the contract
  const { data: totalReplies, isLoading: isRepliesLoading } = useReadContract({
    address: DRIFT_BOTTLE_CONTRACT_ADDRESS,
    abi: DRIFT_BOTTLE_ABI,
    functionName: 'getTotalReplies',
    query: {
      enabled: !!DRIFT_BOTTLE_CONTRACT_ADDRESS,
      staleTime: 300000, // 5 minute cache
      gcTime: 600000, // 10 minute garbage collection
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  })

  // Estimate user count based on active bottles (simplified calculation)
  useEffect(() => {
    if (activeBottleCount > 0) {
      // Rough estimate: assume average of 2-3 bottles per user
      setUserCount(Math.ceil(activeBottleCount / 2.5))
    }
  }, [activeBottleCount])

  // Track loading state for stats
  useEffect(() => {
    if (bottleCount !== undefined && activeBottleCount !== undefined && totalReplies !== undefined) {
      setIsStatsLoading(false)
    }
  }, [bottleCount, activeBottleCount, totalReplies])

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen flex items-center justify-center pt-24 pb-12 px-4 page-transition">
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="animate-float mb-8">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                回响洋流
              </h1>
              <p className="text-xl md:text-2xl text-ocean-200 mb-8 max-w-2xl mx-auto">
                将你的想法投入区块链海洋，发现来自同行者的珍贵消息
              </p>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Link href="/send">
              <div className="glass hover-scale-override rounded-xl p-8 hover:bg-coral-500/10 transition-all duration-300 transform hover:scale-105 cursor-pointer group hover:animate-pulse-glow ripple-effect">
                <div className="mb-4 flex justify-center">
                  <WavesIcon className="text-coral-400 group-hover:animate-wave" size={60} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">投递心声</h3>
                <p className="text-ocean-200 mb-4">
                  将你的消息投入数字海洋，等待有缘人发现
                </p>
                <div className="bg-coral-500 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 group-hover:bg-coral-600 transition-colors">
                  <EditIcon size={16} />
                  <span>开始写作</span>
                </div>
              </div>
            </Link>

            <Link href="/receive">
              <div className="glass hover-scale-override rounded-xl p-8 hover:bg-coral-500/10 transition-all duration-300 transform hover:scale-105 cursor-pointer group hover:animate-pulse-glow ripple-effect">
                <div className="mb-4 flex justify-center">
                  <SearchIcon className="text-ocean-400 group-hover:animate-float" size={60} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">捕捞回音</h3>
                <p className="text-ocean-200 mb-4">
                  从区块链海洋深处发现随机的珍贵消息
                </p>
                <div className="bg-coral-500 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 group-hover:bg-coral-600 transition-colors">
                  <SearchIcon size={16} />
                  <span>开始探索</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Features Section */}
          <div className="glass rounded-xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-white text-center mb-8">使用方法</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <EditIcon className="text-coral-400" size={48} />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">编写并发送</h4>
                <p className="text-ocean-200 text-sm">
                  分享你的想法、梦想或智慧。你的消息将永远保存在区块链上。
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <SparkleIcon className="text-ocean-400" size={48} />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">随机发现</h4>
                <p className="text-ocean-200 text-sm">
                  我们的算法会随机为你选择回音，创造意外的美好连接。
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <MessageIcon className="text-green-400" size={48} />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">匿名对话</h4>
                <p className="text-ocean-200 text-sm">
                  回复回音，在保护隐私的同时开始有意义的对话。
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          {isStatsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {Array.from({ length: 4 }).map((_, index) => (
                <StatsCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="glass rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-coral-400">
                  {bottleCount > 0 ? bottleCount.toLocaleString() : '∞'}
                </div>
                <div className="text-ocean-200 text-sm">已投递心声</div>
              </div>
              <div className="glass rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-ocean-400">
                  {totalReplies ? (typeof totalReplies === 'bigint' ? Number(totalReplies) : Number(totalReplies)).toLocaleString() : '∞'}
                </div>
                <div className="text-ocean-200 text-sm">建立的连接</div>
              </div>
              <div className="glass rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {activeBottleCount > 0 ? activeBottleCount.toLocaleString() : '∞'}
                </div>
                <div className="text-ocean-200 text-sm">活跃对话</div>
              </div>
              <div className="glass rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {userCount > 0 ? userCount.toLocaleString() : '∞'}
                </div>
                <div className="text-ocean-200 text-sm">海洋探索者</div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-ocean-300 text-sm">
            <p className="mb-2">✨ 为Web3社区用心打造</p>
            <p>每一条消息都会在数字海洋中激起涟漪</p>
          </div>
        </div>
      </main>
    </>
  )
})

Home.displayName = 'Home'

export default Home