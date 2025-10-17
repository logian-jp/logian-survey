/** @type {import('next').NextConfig} */
const nextConfig = {
  // 既存の設定を保持
  experimental: {
    // 必要に応じて他の実験的機能
  },
  
  // HTTPS環境での開発用設定
  async rewrites() {
    return [
      // 必要に応じてリライト設定
    ]
  }
}

module.exports = nextConfig