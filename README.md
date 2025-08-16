# EchOcean 🌊

A high-performance Web3 decentralized application where users can send anonymous messages (drift bottles) across the blockchain ocean and discover bottles from fellow wanderers. Built on Monad Testnet for blazing-fast transactions and minimal fees.

## Features

- 🍼 **Send Drift Bottles**: Cast your thoughts into the digital ocean
- 🔍 **Discover Bottles**: Find random messages from other users
- 💬 **Reply to Bottles**: Engage in anonymous conversations
- 👀 **Privacy Controls**: Advanced visibility management for replies
- 🌊 **Ocean Theme**: Beautiful marine-inspired UI/UX
- ⚡ **High Performance**: Built on Monad for 10,000+ TPS and 1-second finality
- 🔒 **Enterprise Security**: Advanced data validation, encryption, and XSS protection
- 💰 **Low Fees**: Minimal transaction costs on Monad Testnet

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Chakra UI
- **Web3**: ConnectKit, Wagmi, Viem, Ethers.js
- **Blockchain**: Monad Testnet (High-performance EVM-compatible Layer 1)
- **Smart Contract**: Solidity
- **Security**: DOMPurify, Rate Limiting, Data Encryption, Type Safety
- **Performance**: Intelligent Caching, SSR Optimization, Gas Cost Protection

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- MON tokens from [Monad Testnet Faucet](https://faucet.monad.xyz)

### Installation

1. Clone the repository
```bash
git clone https://github.com/Tikous/EchOcean.git
cd EchOcean
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

4. Add Monad Testnet to your wallet
   - **Network Name**: Monad Testnet
   - **RPC URL**: https://testnet-rpc.monad.xyz
   - **Chain ID**: 10143
   - **Currency Symbol**: MON
   - **Block Explorer**: https://testnet.monadexplorer.com

5. Run the development server
```bash
npm run dev
```

### Environment Variables

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
- `NEXT_PUBLIC_MONAD_TESTNET_RPC_URL`: Monad Testnet RPC endpoint (default: https://testnet-rpc.monad.xyz)
- `NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS`: Smart contract address (filled after deployment)
- `PRIVATE_KEY`: Your wallet private key for contract deployment (keep secure!)

## Smart Contract Deployment

Deploy the EchOcean smart contract to Monad Testnet:

```bash
# Compile the contract
npx hardhat compile

# Deploy to Monad Testnet
npx hardhat run scripts/deploy.js --network monadTestnet

# Verify on Monad Explorer (if supported)
npx hardhat verify --network monadTestnet <CONTRACT_ADDRESS>
```

The EchOcean smart contract manages:
- Bottle creation and storage
- Random bottle retrieval
- Reply mechanisms
- User visibility states
- Gas-optimized operations for Monad's high throughput

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
├── lib/                 # Utility functions and Web3 config
│   ├── web3.ts         # Monad Testnet configuration
│   ├── security.ts     # Data validation & XSS protection
│   ├── secureStorage.ts # Encrypted localStorage
│   └── errorHandling.ts # Enhanced error management
├── hooks/              # Custom React hooks
contracts/              # Smart contracts
scripts/                # Deployment scripts
```

## Security Features

EchOcean implements enterprise-grade security:

- **XSS Protection**: DOMPurify sanitization for all user inputs
- **Rate Limiting**: Prevents spam and abuse
- **Data Encryption**: Secure localStorage with encryption
- **Type Safety**: Runtime validation of blockchain data
- **Gas Protection**: Prevents overpaying for transactions
- **Error Handling**: Structured error management without security leaks

## Why Monad?

EchOcean leverages Monad's unique advantages:

- **⚡ 10,000+ TPS**: Near-instant message sending and replies
- **💰 Low Fees**: Minimal costs for all transactions
- **🔗 EVM Compatible**: Seamless migration from Ethereum
- **🚀 1-Second Finality**: Immediate transaction confirmation
- **🔄 Parallel Execution**: Optimized smart contract performance

## Links

- **Live Demo**: Coming soon
- **GitHub**: [https://github.com/Tikous/EchOcean](https://github.com/Tikous/EchOcean)
- **Monad Testnet**: [https://testnet.monad.xyz](https://testnet.monad.xyz)
- **Faucet**: [https://faucet.monad.xyz](https://faucet.monad.xyz)
- **Explorer**: [https://testnet.monadexplorer.com](https://testnet.monadexplorer.com)

## Contributing

This project showcases the power of Monad's high-performance blockchain. Feel free to fork and improve!

## License

MIT License