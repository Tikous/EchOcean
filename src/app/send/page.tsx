'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { BottleIcon } from '@/components/icons'
import { WalletConnectionRequired } from '@/components/WalletConnectionStatus'
import { ScaleLoadingIndicator } from '@/components/LoadingIndicator'
import { useDriftBottle } from '@/hooks/useDriftBottle'
import toast from 'react-hot-toast'

export default function SendPage() {
  const [message, setMessage] = useState('')
  const [transactionPhase, setTransactionPhase] = useState<'idle' | 'sending' | 'confirming'>('idle')
  
  const { isConnected, isConnecting, sendBottle, isLoading, isConfirmed, hash } = useDriftBottle()

  // Watch for transaction confirmation
  useEffect(() => {
    if (isConfirmed && transactionPhase === 'confirming') {
      setTransactionPhase('idle')
      setMessage('')
      toast.success('心声已成功投递到区块链海洋！💫')
    }
  }, [isConfirmed, transactionPhase])

  // Watch for transaction hash to update phase
  useEffect(() => {
    if (hash && transactionPhase === 'sending') {
      setTransactionPhase('confirming')
      toast.loading('等待区块链确认...', { duration: 1000 })
    }
  }, [hash, transactionPhase])

  const handleSend = async () => {
    if (!message.trim()) return
    
    if (!isConnected) {
      toast.error('请先连接钱包')
      return
    }
    
    try {
      console.log('发送漂流瓶:', message)
      setTransactionPhase('sending')
      
      // Use the real blockchain contract to send the bottle
      await sendBottle(message)
      
      // Don't reset form or show success here - wait for confirmation
      // The success toast will be shown in the useEffect when transaction is confirmed
    } catch (error) {
      console.error('Error sending bottle:', error)
      setTransactionPhase('idle')
      toast.error('投递心声失败: ' + (error as Error).message)
    }
  }


  return (
    <>
      <Navbar />
      
      <main className="min-h-screen pt-24 pb-12 px-4 page-transition">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">投递心声</h1>
            <p className="text-ocean-200 text-lg">
              将你的想法投入数字海洋，等待有缘的漫游者发现
            </p>
          </div>

          <WalletConnectionRequired>

          <div className="glass rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="message" className="block text-white font-medium mb-3">
                  你的消息
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="分享你的想法、梦想，或者一句简单的问候..."
                  className="w-full h-40 px-4 py-3 bg-ocean-800/50 border border-ocean-600 rounded-lg text-white placeholder-ocean-300 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-transparent resize-none"
                  maxLength={1000}
                />
                <div className="text-right mt-2">
                  <span className="text-ocean-300 text-sm">
                    {message.length}/1000 字符
                  </span>
                </div>
              </div>

              <div className="bg-ocean-800/30 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">📜 工作原理：</h3>
                <ul className="text-ocean-200 text-sm space-y-1">
                  <li>• 你的消息将永久保存在区块链上</li>
                  <li>• 其他用户可以随机发现你的漂流瓶</li>
                  <li>• 他们可以回复你，开始匿名对话</li>
                  <li>• 除非你选择透露，否则你的身份将保持私密</li>
                </ul>
              </div>

              <button
                onClick={handleSend}
                disabled={isLoading || !message.trim() || transactionPhase !== 'idle'}
                className="w-full bg-coral-500 hover:bg-coral-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 ripple-effect hover:shadow-lg hover:shadow-coral-500/25"
              >
                {transactionPhase === 'sending' ? (
                  <div className="flex items-center justify-center space-x-3">
                    <ScaleLoadingIndicator size="sm" text="" className="!space-y-0" />
                    <span>正在发送交易...</span>
                  </div>
                ) : transactionPhase === 'confirming' ? (
                  <div className="flex items-center justify-center space-x-3">
                    <ScaleLoadingIndicator size="sm" text="" className="!space-y-0" />
                    <span>等待区块链确认...</span>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <ScaleLoadingIndicator size="sm" text="" className="!space-y-0" />
                    <span>正在投入海洋...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>投递心声</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-ocean-300 text-sm">
              ✨ 你发送的每个漂流瓶都会在数字海洋中激起涟漪
            </p>
          </div>
          </WalletConnectionRequired>
        </div>
      </main>
    </>
  )
}