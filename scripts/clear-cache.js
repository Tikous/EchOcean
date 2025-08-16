#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🧹 清理开发缓存...')

// 清理 .next 目录
const nextDir = path.join(process.cwd(), '.next')
if (fs.existsSync(nextDir)) {
  try {
    execSync(`rm -rf ${nextDir}`, { stdio: 'inherit' })
    console.log('✅ 清理 .next 目录完成')
  } catch (error) {
    console.warn('⚠️  无法清理 .next 目录:', error.message)
  }
}

// 清理 node_modules/.cache
const cacheDir = path.join(process.cwd(), 'node_modules', '.cache')
if (fs.existsSync(cacheDir)) {
  try {
    execSync(`rm -rf ${cacheDir}`, { stdio: 'inherit' })
    console.log('✅ 清理 node_modules/.cache 完成')
  } catch (error) {
    console.warn('⚠️  无法清理缓存目录:', error.message)
  }
}

console.log('🎉 缓存清理完成!')
console.log('💡 建议步骤:')
console.log('   1. 在Chrome中按F12打开开发者工具')
console.log('   2. 右键刷新按钮，选择"清空缓存并硬性重新加载"')
console.log('   3. 或者使用隐身模式访问应用')