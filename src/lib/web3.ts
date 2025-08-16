import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'
import { DRIFT_BOTTLE_ABI } from './contract-abi'
import { defineChain } from 'viem'

// Define Monad Testnet chain
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
})

export const config = createConfig(
  getDefaultConfig({
    // Your dApps chains - using Monad Testnet as primary
    chains: [monadTestnet, sepolia],
    transports: {
      [monadTestnet.id]: http(process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'),
      [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.gateway.tenderly.co'),
    },

    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || (() => {
      console.error('⚠️ WALLETCONNECT_PROJECT_ID not configured. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local')
      return ''
    })(),

    // Required App Info
    appName: 'EchOcean',
    appDescription: 'Send anonymous messages across the blockchain ocean on Monad',
    appUrl: 'https://echocean.vercel.app',
    appIcon: 'https://echocean.vercel.app/icon.png',
    
    // SSR configuration
    ssr: false, // 禁用 SSR 以减少 hydration 问题
    
    // Connection behavior configuration
    syncConnectedChain: false, // 减少自动同步，防止导航时重连
    multiInjectedProviderDiscovery: false, // 减少provider发现的开销
  }),
)

// Contract address (will be updated after deployment)
export const DRIFT_BOTTLE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS as `0x${string}`

// Export the ABI
export { DRIFT_BOTTLE_ABI }