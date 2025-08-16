const { ethers } = require('ethers');
const fs = require('fs');

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

// 读取编译后的合约
const contractArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/DriftBottle.sol/DriftBottle.json', 'utf8'));

async function main() {
  console.log("🚀 开始部署 EchOcean 合约到 Monad Testnet...");

  // 从环境变量或命令行参数获取私钥
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ 请设置 PRIVATE_KEY 环境变量");
    process.exit(1);
  }

  // 设置 Monad Testnet 提供商
  const rpcUrl = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // 创建钱包
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("📍 部署账户:", wallet.address);
  
  // 检查余额
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "MON");
  
  if (balance === 0n) {
    console.error("❌ 账户余额不足，请从水龙头获取 MON 代币:");
    console.error("   https://faucet.monad.xyz");
    process.exit(1);
  }

  // 获取网络信息
  const network = await provider.getNetwork();
  console.log("⛓️  网络 Chain ID:", network.chainId.toString());
  
  if (network.chainId !== 10143n) {
    console.error("❌ 错误的网络，请确保连接到 Monad Testnet (Chain ID: 10143)");
    process.exit(1);
  }

  // 创建合约工厂
  const contractFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );

  console.log("📦 正在部署合约...");
  
  // 部署合约
  const driftBottle = await contractFactory.deploy();
  
  console.log("⏳ 等待部署交易确认...");
  const deploymentReceipt = await driftBottle.deploymentTransaction().wait();
  
  const contractAddress = await driftBottle.getAddress();
  
  console.log("✅ EchOcean 合约部署成功!");
  console.log("📍 合约地址:", contractAddress);
  console.log("💎 部署交易:", deploymentReceipt.hash);
  console.log("⛽ 使用 Gas:", deploymentReceipt.gasUsed.toString());

  // 保存部署信息
  const deploymentInfo = {
    contractAddress: contractAddress,
    deploymentTime: new Date().toISOString(),
    network: "monadTestnet",
    chainId: 10143,
    deployer: wallet.address,
    deploymentHash: deploymentReceipt.hash,
    gasUsed: deploymentReceipt.gasUsed.toString()
  };

  fs.writeFileSync(
    './deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 部署信息已保存到 deployment.json");

  // 更新 .env.local 文件
  try {
    let envContent = '';
    if (fs.existsSync('.env.local')) {
      envContent = fs.readFileSync('.env.local', 'utf8');
    }
    
    // 检查是否已存在合约地址配置
    if (envContent.includes('NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=${contractAddress}\n`;
    }
    
    fs.writeFileSync('.env.local', envContent);
    console.log("🔧 .env.local 已自动更新");
  } catch (error) {
    console.log("⚠️  请手动更新 .env.local 文件:");
    console.log(`NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=${contractAddress}`);
  }

  // 等待更多确认
  console.log("\n⏳ 等待 2 个区块确认...");
  await driftBottle.deploymentTransaction().wait(2);
  console.log("✅ 合约已获得足够确认");

  console.log("\n🔍 在 Monad Explorer 查看合约:");
  console.log(`https://testnet.monadexplorer.com/address/${contractAddress}`);

  console.log("\n🎉 部署完成! 下一步操作:");
  console.log("1. 启动前端应用: npm run dev");
  console.log("2. 在应用中连接钱包并测试功能");
  console.log("3. 部署到 Vercel 时使用以下环境变量:");
  console.log(`   NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=${contractAddress}`);

  console.log("\n🌊 现在可以开始使用你的 EchOcean dApp 了!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });