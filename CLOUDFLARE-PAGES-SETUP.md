# Cloudflare Pages 部署设置指南

## 🚀 **关键配置**

### **构建设置 (Build Settings)**

在 Cloudflare Pages 项目的 Settings > Builds & deployments 中设置：

```bash
Framework preset: Next.js (Static HTML Export)
Build command: EXPORT_MODE=true npm run build:static
Output directory: out
Root directory: (留空)
Node.js version: 18.17.1 或 20.x
```

### **环境变量 (Environment Variables)**

在 Production 和 Preview 环境中都需要设置：

```bash
EXPORT_MODE=true
NODE_ENV=production
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID  
NEXT_PUBLIC_DRIFT_BOTTLE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_APP_NAME=Drift Bottle
NEXT_PUBLIC_APP_DESCRIPTION=Send anonymous messages across the blockchain ocean
```

### **兼容性标志 (Compatibility Flags)**

在 Functions > Compatibility flags 中添加：

```bash
nodejs_compat
```

## 🔍 **故障排除**

### **常见问题 1: "找不到网页"**

**原因**: 构建输出目录配置错误或构建失败

**解决方案**:
1. 确认 Build command 为: `EXPORT_MODE=true npm run build:static`
2. 确认 Output directory 为: `out`
3. 检查构建日志是否有错误

### **常见问题 2: 页面路由无法访问**

**原因**: SPA 路由配置问题

**解决方案**:
1. 确认 `public/_redirects` 文件存在
2. 确认 `trailingSlash: true` 配置生效
3. 检查是否所有页面都正确生成了 `index.html`

### **常见问题 3: 静态资源加载失败**

**原因**: 资源路径配置问题

**解决方案**:
1. 确认 `unoptimized: true` 用于静态导出
2. 检查 `_next` 目录是否正确生成
3. 验证环境变量 `EXPORT_MODE=true` 设置正确

## 📋 **构建验证清单**

部署前请确认：

- ✅ `EXPORT_MODE=true` 环境变量已设置
- ✅ 构建命令使用 `npm run build:static`
- ✅ 输出目录设置为 `out`
- ✅ 所有 `NEXT_PUBLIC_*` 环境变量已配置
- ✅ `out` 目录包含以下文件：
  - `index.html` (首页)
  - `_redirects` (路由配置)
  - `_next/` (静态资源)
  - `send/index.html`
  - `receive/index.html`  
  - `my-bottles/index.html`
  - `replies/index.html`

## 🔄 **重新部署步骤**

如果遇到问题，按以下步骤重新部署：

1. **清理构建缓存**
   - 在 Cloudflare Pages 中点击 "Retry deployment"
   - 或触发新的 Git 提交

2. **验证设置**
   - 检查所有环境变量
   - 确认构建命令和输出目录

3. **监控构建日志**
   - 查看是否有构建错误
   - 确认静态导出成功完成

## 🎯 **预期结果**

成功部署后，你应该能够：

- ✅ 访问主页 `https://your-domain.pages.dev`
- ✅ 正常导航到所有页面（带 `/` 结尾）
- ✅ Web3 钱包连接功能正常
- ✅ 所有静态资源正确加载
- ✅ SPA 路由工作正常

如果仍有问题，请检查浏览器开发者工具的 Network 和 Console 标签页以获取更多调试信息。