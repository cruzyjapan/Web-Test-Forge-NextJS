/**
 * 解析結果からテストケースを自動生成
 */

import { AnalysisResult, FormInfo, PageInfo, RouteInfo } from './source-code-analyzer';
import fs from 'fs/promises';
import path from 'path';

interface TestCase {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  steps: TestStep[];
}

interface TestStep {
  action: string;
  url?: string;
  selector?: string;
  value?: string;
  expectedResult: string;
}

export class TestCaseGenerator {
  private analysisResult: AnalysisResult;
  private outputDir: string;
  private baseUrl: string;
  private language: string;

  constructor(analysisResult: AnalysisResult, outputDir: string, baseUrl: string = '', language: string = 'ja') {
    this.analysisResult = analysisResult;
    this.outputDir = outputDir;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.language = language;
  }

  /**
   * テストケースを生成
   */
  async generate(): Promise<void> {
    console.log('Generating test cases...');
    
    // 出力ディレクトリを作成
    await fs.mkdir(this.outputDir, { recursive: true });

    // ナビゲーションテストを生成
    await this.generateNavigationTests();

    // フォームテストを生成
    await this.generateFormTests();

    // APIテストを生成
    await this.generateApiTests();

    // ページ表示テストを生成
    await this.generatePageTests();

    console.log(`Test cases generated in: ${this.outputDir}`);
  }

  /**
   * ナビゲーションテストを生成
   */
  private async generateNavigationTests(): Promise<void> {
    const testCases: string[] = [];
    const navigation = this.analysisResult.navigation;
    
    // ナビゲーションが空でも基本的なテストケースを生成
    if (navigation.length === 0) {
      console.log('No navigation links found, generating basic navigation test');
    }

    testCases.push(this.language === 'ja' ? '# ナビゲーションテストケース\n' : '# Navigation Test Cases\n');
    testCases.push(this.language === 'ja' ? '自動生成されたナビゲーションテストケースです。\n' : 'Automatically generated navigation test cases.\n');

    // メインナビゲーションテスト
    testCases.push(this.language === 'ja' ? '\n## テストケース: メインナビゲーション\n' : '\n## Test Case: Main Navigation\n');
    testCases.push(this.language === 'ja' ? '\n### テスト概要' : '\n### Test Overview');
    testCases.push(this.language === 'ja' ? '- **テスト名**: サイト内リンクの動作確認' : '- **Test Name**: Site navigation link functionality');
    testCases.push(this.language === 'ja' ? '- **説明**: すべてのナビゲーションリンクが正しく機能することを確認' : '- **Description**: Verify that all navigation links function correctly');
    testCases.push(this.language === 'ja' ? '- **優先度**: 高\n' : '- **Priority**: High\n');
    testCases.push(this.language === 'ja' ? '\n### テストステップ\n' : '\n### Test Steps\n');

    testCases.push(this.language === 'ja' ? '\n#### ステップ1: トップページへ移動' : '\n#### Step 1: Navigate to home page');
    testCases.push(this.language === 'ja' ? '- **アクション**: navigate' : '- **Action**: navigate');
    testCases.push(`- **URL**: ${this.baseUrl || '/'}`);
    testCases.push(this.language === 'ja' ? '- **期待結果**: トップページが表示される\n' : '- **Expected Result**: Home page is displayed\n');

    // ナビゲーションリンクがある場合は実際のリンクをテスト
    if (navigation.length > 0) {
      let stepNum = 2;
      for (const link of navigation.slice(0, 10)) { // 最初の10個のリンクをテスト
        testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum}: ${link}へのナビゲーション` : `\n#### Step ${stepNum}: Navigate to ${link}`);
        testCases.push(this.language === 'ja' ? '- **アクション**: click' : '- **Action**: click');
        testCases.push(`- **${this.language === 'ja' ? 'セレクタ' : 'Selector'}**: a[href="${link}"]`);
        testCases.push(this.language === 'ja' ? `- **期待結果**: ${link}ページへ遷移する\n` : `- **Expected Result**: Navigate to ${link} page\n`);
        
        stepNum++;
        
        testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum}: ページ表示の確認` : `\n#### Step ${stepNum}: Verify page display`);
        testCases.push(this.language === 'ja' ? '- **アクション**: assert' : '- **Action**: assert');
        testCases.push(this.language === 'ja' ? '- **セレクタ**: body' : '- **Selector**: body');
        testCases.push(this.language === 'ja' ? '- **期待結果**: ページが正常に表示される\n' : '- **Expected Result**: Page displays correctly\n');
        
        stepNum++;
      }
    } else {
      // 基本的なナビゲーションテストのみ
      testCases.push(this.language === 'ja' ? '\n#### ステップ2: 基本的なページ確認' : '\n#### Step 2: Basic page verification');
      testCases.push(this.language === 'ja' ? '- **アクション**: assert' : '- **Action**: assert');
      testCases.push(this.language === 'ja' ? '- **セレクタ**: body' : '- **Selector**: body');
      testCases.push(this.language === 'ja' ? '- **期待結果**: ページ本体が表示される\n' : '- **Expected Result**: Page body is displayed\n');
    }

    testCases.push('\n---\n');

    await fs.writeFile(
      path.join(this.outputDir, 'navigation-tests.md'),
      testCases.join('\n')
    );
  }

  /**
   * フォームテストを生成
   */
  private async generateFormTests(): Promise<void> {
    const forms = this.analysisResult.forms;
    
    if (forms.length === 0) return;

    const testCases: string[] = [];
    testCases.push(this.language === 'ja' ? '# フォームテストケース\n' : '# Form Test Cases\n');
    testCases.push(this.language === 'ja' ? '自動生成されたフォームテストケースです。\n' : 'Automatically generated form test cases.\n');

    for (const form of forms.slice(0, 5)) { // 最初の5個のフォーム
      testCases.push(this.language === 'ja' ? `\n## テストケース: ${form.name}\n` : `\n## Test Case: ${form.name}\n`);
      testCases.push(this.language === 'ja' ? '\n### テスト概要' : '\n### Test Overview');
      testCases.push(this.language === 'ja' ? `- **テスト名**: ${form.name}の送信テスト` : `- **Test Name**: ${form.name} submission test`);
      testCases.push(this.language === 'ja' ? `- **説明**: フォームが正しく送信されることを確認` : `- **Description**: Verify that the form submits correctly`);
      testCases.push(this.language === 'ja' ? '- **優先度**: 高\n' : '- **Priority**: High\n');
      testCases.push(this.language === 'ja' ? '\n### テストステップ\n' : '\n### Test Steps\n');

      let stepNum = 1;

      // ページ遷移
      const pagePath = this.findPageForForm(form);
      const formUrl = pagePath 
        ? (pagePath.startsWith('http') 
          ? pagePath 
          : `${this.baseUrl}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`)
        : this.baseUrl || '/';
      testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum}: フォームページへ移動` : `\n#### Step ${stepNum}: Navigate to form page`);
      testCases.push(this.language === 'ja' ? '- **アクション**: navigate' : '- **Action**: navigate');
      testCases.push(`- **URL**: ${formUrl}`);
      testCases.push(this.language === 'ja' ? '- **期待結果**: フォームが表示される\n' : '- **Expected Result**: Form is displayed\n');
      stepNum++;

      // フォーム入力
      for (const element of form.elements) {
        if (element.type === 'submit') continue;
        
        testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum}: ${element.name || element.type}の入力` : `\n#### Step ${stepNum}: Enter ${element.name || element.type}`);
        
        if (element.type === 'select') {
          testCases.push(this.language === 'ja' ? '- **アクション**: select' : '- **Action**: select');
          testCases.push(this.language === 'ja' ? `- **セレクタ**: ${element.selector}` : `- **Selector**: ${element.selector}`);
          testCases.push(this.language === 'ja' ? '- **値**: 選択肢1' : '- **Value**: Option 1');
        } else {
          testCases.push(this.language === 'ja' ? '- **アクション**: type' : '- **Action**: type');
          testCases.push(this.language === 'ja' ? `- **セレクタ**: ${element.selector}` : `- **Selector**: ${element.selector}`);
          testCases.push(this.language === 'ja' ? `- **値**: ${this.generateSampleValue(element)}` : `- **Value**: ${this.generateSampleValue(element)}`);
        }
        
        testCases.push(this.language === 'ja' ? `- **期待結果**: ${element.name || element.type}が入力される\n` : `- **Expected Result**: ${element.name || element.type} is entered\n`);
        stepNum++;
      }

      // 送信
      testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum}: フォーム送信` : `\n#### Step ${stepNum}: Submit form`);
      testCases.push(this.language === 'ja' ? '- **アクション**: click' : '- **Action**: click');
      testCases.push(this.language === 'ja' ? '- **セレクタ**: button[type="submit"]' : '- **Selector**: button[type="submit"]');
      testCases.push(this.language === 'ja' ? '- **期待結果**: フォームが送信される\n' : '- **Expected Result**: Form is submitted\n');
      stepNum++;

      // 結果確認
      testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum}: 送信結果の確認` : `\n#### Step ${stepNum}: Verify submission result`);
      testCases.push(this.language === 'ja' ? '- **アクション**: assert' : '- **Action**: assert');
      testCases.push(this.language === 'ja' ? '- **セレクタ**: .success-message, .toast-success' : '- **Selector**: .success-message, .toast-success');
      testCases.push(this.language === 'ja' ? '- **期待結果**: 成功メッセージが表示される\n' : '- **Expected Result**: Success message is displayed\n');

      testCases.push('\n---\n');

      // バリデーションテスト
      testCases.push(this.language === 'ja' ? `\n## テストケース: ${form.name}のバリデーション\n` : `\n## Test Case: ${form.name} Validation\n`);
      testCases.push(this.language === 'ja' ? '\n### テスト概要' : '\n### Test Overview');
      testCases.push(this.language === 'ja' ? `- **テスト名**: ${form.name}のバリデーションチェック` : `- **Test Name**: ${form.name} validation check`);
      testCases.push(this.language === 'ja' ? '- **説明**: 必須項目が未入力の場合にエラーが表示されることを確認' : '- **Description**: Verify that error messages appear when required fields are empty');
      testCases.push(this.language === 'ja' ? '- **優先度**: 中\n' : '- **Priority**: Medium\n');
      testCases.push(this.language === 'ja' ? '\n### テストステップ\n' : '\n### Test Steps\n');

      testCases.push(this.language === 'ja' ? '\n#### ステップ1: フォームページへ移動' : '\n#### Step 1: Navigate to form page');
      testCases.push(this.language === 'ja' ? '- **アクション**: navigate' : '- **Action**: navigate');
      testCases.push(`- **URL**: ${pagePath || '/'}`);
      testCases.push(this.language === 'ja' ? '- **期待結果**: フォームが表示される\n' : '- **Expected Result**: Form is displayed\n');

      testCases.push(this.language === 'ja' ? '\n#### ステップ2: 空のまま送信' : '\n#### Step 2: Submit without filling');
      testCases.push(this.language === 'ja' ? '- **アクション**: click' : '- **Action**: click');
      testCases.push(this.language === 'ja' ? '- **セレクタ**: button[type="submit"]' : '- **Selector**: button[type="submit"]');
      testCases.push(this.language === 'ja' ? '- **期待結果**: 送信ボタンがクリックされる\n' : '- **Expected Result**: Submit button is clicked\n');

      testCases.push(this.language === 'ja' ? '\n#### ステップ3: エラーメッセージの確認' : '\n#### Step 3: Verify error messages');
      testCases.push(this.language === 'ja' ? '- **アクション**: assert' : '- **Action**: assert');
      testCases.push(this.language === 'ja' ? '- **セレクタ**: .error-message, .field-error' : '- **Selector**: .error-message, .field-error');
      testCases.push(this.language === 'ja' ? '- **期待結果**: バリデーションエラーが表示される\n' : '- **Expected Result**: Validation errors are displayed\n');

      testCases.push('\n---\n');
    }

    await fs.writeFile(
      path.join(this.outputDir, 'form-tests.md'),
      testCases.join('\n')
    );
  }

  /**
   * APIテストを生成
   */
  private async generateApiTests(): Promise<void> {
    const apiRoutes = this.analysisResult.routes.filter(r => r.path.startsWith('/api'));
    
    if (apiRoutes.length === 0) return;

    const testCases: string[] = [];
    testCases.push(this.language === 'ja' ? '# APIテストケース\n' : '# API Test Cases\n');
    testCases.push(this.language === 'ja' ? '自動生成されたAPIテストケースです。\n' : 'Automatically generated API test cases.\n');

    for (const route of apiRoutes.slice(0, 10)) {
      for (const method of route.method) {
        testCases.push(this.language === 'ja' ? `\n## テストケース: ${method} ${route.path}\n` : `\n## Test Case: ${method} ${route.path}\n`);
        testCases.push(this.language === 'ja' ? '\n### テスト概要' : '\n### Test Overview');
        testCases.push(this.language === 'ja' ? `- **テスト名**: ${route.path}エンドポイントの${method}リクエスト` : `- **Test Name**: ${method} request to ${route.path} endpoint`);
        testCases.push(this.language === 'ja' ? `- **説明**: APIエンドポイントが正しく応答することを確認` : `- **Description**: Verify that the API endpoint responds correctly`);
        testCases.push(this.language === 'ja' ? '- **優先度**: 高\n' : '- **Priority**: High\n');
        testCases.push(this.language === 'ja' ? '\n### テストステップ\n' : '\n### Test Steps\n');

        testCases.push(this.language === 'ja' ? '\n#### ステップ1: APIテストページへ移動' : '\n#### Step 1: Navigate to API test page');
        testCases.push(this.language === 'ja' ? '- **アクション**: navigate' : '- **Action**: navigate');
        testCases.push('- **URL**: /api-test');
        testCases.push(this.language === 'ja' ? '- **期待結果**: APIテストページが表示される\n' : '- **Expected Result**: API test page is displayed\n');

        testCases.push(this.language === 'ja' ? '\n#### ステップ2: エンドポイントURLを入力' : '\n#### Step 2: Enter endpoint URL');
        testCases.push(this.language === 'ja' ? '- **アクション**: type' : '- **Action**: type');
        testCases.push(this.language === 'ja' ? '- **セレクタ**: input[name="endpoint"]' : '- **Selector**: input[name="endpoint"]');
        testCases.push(this.language === 'ja' ? `- **値**: ${route.path}` : `- **Value**: ${route.path}`);
        testCases.push(this.language === 'ja' ? '- **期待結果**: エンドポイントが入力される\n' : '- **Expected Result**: Endpoint is entered\n');

        testCases.push(this.language === 'ja' ? '\n#### ステップ3: HTTPメソッドを選択' : '\n#### Step 3: Select HTTP method');
        testCases.push(this.language === 'ja' ? '- **アクション**: select' : '- **Action**: select');
        testCases.push(this.language === 'ja' ? '- **セレクタ**: select[name="method"]' : '- **Selector**: select[name="method"]');
        testCases.push(this.language === 'ja' ? `- **値**: ${method}` : `- **Value**: ${method}`);
        testCases.push(this.language === 'ja' ? '- **期待結果**: メソッドが選択される\n' : '- **Expected Result**: Method is selected\n');

        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          testCases.push(this.language === 'ja' ? '\n#### ステップ4: リクエストボディを入力' : '\n#### Step 4: Enter request body');
          testCases.push(this.language === 'ja' ? '- **アクション**: type' : '- **Action**: type');
          testCases.push(this.language === 'ja' ? '- **セレクタ**: textarea[name="body"]' : '- **Selector**: textarea[name="body"]');
          testCases.push(this.language === 'ja' ? '- **値**: {"test": "data"}' : '- **Value**: {"test": "data"}');
          testCases.push(this.language === 'ja' ? '- **期待結果**: リクエストボディが入力される\n' : '- **Expected Result**: Request body is entered\n');
        }

        const stepNum = method === 'GET' || method === 'DELETE' ? 4 : 5;
        testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum}: リクエスト送信` : `\n#### Step ${stepNum}: Send request`);
        testCases.push(this.language === 'ja' ? '- **アクション**: click' : '- **Action**: click');
        testCases.push(this.language === 'ja' ? '- **セレクタ**: button[type="submit"]' : '- **Selector**: button[type="submit"]');
        testCases.push(this.language === 'ja' ? '- **期待結果**: リクエストが送信される\n' : '- **Expected Result**: Request is sent\n');

        testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum + 1}: レスポンスの確認` : `\n#### Step ${stepNum + 1}: Verify response`);
        testCases.push(this.language === 'ja' ? '- **アクション**: assert' : '- **Action**: assert');
        testCases.push(this.language === 'ja' ? '- **セレクタ**: .response-status' : '- **Selector**: .response-status');
        testCases.push(this.language === 'ja' ? '- **期待結果**: 正常なレスポンスが返される\n' : '- **Expected Result**: Normal response is returned\n');

        testCases.push('\n---\n');
      }
    }

    await fs.writeFile(
      path.join(this.outputDir, 'api-tests.md'),
      testCases.join('\n')
    );
  }

  /**
   * ページ表示テストを生成
   */
  private async generatePageTests(): Promise<void> {
    const pages = this.analysisResult.pages;
    
    if (pages.length === 0) return;

    const testCases: string[] = [];
    testCases.push(this.language === 'ja' ? '# ページ表示テストケース\n' : '# Page Display Test Cases\n');
    testCases.push(this.language === 'ja' ? '自動生成されたページ表示テストケースです。\n' : 'Automatically generated page display test cases.\n');

    for (const page of pages.slice(0, 10)) {
      testCases.push(this.language === 'ja' ? `\n## テストケース: ${page.title || page.route}の表示\n` : `\n## Test Case: Display ${page.title || page.route}\n`);
      testCases.push(this.language === 'ja' ? '\n### テスト概要' : '\n### Test Overview');
      testCases.push(this.language === 'ja' ? `- **テスト名**: ${page.title || page.route}ページの表示確認` : `- **Test Name**: ${page.title || page.route} page display verification`);
      testCases.push(this.language === 'ja' ? '- **説明**: ページが正しく表示されることを確認' : '- **Description**: Verify that the page displays correctly');
      testCases.push(this.language === 'ja' ? '- **優先度**: 中\n' : '- **Priority**: Medium\n');
      testCases.push(this.language === 'ja' ? '\n### テストステップ\n' : '\n### Test Steps\n');

      testCases.push(this.language === 'ja' ? '\n#### ステップ1: ページへ移動' : '\n#### Step 1: Navigate to page');
      testCases.push(this.language === 'ja' ? '- **アクション**: navigate' : '- **Action**: navigate');
      const pageUrl = page.route.startsWith('http') 
        ? page.route 
        : `${this.baseUrl}${page.route.startsWith('/') ? page.route : '/' + page.route}`;
      testCases.push(`- **URL**: ${pageUrl}`);
      testCases.push(this.language === 'ja' ? '- **期待結果**: ページが表示される\n' : '- **Expected Result**: Page is displayed\n');

      testCases.push(this.language === 'ja' ? '\n#### ステップ2: ページロードを待機' : '\n#### Step 2: Wait for page load');
      testCases.push(this.language === 'ja' ? '- **アクション**: wait' : '- **Action**: wait');
      testCases.push(this.language === 'ja' ? '- **値**: 2000' : '- **Value**: 2000');
      testCases.push(this.language === 'ja' ? '- **期待結果**: ページが完全に読み込まれる\n' : '- **Expected Result**: Page is fully loaded\n');

      testCases.push(this.language === 'ja' ? '\n#### ステップ3: ページタイトルの確認' : '\n#### Step 3: Verify page title');
      testCases.push(this.language === 'ja' ? '- **アクション**: assert' : '- **Action**: assert');
      testCases.push(this.language === 'ja' ? '- **セレクタ**: h1, .page-title' : '- **Selector**: h1, .page-title');
      const expectedTitle = this.language === 'ja' ? (page.title || 'ページタイトル') : (page.title || 'Page title');
      testCases.push(this.language === 'ja' ? `- **期待結果**: ${expectedTitle}が表示される\n` : `- **Expected Result**: ${expectedTitle} is displayed\n`);

      if (page.forms.length > 0) {
        testCases.push(this.language === 'ja' ? '\n#### ステップ4: フォームの存在確認' : '\n#### Step 4: Verify form existence');
        testCases.push(this.language === 'ja' ? '- **アクション**: assert' : '- **Action**: assert');
        testCases.push(this.language === 'ja' ? '- **セレクタ**: form' : '- **Selector**: form');
        testCases.push(this.language === 'ja' ? '- **期待結果**: フォームが表示される\n' : '- **Expected Result**: Form is displayed\n');
      }

      if (page.links.length > 0) {
        const stepNum = page.forms.length > 0 ? 5 : 4;
        testCases.push(this.language === 'ja' ? `\n#### ステップ${stepNum}: リンクの存在確認` : `\n#### Step ${stepNum}: Verify link existence`);
        testCases.push(this.language === 'ja' ? '- **アクション**: assert' : '- **Action**: assert');
        testCases.push(this.language === 'ja' ? `- **セレクタ**: a[href="${page.links[0]}"]` : `- **Selector**: a[href="${page.links[0]}"]`);
        testCases.push(this.language === 'ja' ? '- **期待結果**: リンクが表示される\n' : '- **Expected Result**: Link is displayed\n');
      }

      testCases.push('\n---\n');
    }

    await fs.writeFile(
      path.join(this.outputDir, 'page-tests.md'),
      testCases.join('\n')
    );
  }

  /**
   * フォームが存在するページを検索
   */
  private findPageForForm(form: FormInfo): string | undefined {
    const formFile = form.file;
    
    // ファイルパスからルートを推測
    if (formFile.includes('/app/')) {
      const appPath = formFile.split('/app/')[1];
      const dir = path.dirname(appPath);
      const route = dir.replace(/\\/g, '/').replace(/^\(.*?\)\//, '');
      return '/' + route;
    }
    
    // ページから検索
    for (const page of this.analysisResult.pages) {
      if (page.forms.some(f => f.name === form.name)) {
        return page.route;
      }
    }
    
    return undefined;
  }

  /**
   * フォーム要素のサンプル値を生成
   */
  private generateSampleValue(element: any): string {
    const { type, name } = element;
    
    if (name) {
      if (name.includes('email')) return 'test@example.com';
      if (name.includes('password')) return 'Test123!@#';
      if (name.includes('name')) return this.language === 'ja' ? 'テスト太郎' : 'Test User';
      if (name.includes('phone')) return '090-1234-5678';
      if (name.includes('url')) return 'https://example.com';
      if (name.includes('date')) return '2024-01-01';
      if (name.includes('time')) return '12:00';
      if (name.includes('number')) return '100';
      if (name.includes('age')) return '30';
      if (name.includes('message') || name.includes('comment')) {
        return this.language === 'ja' ? 'これはテストメッセージです。' : 'This is a test message.';
      }
    }
    
    switch (type) {
      case 'email': return 'test@example.com';
      case 'password': return 'Test123!@#';
      case 'tel': return '090-1234-5678';
      case 'url': return 'https://example.com';
      case 'date': return '2024-01-01';
      case 'time': return '12:00';
      case 'number': return '100';
      case 'textarea': return this.language === 'ja' ? 'これはテストメッセージです。' : 'This is a test message.';
      default: return this.language === 'ja' ? 'テストデータ' : 'Test Data';
    }
  }
}