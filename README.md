# Drift Bottle 🍼

A Web3 decentralized application where users can send anonymous messages (drift bottles) across the blockchain ocean and discover bottles from fellow wanderers.

## Features

- 🍼 **Send Drift Bottles**: Cast your thoughts into the digital ocean
- 🔍 **Discover Bottles**: Find random messages from other users
- 💬 **Reply to Bottles**: Engage in anonymous conversations
- 👀 **Privacy Controls**: Advanced visibility management for replies
- 🌊 **Ocean Theme**: Beautiful marine-inspired UI/UX

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Chakra UI
- **Web3**: ConnectKit, Wagmi, Viem, Ethers.js
- **Blockchain**: Ethereum Sepolia Testnet
- **Smart Contract**: Solidity

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- Sepolia ETH for testing

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd driftBottle
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

4. Run the development server
```bash
npm run dev
```

### Environment Variables

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`: Sepolia RPC endpoint
- `NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS`: Smart contract address (filled after deployment)

## Smart Contract

The DriftBottle smart contract manages:
- Bottle creation and storage
- Random bottle retrieval
- Reply mechanisms
- User visibility states

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
├── lib/                 # Utility functions and Web3 config
├── hooks/              # Custom React hooks
contracts/              # Smart contracts
scripts/                # Deployment scripts
```

## Contributing

This project was built for a Web3 hackathon. Feel free to fork and improve!

## License

MIT License