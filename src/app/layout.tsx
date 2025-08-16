import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/components/Web3Provider'
import { Toaster } from 'react-hot-toast'
import { ClientOnlyBackground } from '@/components/ClientOnlyBackground'
import { WalletDebugMonitor } from '@/components/WalletDebugMonitor'
import { SystemHealthMonitor } from '@/components/SystemHealthMonitor'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Prevent FOUT by swapping to web font when ready
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
})

export const metadata: Metadata = {
  title: 'Drift Bottle - Web3 Message in a Bottle',
  description: 'Send anonymous messages across the blockchain ocean',
  keywords: ['web3', 'blockchain', 'messages', 'anonymous', 'drift bottle'],
  authors: [{ name: 'Drift Bottle Team' }],
  creator: 'Drift Bottle Team',
  publisher: 'Drift Bottle Team',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: '回响洋流 - Web3 消息漂流瓶',
    description: '将你的想法投入区块链海洋，发现来自同行者的珍贵消息',
    siteName: '回响洋流',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '回响洋流 - Web3 消息漂流瓶',
    description: '将你的想法投入区块链海洋，发现来自同行者的珍贵消息',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" className="scroll-smooth">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning={true}>
        <ClientOnlyBackground />
        <Web3Provider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(30, 41, 59, 0.95)',
                color: 'white',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: 'white',
                },
              },
            }}
          />
          <WalletDebugMonitor />
          <SystemHealthMonitor />
        </Web3Provider>
      </body>
    </html>
  )
}