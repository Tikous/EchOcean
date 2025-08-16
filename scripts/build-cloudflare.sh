#!/bin/bash

# Cloudflare Pages 构建脚本
echo "🚀 Building for Cloudflare Pages with static export..."

# 设置环境变量
export EXPORT_MODE=true
export NODE_ENV=production

echo "📋 Environment variables:"
echo "EXPORT_MODE=$EXPORT_MODE"
echo "NODE_ENV=$NODE_ENV"

# 安装依赖
echo "📦 Installing dependencies..."
npm ci

# 清理之前的构建
echo "🧹 Cleaning previous builds..."
rm -rf .next out

# 构建应用
echo "🔨 Building application with static export..."
npm run build:static

# 检查构建是否成功和输出目录
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    if [ -d "out" ]; then
        echo "📂 Static export output directory: out/"
        echo "📄 Files in out directory:"
        ls -la out/
        
        # 检查关键文件
        echo "🔍 Checking critical files:"
        if [ -f "out/index.html" ]; then
            echo "✅ index.html found"
        else
            echo "❌ index.html missing!"
        fi
        
        if [ -f "out/_redirects" ]; then
            echo "✅ _redirects found"
        else
            echo "❌ _redirects missing!"
        fi
        
        if [ -d "out/_next" ]; then
            echo "✅ _next directory found"
        else
            echo "❌ _next directory missing!"
        fi
        
    else
        echo "❌ Output directory 'out' not found!"
        echo "📂 Available directories:"
        ls -la
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi