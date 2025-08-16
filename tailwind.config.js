/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#eff6ff',   // 极浅蓝
          100: '#dbeafe',  // 浅蓝
          200: '#bfdbfe',  // 明亮蓝
          300: '#93c5fd',  // 天空蓝  
          400: '#60a5fa',  // 鲜艳蓝
          500: '#3b82f6',  // 标准蓝
          600: '#2563eb',  // 深蓝
          700: '#1d4ed8',  // 深海蓝
          800: '#1e40af',  // 更深蓝
          900: '#1e3a8a',  // 深邃蓝
          950: '#172554',  // 最深蓝
        },
        coral: {
          50: '#fff7ed',   // 保持现有
          100: '#ffedd5',  // 更鲜艳的珊瑚色调
          200: '#fed7aa',  
          300: '#fdba74',  
          400: '#fb923c',  // 更鲜艳的橙色
          500: '#f97316',  // 鲜艳橙色
          600: '#ea580c',  
          700: '#dc2626',  // 添加红色调
          800: '#b91c1c',  
          900: '#991b1b',
        },
        // 新增更多鲜艳色彩
        vibrant: {
          cyan: '#00ffff',     // 电光青
          purple: '#8b5cf6',   // 鲜艳紫
          pink: '#ec4899',     // 鲜艳粉
          green: '#10b981',    // 鲜艳绿
          yellow: '#fbbf24',   // 鲜艳黄
          blue: '#3b82f6',     // 鲜艳蓝
        }
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'wave': 'wave 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'bounce-soft': 'bounce-soft 1s ease-in-out',
        'shimmer': 'shimmer 2s linear infinite',
        'bubble-float': 'bubble-float 4s ease-in-out infinite',
        'ripple': 'ripple 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wave: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.8', boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' },
          '50%': { opacity: '1', boxShadow: '0 0 30px rgba(14, 165, 233, 0.6)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bubble-float': {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '33%': { transform: 'translateY(-20px) scale(1.1)' },
          '66%': { transform: 'translateY(-10px) scale(0.9)' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}