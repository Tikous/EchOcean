# Drift Bottle 部署指南

## 开发环境运行

1. **安装依赖**
```bash
npm install
```

2. **配置环境变量**
复制 `.env.local` 文件并填入以下信息：
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: 从 [WalletConnect Cloud](https://cloud.walletconnect.com/) 获取
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`: Sepolia 测试网 RPC 端点 (可用 Infura 或 Alchemy)
- `NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS`: 部署后的合约地址

3. **启动开发服务器**
```bash
npm run dev
```

访问 http://localhost:3000

## 智能合约部署

### 选项1: 使用 Remix IDE (推荐)
1. 打开 [Remix IDE](https://remix.ethereum.org/)
2. 复制 `contracts/DriftBottle.sol` 内容到 Remix
3. 编译合约
4. 连接 MetaMask 到 Sepolia 测试网
5. 部署合约
6. 将合约地址添加到 `.env.local`

### 选项2: 使用 Hardhat
1. 安装 Hardhat:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

2. 创建 `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

3. 编译和部署:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

## 获取测试 ETH

访问 [Sepolia Faucet](https://sepoliafaucet.com/) 获取测试 ETH

## 注意事项

- 确保钱包已连接到 Sepolia 测试网
- 需要少量 Sepolia ETH 用于 gas 费
- 合约地址配置后需要重启开发服务器
- 在没有合约地址的情况下，前端将显示模拟数据

## 功能测试清单

- [ ] 连接 MetaMask 钱包
- [ ] 发送漂流瓶（需要 gas 费）
- [ ] 随机接收漂流瓶
- [ ] 回复漂流瓶
- [ ] 跳过漂流瓶
- [ ] 查看我的漂流瓶
- [ ] 查看回复历史
- [ ] 多账户交互测试