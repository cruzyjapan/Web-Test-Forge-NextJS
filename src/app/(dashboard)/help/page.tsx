"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  HelpCircle, 
  Download, 
  FolderOpen, 
  FileCode, 
  Play, 
  Plus,
  Settings,
  TestTube,
  Code,
  AlertTriangle
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export default function HelpPage() {
  const { language, t } = useLanguage()

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center">
            <HelpCircle className="mr-3 h-8 w-8 text-blue-600" />
            {language === 'ja' ? 'ヘルプ' : 'Help'}
          </h1>
          <p className="text-gray-600 mt-2">
            {language === 'ja' 
              ? 'Web Test Forge for Next.js の使用方法とガイド' 
              : 'Usage guide for Web Test Forge for Next.js'
            }
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">{language === 'ja' ? '概要' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="installation">{language === 'ja' ? 'インストール' : 'Installation'}</TabsTrigger>
            <TabsTrigger value="auto-test">{language === 'ja' ? '自動テスト' : 'Auto Test'}</TabsTrigger>
            <TabsTrigger value="manual-test">{language === 'ja' ? '手動テスト' : 'Manual Test'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TestTube className="mr-2 h-5 w-5" />
                  Web Test Forge for Next.js
                </CardTitle>
                <CardDescription>
                  {language === 'ja' 
                    ? 'Next.js専用のPlaywright自動テストツール'
                    : 'Playwright automated testing tool specifically for Next.js'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="mr-2 h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-900">
                      {language === 'ja' ? '重要な制限' : 'Important Limitation'}
                    </span>
                  </div>
                  <p className="text-sm text-blue-800">
                    {language === 'ja' 
                      ? 'このツールは現在Next.js (App Router)プロジェクトのみに対応しています。'
                      : 'This tool currently supports only Next.js (App Router) projects.'
                    }
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">
                      {language === 'ja' ? '主な機能' : 'Key Features'}
                    </h3>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• {language === 'ja' ? 'ソースコード自動解析' : 'Automatic source code analysis'}</li>
                      <li>• {language === 'ja' ? 'テストケース自動生成' : 'Automatic test case generation'}</li>
                      <li>• {language === 'ja' ? 'Playwright統合' : 'Playwright integration'}</li>
                      <li>• {language === 'ja' ? 'スクリーンショット自動撮影' : 'Automatic screenshot capture'}</li>
                      <li>• {language === 'ja' ? 'テスト結果レポート' : 'Test result reports'}</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">
                      {language === 'ja' ? '対応フレームワーク' : 'Supported Framework'}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Badge variant="success" className="mr-2">
                          {language === 'ja' ? '対応' : 'Supported'}
                        </Badge>
                        <span className="text-sm">Next.js (App Router)</span>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="secondary" className="mr-2">
                          {language === 'ja' ? '今後対応' : 'Future'}
                        </Badge>
                        <span className="text-sm text-gray-600">Pages Router, Nuxt.js, React, Vue.js</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="installation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  {language === 'ja' ? 'インストール手順' : 'Installation Steps'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      1. {language === 'ja' ? 'リポジトリのクローン' : 'Clone Repository'}
                    </h3>
                    <div className="bg-gray-100 rounded p-3 font-mono text-sm">
                      git clone https://github.com/cruzyjapan/Web-Test-Forge-NextJS.git<br/>
                      cd Web-Test-Forge-NextJS
                    </div>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      2. {language === 'ja' ? '初期セットアップの実行' : 'Run Initial Setup'}
                    </h3>
                    <div className="bg-gray-100 rounded p-3 font-mono text-sm">
                      chmod +x init.sh<br/>
                      ./init.sh
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {language === 'ja' 
                        ? 'init.shスクリプトが依存関係のインストール、データベースのセットアップ、Playwrightブラウザのインストールを自動で行います。'
                        : 'The init.sh script automatically installs dependencies, sets up the database, and installs Playwright browsers.'
                      }
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      3. {language === 'ja' ? 'アプリケーションの起動' : 'Start Application'}
                    </h3>
                    <div className="bg-gray-100 rounded p-3 font-mono text-sm">
                      pnpm dev
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {language === 'ja' 
                        ? 'ブラウザで http://localhost:3000 にアクセスして開始します。'
                        : 'Access http://localhost:3000 in your browser to get started.'
                      }
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      4. {language === 'ja' ? 'ユーザー登録' : 'User Registration'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {language === 'ja' 
                        ? '初回アクセス時に新規ユーザー登録を行ってください。'
                        : 'Register a new user account on your first visit.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auto-test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="mr-2 h-5 w-5" />
                  {language === 'ja' ? 'テスト自動生成' : 'Automatic Test Generation'}
                </CardTitle>
                <CardDescription>
                  {language === 'ja' 
                    ? 'ソースコードからテストケースを自動生成する方法'
                    : 'How to automatically generate test cases from source code'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      1. {language === 'ja' ? 'プロジェクトの作成' : 'Create Project'}
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• {language === 'ja' ? 'プロジェクト名を入力' : 'Enter project name'}</li>
                      <li>• {language === 'ja' ? 'テスト対象のURL（例：http://localhost:3000）' : 'Target URL (e.g., http://localhost:3000)'}</li>
                      <li>• <strong>{language === 'ja' ? 'ソースコードディレクトリ（必須）' : 'Source Code Directory (Required)'}</strong></li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      2. {language === 'ja' ? '解析対象ディレクトリ' : 'Analysis Target Directories'}
                    </h3>
                    <div className="bg-gray-50 border rounded p-3">
                      <p className="text-sm font-medium mb-2">
                        {language === 'ja' ? '自動解析されるディレクトリ：' : 'Auto-analyzed directories:'}
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <code className="bg-gray-200 px-1 rounded">src/app/</code> - {language === 'ja' ? 'App Router (srcあり)' : 'App Router (with src)'}</li>
                        <li>• <code className="bg-gray-200 px-1 rounded">app/</code> - {language === 'ja' ? 'App Router (srcなし)' : 'App Router (without src)'}</li>
                        <li>• <code className="bg-gray-200 px-1 rounded">src/components/</code> - {language === 'ja' ? 'コンポーネント' : 'Components'}</li>
                        <li>• <code className="bg-gray-200 px-1 rounded">components/</code> - {language === 'ja' ? 'コンポーネント' : 'Components'}</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      3. {language === 'ja' ? '解析対象ファイル' : 'Analysis Target Files'}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-medium mb-2">
                          {language === 'ja' ? 'ファイル形式：' : 'File formats:'}
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• <code className="bg-gray-200 px-1 rounded">.tsx</code> - TypeScript + JSX</li>
                          <li>• <code className="bg-gray-200 px-1 rounded">.ts</code> - TypeScript</li>
                          <li>• <code className="bg-gray-200 px-1 rounded">.jsx</code> - JavaScript + JSX</li>
                          <li>• <code className="bg-gray-200 px-1 rounded">.js</code> - JavaScript</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">
                          {language === 'ja' ? '特別なファイル：' : 'Special files:'}
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• <code className="bg-gray-200 px-1 rounded">page.tsx</code> - {language === 'ja' ? 'ページルート' : 'Page routes'}</li>
                          <li>• <code className="bg-gray-200 px-1 rounded">layout.tsx</code> - {language === 'ja' ? 'レイアウト' : 'Layouts'}</li>
                          <li>• <code className="bg-gray-200 px-1 rounded">route.ts</code> - {language === 'ja' ? 'APIエンドポイント' : 'API endpoints'}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      4. {language === 'ja' ? '生成されるテスト' : 'Generated Tests'}
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• {language === 'ja' ? 'ページ表示テスト（各ルートの200応答確認）' : 'Page display tests (200 response check for each route)'}</li>
                      <li>• {language === 'ja' ? 'フォーム入力・送信テスト' : 'Form input and submission tests'}</li>
                      <li>• {language === 'ja' ? 'ナビゲーションテスト（リンククリック）' : 'Navigation tests (link clicks)'}</li>
                      <li>• {language === 'ja' ? 'APIエンドポイントテスト（GET/POST）' : 'API endpoint tests (GET/POST)'}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual-test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="mr-2 h-5 w-5" />
                  {language === 'ja' ? 'テスト手動登録' : 'Manual Test Registration'}
                </CardTitle>
                <CardDescription>
                  {language === 'ja' 
                    ? '手動でテストケースを作成・編集する方法'
                    : 'How to manually create and edit test cases'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      1. {language === 'ja' ? 'テストスイートの作成' : 'Create Test Suite'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {language === 'ja' 
                        ? 'プロジェクト詳細ページから「テストスイート」→「新規作成」'
                        : 'From project details page: "Test Suites" → "Create New"'
                      }
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• {language === 'ja' ? 'スイート名を入力' : 'Enter suite name'}</li>
                      <li>• {language === 'ja' ? '説明を追加（任意）' : 'Add description (optional)'}</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      2. {language === 'ja' ? 'テストケースの追加' : 'Add Test Case'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {language === 'ja' 
                        ? 'テストスイート詳細ページで「新規作成」ボタンをクリック'
                        : 'Click "Create New" button on test suite details page'
                      }
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• {language === 'ja' ? 'テストケース名' : 'Test case name'}</li>
                      <li>• {language === 'ja' ? 'テストの説明' : 'Test description'}</li>
                      <li>• {language === 'ja' ? 'テストステップの追加' : 'Add test steps'}</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      3. {language === 'ja' ? 'テストステップの種類' : 'Test Step Types'}
                    </h3>
                    <div className="bg-gray-50 border rounded p-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm font-medium mb-2">
                            {language === 'ja' ? '基本アクション：' : 'Basic actions:'}
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• navigate - {language === 'ja' ? 'ページ移動' : 'Page navigation'}</li>
                            <li>• click - {language === 'ja' ? 'クリック' : 'Click'}</li>
                            <li>• fill - {language === 'ja' ? 'テキスト入力' : 'Text input'}</li>
                            <li>• wait - {language === 'ja' ? '待機' : 'Wait'}</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">
                            {language === 'ja' ? '検証アクション：' : 'Verification actions:'}
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• expect - {language === 'ja' ? '要素の存在確認' : 'Element existence check'}</li>
                            <li>• screenshot - {language === 'ja' ? 'スクリーンショット' : 'Screenshot'}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold mb-2">
                      4. {language === 'ja' ? 'テストの実行' : 'Test Execution'}
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• {language === 'ja' ? 'テストスイート一覧から「テスト実行」' : 'Click "Run Test" from test suite list'}</li>
                      <li>• {language === 'ja' ? '実行したいテストケースを選択' : 'Select test cases to run'}</li>
                      <li>• {language === 'ja' ? '実行結果とスクリーンショットを確認' : 'Review results and screenshots'}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}