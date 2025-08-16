# 🚀 部署说明

## 第1步：添加私钥
在 `.env.local` 文件中，取消注释并添加你的私钥：

```bash
# Private Key for deployment (add your private key here - keep it secure!)
PRIVATE_KEY=0x你的私钥这里
```

**⚠️ 安全提醒：**
- 确保 `.env.local` 在 `.gitignore` 中
- 不要将私钥提交到版本控制
- 只用于测试网，不要用主网私钥

## 第2步：确保有测试ETH
确保你的钱包地址在 Sepolia 测试网有一些 ETH：
- 访问 https://sepoliafaucet.com/
- 输入你的钱包地址获取测试 ETH

## 第3步：部署合约
```bash
npx hardhat run scripts/deploy-hardhat.js --network sepolia
```

## 第4步：启动前端
```bash
npm run dev
```

## 部署后
- 合约地址会自动更新到 `.env.local`
- 打开 http://localhost:3000 开始使用！