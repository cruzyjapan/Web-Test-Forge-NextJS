import { defineConfig } from '@playwright/test';

export default defineConfig({
  // テストディレクトリ
  testDir: './tests',
  
  // タイムアウト設定
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  
  // 並列実行
  fullyParallel: true,
  
  // レポーター設定
  reporter: 'html',
  
  // ブラウザ設定
  use: {
    // アクショントレース
    actionTimeout: 0,
    
    // ベースURL
    baseURL: 'http://localhost:3000',
    
    // トレース設定
    trace: 'on-first-retry',
    
    // スクリーンショット
    screenshot: 'only-on-failure',
    
    // ビューポート
    viewport: { width: 1280, height: 720 },
    
    // ブラウザオプション
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  },

  // プロジェクト設定
  projects: [
    {
      name: 'chromium',
      use: { 
        ...defineConfig.use,
        channel: undefined,
      },
    },
  ],
});