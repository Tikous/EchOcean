const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 开始部署 DriftBottle 合约到 Sepolia 测试网...");

  // 获取合约工厂
  const DriftBottle = await hre.ethers.getContractFactory("DriftBottle");

  // 部署合约
  console.log("📦 正在部署合约...");
  const driftBottle = await DriftBottle.deploy();

  // 等待部署完成
  await driftBottle.waitForDeployment();
  const contractAddress = await driftBottle.getAddress();

  console.log("✅ DriftBottle 合约部署成功!");
  console.log("📍 合约地址:", contractAddress);

  // 保存部署信息
  const deploymentInfo = {
    contractAddress: contractAddress,
    deploymentTime: new Date().toISOString(),
    network: "sepolia",
    deployer: (await hre.ethers.getSigners())[0].address,
    chainId: 11155111
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
  console.log("1. 等待几个区块确认 (约1-2分钟)");
  console.log("2. 可选: 验证合约到 Etherscan");
  console.log("3. 启动前端应用: npm run dev");

  // 等待几个区块确认
  console.log("\n⏳ 等待区块确认...");
  await driftBottle.deploymentTransaction().wait(6);
  console.log("✅ 合约已获得足够确认");

  // 尝试验证合约 (可选)
  if (process.env.ETHERSCAN_API_KEY) {
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

  console.log("\n🌊 现在可以开始使用你的漂流瓶 dApp 了!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });