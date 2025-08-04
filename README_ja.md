# Web Test Forge

Web Test Forgeは、Playwrightベースの自動テストツールで、Webアプリケーションのテストを簡単に作成、管理、実行できるWebインターフェースを提供します。

## 特徴

- 🚀 **直感的なWebインターフェース**: コード不要でテストケースを作成・管理
- 🔍 **ソースコード解析**: WebサイトのHTMLを解析して自動的にテストケースを生成
- 📸 **スクリーンショット**: テスト実行時の各ステップでスクリーンショットを自動取得
- 🔐 **認証対応**: ログインが必要なサイトのテストにも対応
- 📊 **詳細なレポート**: テスト結果を視覚的に確認、CSVエクスポート機能付き
- 🎯 **テストスイート管理**: 関連するテストケースをグループ化して管理
- ⚡ **リアルタイム実行**: ブラウザを起動してテストをリアルタイムで実行
- 🌐 **多言語対応**: 日本語・英語インターフェース
- ✅ **選択的テスト生成**: 生成するテストタイプを選択可能（ページ、フォーム、ナビゲーション）

## スクリーンショット

### ダッシュボード
![ダッシュボード](public/captures/dashboard.png)

### プロジェクト構造の概要
![プロジェクト構造](public/captures/project-structure.png)

### ソースコード解析
![ソースコード解析](public/captures/source-code-analysis.png)

### ソースコード解析フロー
![ソース解析フロー](public/captures/source-analysis-flow.png)

### テストケース管理
![テストケース](public/captures/testcase.png)

### テスト実行フロー
![テスト実行フロー](public/captures/test-execution-flow.png)

## 技術スタック

- **Frontend**: Next.js 15.1.x, React 19.x, TypeScript 5.7.x
- **UI**: Tailwind CSS, shadcn/ui, Zustand（状態管理）
- **Backend**: Next.js API Routes, Prisma ORM, Redis + BullMQ（ジョブキュー）
- **Testing**: Playwright 1.49.x with MCP（Model Context Protocol）統合
- **Database**: PostgreSQL 16.x（本番） / SQLite（開発）
- **Code Quality**: Biome（リンター・フォーマッター）

## セットアップ

### 前提条件

- Node.js 18.x以上
- pnpm（推奨）または npm
- PostgreSQL 16.x（本番環境用）
- Redis 7.x（ジョブキュー用）

### インストール

1. リポジトリをクローン

```bash
git clone https://github.com/cruzyjapan/Web-Test-Forge-NextJS.git
cd Web-Test-Forge-NextJS
```

2. 依存関係をインストール

```bash
pnpm install
```

3. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local`を編集して必要な環境変数を設定：

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/webtestforge"

# Redis（ジョブキュー用）
REDIS_URL="redis://localhost:6379"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here-min-32-chars-long"

# MCP Server
MCP_SERVER_PATH="./mcp-server/dist/index.js"
```

4. データベースをセットアップ

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

5. Playwrightブラウザをインストール

```bash
npx playwright install chromium firefox webkit
```

6. MCPサーバーをビルド

```bash
cd mcp-server
pnpm install
pnpm build
cd ..
```

7. 開発サーバーを起動

```bash
pnpm dev
```

ブラウザで http://localhost:3000 を開きます。

## 使い方

### 1. ユーザー登録

初回利用時は、ユーザー登録を行います。

### 2. プロジェクトの作成

テスト対象のWebサイトごとにプロジェクトを作成します：
- プロジェクト名
- ベースURL（テスト対象サイトのURL）
- 認証情報（ログインが必要な場合）

### 3. テストスイートの作成

プロジェクト内でテストスイートを作成し、関連するテストケースをグループ化します。

### 4. テストケースの作成

以下の方法でテストケースを作成できます：

#### 手動作成
1. テストケース名と説明を入力
2. テストステップを追加（クリック、入力、検証など）
3. 各ステップのセレクタと期待値を設定

#### ソースコード解析による自動生成
1. プロジェクトページで「ソースコード解析」を選択
2. 生成するテストタイプを選択：
   - ✅ **ページ**: ページ表示テスト
   - ✅ **フォーム**: フォーム入力・バリデーションテスト
   - ✅ **ナビゲーション**: リンクナビゲーションテスト
   - ❌ **API**: 現在無効（スナップショット非対応）
3. システムが自動的にページを解析してテストケースを生成
4. 生成されたテストケースを確認・編集

### 5. テストの実行

- 個別のテストケースを実行
- テストスイート全体を実行
- 実行結果とスクリーンショットを確認

### 6. レポートの確認

- テスト実行履歴の確認
- 各ステップの詳細結果
- スクリーンショットの表示
- CSVエクスポート

## 主要コマンド

```bash
# 開発
pnpm dev                     # 開発サーバー起動
pnpm mcp:dev                # MCPサーバーを開発モードで起動
pnpm build                   # プロダクションビルド
pnpm start                   # プロダクションサーバー起動

# データベース
pnpm prisma migrate dev      # データベースマイグレーション実行
pnpm prisma studio          # Prisma Studio起動
pnpm prisma generate        # Prismaクライアント生成

# テスト
pnpm test                   # Vitestでユニットテスト実行
pnpm test:e2e              # PlaywrightでE2Eテスト実行
pnpm test:watch            # テストをウォッチモードで実行

# コード品質
pnpm lint                   # Biomeリンター実行
pnpm format                 # Biomeでコードフォーマット
pnpm typecheck             # TypeScript型チェック実行
```

## プロジェクト構造

```
web-test-forge/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 認証ページ
│   │   ├── (dashboard)/       # ダッシュボードページ
│   │   └── api/               # APIルート
│   ├── components/            # Reactコンポーネント
│   │   ├── ui/               # shadcn/uiコンポーネント
│   │   ├── features/         # 機能別コンポーネント
│   │   └── layouts/          # レイアウトコンポーネント
│   ├── lib/                   # ユーティリティ関数
│   │   ├── playwright/       # Playwrightテストランナー
│   │   ├── mcp/             # MCP統合
│   │   └── db/              # データベースユーティリティ
│   ├── hooks/                # カスタムReactフック
│   ├── stores/               # Zustand状態ストア
│   ├── contexts/             # Reactコンテキスト（言語設定など）
│   ├── locales/              # 国際化ファイル
│   └── types/                # TypeScript型定義
├── mcp-server/               # MCPサーバー実装
├── prisma/                   # Prismaスキーマとマイグレーション
├── public/                   # 静的ファイル
│   ├── reports/             # 生成されたテストレポート
│   └── screenshots/         # テストスクリーンショット
├── scripts/                  # ユーティリティスクリプト
└── templates/               # テストケーステンプレート
```

## 主要機能

### ソースコード解析
- Next.js（App Router）プロジェクトに対応
- `src/app/`、`app/`、`src/components/`、`components/`ディレクトリを解析
- ページ、フォーム、ナビゲーションリンク、APIエンドポイントを検出
- 包括的なテストケースを自動生成

### テストケースタイプ
- **ページテスト**: ページ表示と基本機能の検証
- **フォームテスト**: フォーム入力、バリデーション、送信のテスト
- **ナビゲーションテスト**: リンク機能とページ遷移の検証
- **レスポンシブテスト**: モバイル、タブレット、デスクトップでのテスト
- **APIテスト**: 現在スクリーンショット制限により無効

### 選択的テスト生成
- チェックボックスを使用してテストタイプを選択
- APIテストは明確なメッセージと共に選択不可
- テストケースの番号付け順序：ページ（優先）、フォーム、ナビゲーション

## 開発ワークフロー

1. **機能開発**: 機能ブランチを作成し、`src/components/features/`で実装
2. **API開発**: `src/app/api/`に新しいルートを追加、必要に応じてPrismaスキーマを更新
3. **MCPツール**: `mcp-server/src/tools/`でMCPサーバーツールを拡張
4. **テスト**: コンポーネントと併せてユニットテストを作成、`tests/`でE2Eテストを実装

## トラブルシューティング

### Windows 11 + WSL2環境でのPlaywright文字化け問題

Windows 11でWSL2を使用している場合、Playwrightのテスト実行時に日本語が文字化けする問題が発生することがあります。以下の手順で解決できます：

1. **WSL2に日本語フォントをインストール:**
```bash
sudo apt update
sudo apt install fonts-noto-cjk fonts-noto-cjk-extra
```

2. **ロケール環境変数を設定:**
```bash
# ~/.bashrc または ~/.zshrc に追加
export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8
export LC_CTYPE=ja_JP.UTF-8
```

3. **日本語ロケールを生成:**
```bash
sudo locale-gen ja_JP.UTF-8
sudo update-locale LANG=ja_JP.UTF-8
```

4. **Playwrightを依存関係と共にインストール:**
```bash
npx playwright install --with-deps chromium
```

5. **WSL2を再起動:**
```bash
wsl --shutdown
# その後、WSL2ターミナルを再度開く
```

これらの設定により、Playwrightでのスクリーンショット撮影や日本語テキストのレンダリング時の文字化け問題が解決されます。

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容について議論してください。

## サポート

問題が発生した場合は、[Issues](https://github.com/cruzyjapan/Web-Test-Forge-NextJS/issues)でご報告ください。

## 更新履歴

### 最新の更新
- ✅ チェックボックスによる選択的テストケース生成機能を追加
- ✅ 多言語対応を実装（日本語・英語）
- ✅ テスト結果詳細ページの国際化対応
- ✅ スナップショット制限に関する明確なメッセージと共にAPIテストを無効化
- ✅ テストケース番号付けとカスタム順序システムを追加