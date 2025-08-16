const hre = require("hardhat");
const fs = require('fs');

async function main() {
  // 获取网络信息
  const network = hre.network.name;
  const chainId = await hre.ethers.provider.getNetwork().then(n => n.chainId);
  
  console.log(`🚀 开始部署 EchOcean 合约到 ${network} 网络...`);
  console.log(`⛓️  Chain ID: ${chainId}`);

  // 获取合约工厂
  const DriftBottle = await hre.ethers.getContractFactory("DriftBottle");

  // 部署合约
  console.log("📦 正在部署合约...");
  const driftBottle = await DriftBottle.deploy();

  // 等待部署完成
  await driftBottle.waitForDeployment();
  const contractAddress = await driftBottle.getAddress();

  console.log("✅ EchOcean 合约部署成功!");
  console.log("📍 合约地址:", contractAddress);

  // 保存部署信息
  const deploymentInfo = {
    contractAddress: contractAddress,
    deploymentTime: new Date().toISOString(),
    network: network,
    deployer: (await hre.ethers.getSigners())[0].address,
    chainId: Number(chainId)
  };

  fs.writeFileSync(
    './deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  // 更新环境变量文件
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const updatedEnvContent = envContent.replace(
    /NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=.*/,
    `NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=${contractAddress}`
  );
  fs.writeFileSync('.env.local', updatedEnvContent);

  console.log("💾 部署信息已保存到 deployment.json");
  console.log("🔧 环境变量已自动更新");

  console.log("\n🎉 部署完成! 下一步操作:");
  console.log("1. 等待几个区块确认");
  if (network === 'monadTestnet') {
    console.log("2. 在 Monad Explorer 查看合约: https://testnet.monadexplorer.com");
  } else {
    console.log("2. 可选: 验证合约到区块浏览器");
  }
  console.log("3. 启动前端应用: npm run dev");

  // 等待区块确认 (Monad 更快，只需要2个确认)
  const confirmations = network === 'monadTestnet' ? 2 : 6;
  console.log(`\n⏳ 等待 ${confirmations} 个区块确认...`);
  await driftBottle.deploymentTransaction().wait(confirmations);
  console.log("✅ 合约已获得足够确认");

  // 显示浏览器链接
  if (network === 'monadTestnet') {
    console.log(`\n🔍 在 Monad Explorer 查看合约:`);
    console.log(`https://testnet.monadexplorer.com/address/${contractAddress}`);
  } else if (network === 'sepolia' && process.env.ETHERSCAN_API_KEY) {
    try {
      console.log("\n🔍 正在验证合约到 Etherscan...");
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ 合约验证成功!");
    } catch (error) {
      console.log("⚠️  合约验证失败 (这不影响使用):", error.message);
    }
  }

  console.log("\n🌊 现在可以开始使用你的 EchOcean dApp 了!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });