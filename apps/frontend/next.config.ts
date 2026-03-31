import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', '@openai/codex-sdk'],
  devIndicators: false,
};

export default nextConfig;
