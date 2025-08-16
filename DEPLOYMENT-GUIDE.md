# 部署指南

这个项目支持多种部署方式，已针对不同平台进行了优化。

## 🚀 部署选项

### 1. Vercel (推荐用于开发和测试)

**构建设置:**
```bash
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

**环境变量:**
```
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_APP_NAME=Drift Bottle
NEXT_PUBLIC_APP_DESCRIPTION=Send anonymous messages across the blockchain ocean
```

### 2. Cloudflare Pages (推荐用于生产环境)

**构建设置:**
```bash
Build Command: npm run build:static
Output Directory: out
Root Directory: /
Node.js Version: 18.x 或 20.x
```

**环境变量:** (同 Vercel)

**兼容性标志:**
```
nodejs_compat: enabled
```

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 🛠️ 构建脚本

- `npm run dev` - 本地开发
- `npm run build` - 标准构建 (Vercel)
- `npm run build:static` - 静态导出 (Cloudflare Pages)
- `npm run build:analyze` - 包大小分析

## 📝 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | ✅ | Sepolia 测试网 RPC URL |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect 项目 ID |
| `NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS` | ✅ | 智能合约地址 |
| `NEXT_PUBLIC_CHAIN_ID` | ❌ | 链 ID (默认: 11155111) |
| `NEXT_PUBLIC_APP_NAME` | ❌ | 应用名称 |
| `NEXT_PUBLIC_APP_DESCRIPTION` | ❌ | 应用描述 |

## ⚠️ 常见问题

### 1. Cloudflare Pages "找不到网页"
确保构建命令使用 `npm run build:static` 并设置输出目录为 `out`。

### 2. WalletConnect 控制台错误
这些错误已被自动过滤，不影响功能。如需完全消除，请使用自己的 WalletConnect Project ID。

### 3. 本地开发无法启动
清理缓存并重新安装依赖：
```bash
rm -rf .next node_modules *.tsbuildinfo
npm install
npm run dev
```

### 4. 背景动画重新加载
已修复 - 背景现在在 layout 中统一管理，页面切换时保持连续。

## 🔍 性能优化

- ✅ Progressive loading for better perceived performance
- ✅ Enhanced caching strategies  
- ✅ Error boundaries for Web3 operations
- ✅ Console error filtering for cleaner development experience
- ✅ Optimized bundle splitting
- ✅ Continuous background animations across page transitions