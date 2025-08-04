/**
 * 解析結果から自動的にテストを実行
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { AnalysisResult, FormInfo, PageInfo, RouteInfo } from './source-code-analyzer';
import path from 'path';
import fs from 'fs/promises';

export interface TestExecutionResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
  details?: any;
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestExecutionResult[];
  screenshots: string[];
}

export class AutoTestExecutor {
  private analysisResult: AnalysisResult;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private screenshotDir: string;
  private screenshotSize: string;
  private results: TestExecutionResult[] = [];

  constructor(analysisResult: AnalysisResult, screenshotDir: string, screenshotSize: string = "desktop-1920") {
    this.analysisResult = analysisResult;
    this.screenshotDir = screenshotDir;
    this.screenshotSize = screenshotSize;
  }

  /**
   * すべてのテストを実行
   */
  async executeAll(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];

    try {
      // ブラウザを起動
      await this.setupBrowser();

      // ページ表示テストを実行
      console.log('Executing page display tests...');
      await this.executePageTests();

      // フォームテストを実行
      console.log('Executing form tests...');
      await this.executeFormTests();

      // ナビゲーションテストを実行
      console.log('Executing navigation tests...');
      await this.executeNavigationTests();

      // APIテストを実行（ブラウザテストではなくHTTPリクエスト）
      console.log('Executing API tests...');
      await this.executeApiTests();

    } catch (error) {
      console.error('Test execution error:', error);
    } finally {
      await this.cleanup();
    }

    // 結果を集計
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    // スクリーンショットを収集
    for (const result of this.results) {
      if (result.screenshot) {
        screenshots.push(result.screenshot);
      }
    }

    return {
      suiteName: 'Auto-Generated Test Suite',
      totalTests: this.results.length,
      passed,
      failed,
      skipped,
      duration: Date.now() - startTime,
      tests: this.results,
      screenshots,
    };
  }

  /**
   * ブラウザをセットアップ
   */
  private async setupBrowser() {
    // スクリーンショットサイズから viewport を計算
    const viewport = this.getViewportSize(this.screenshotSize);
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--lang=ja-JP',
      ],
    });

    this.context = await this.browser.newContext({
      locale: 'ja-JP',
      viewport,
      deviceScaleFactor: 1,
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);
  }

  /**
   * クリーンアップ
   */
  private async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * ページ表示テストを実行
   */
  private async executePageTests() {
    const pages = this.analysisResult.pages.slice(0, 10); // 最初の10ページ

    for (const pageInfo of pages) {
      const testName = `ページ表示: ${pageInfo.route}`;
      const startTime = Date.now();

      try {
        // ページにアクセス
        const url = `${this.analysisResult.baseUrl}${pageInfo.route}`;
        await this.page!.goto(url, { waitUntil: 'networkidle' });

        // ページが表示されることを確認
        await this.page!.waitForSelector('body', { state: 'visible' });

        // タイトルが存在する場合は確認
        if (pageInfo.title) {
          const titleElement = await this.page!.$('h1, .page-title');
          if (titleElement) {
            const titleText = await titleElement.textContent();
            console.log(`Page title: ${titleText}`);
          }
        }

        // スクリーンショットを撮影
        const screenshot = await this.takeScreenshot(`page-${pageInfo.route.replace(/\//g, '-')}`);

        this.results.push({
          testName,
          status: 'passed',
          duration: Date.now() - startTime,
          screenshot,
          details: { url, title: pageInfo.title },
        });

      } catch (error) {
        const screenshot = await this.takeScreenshot(`error-${pageInfo.route.replace(/\//g, '-')}`);
        
        this.results.push({
          testName,
          status: 'failed',
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          screenshot,
        });
      }
    }
  }

  /**
   * フォームテストを実行
   */
  private async executeFormTests() {
    const forms = this.analysisResult.forms.slice(0, 5); // 最初の5つのフォーム

    for (const form of forms) {
      const testName = `フォーム: ${form.name}`;
      const startTime = Date.now();

      try {
        // フォームが存在するページを探す
        const pageWithForm = this.findPageWithForm(form);
        if (!pageWithForm) {
          this.results.push({
            testName,
            status: 'skipped',
            duration: 0,
            error: 'フォームが存在するページが見つかりません',
          });
          continue;
        }

        // ページにアクセス
        const url = `${this.analysisResult.baseUrl}${pageWithForm}`;
        await this.page!.goto(url, { waitUntil: 'networkidle' });

        // フォーム要素を入力
        for (const element of form.elements) {
          if (element.type === 'submit') continue;

          try {
            const selector = element.selector || `[name="${element.name}"]`;
            
            if (element.type === 'select') {
              const selectElement = await this.page!.$(selector);
              if (selectElement) {
                const options = await selectElement.$$eval('option', opts => 
                  opts.map(opt => opt.value).filter(v => v)
                );
                if (options.length > 0) {
                  await this.page!.selectOption(selector, options[0]);
                }
              }
            } else if (element.type === 'checkbox' || element.type === 'radio') {
              await this.page!.click(selector);
            } else {
              await this.page!.fill(selector, this.generateTestValue(element));
            }
          } catch (error) {
            console.log(`Failed to fill element: ${element.selector || element.name}`);
          }
        }

        // スクリーンショットを撮影
        const screenshot = await this.takeScreenshot(`form-${form.name.replace(/\s+/g, '-')}`);

        this.results.push({
          testName,
          status: 'passed',
          duration: Date.now() - startTime,
          screenshot,
          details: { formName: form.name, elements: form.elements.length },
        });

      } catch (error) {
        const screenshot = await this.takeScreenshot(`error-form-${form.name.replace(/\s+/g, '-')}`);
        
        this.results.push({
          testName,
          status: 'failed',
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          screenshot,
        });
      }
    }
  }

  /**
   * ナビゲーションテストを実行
   */
  private async executeNavigationTests() {
    const navigation = this.analysisResult.navigation.slice(0, 5); // 最初の5つのリンク
    
    if (navigation.length === 0) {
      this.results.push({
        testName: 'ナビゲーション: 基本',
        status: 'skipped',
        duration: 0,
        error: 'ナビゲーションリンクが見つかりません',
      });
      return;
    }

    for (const link of navigation) {
      const testName = `ナビゲーション: ${link}`;
      const startTime = Date.now();

      try {
        // トップページにアクセス
        await this.page!.goto(this.analysisResult.baseUrl, { waitUntil: 'networkidle' });

        // リンクをクリック
        const linkSelector = `a[href="${link}"]`;
        await this.page!.click(linkSelector);
        await this.page!.waitForLoadState('networkidle');

        // ページが表示されることを確認
        await this.page!.waitForSelector('body', { state: 'visible' });

        // スクリーンショットを撮影
        const screenshot = await this.takeScreenshot(`nav-${link.replace(/\//g, '-')}`);

        this.results.push({
          testName,
          status: 'passed',
          duration: Date.now() - startTime,
          screenshot,
          details: { link },
        });

      } catch (error) {
        const screenshot = await this.takeScreenshot(`error-nav-${link.replace(/\//g, '-')}`);
        
        this.results.push({
          testName,
          status: 'failed',
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          screenshot,
        });
      }
    }
  }

  /**
   * APIテストを実行
   */
  private async executeApiTests() {
    const apiRoutes = this.analysisResult.routes
      .filter(r => r.path.startsWith('/api'))
      .slice(0, 10); // 最初の10個のAPI

    for (const route of apiRoutes) {
      for (const method of route.method) {
        const testName = `API: ${method} ${route.path}`;
        const startTime = Date.now();

        try {
          const url = `${this.analysisResult.baseUrl}${route.path}`;
          
          // GETリクエストのみ実行（他のメソッドはデータが必要なため）
          if (method === 'GET') {
            const response = await fetch(url, {
              method,
              headers: {
                'Content-Type': 'application/json',
              },
            });

            this.results.push({
              testName,
              status: response.ok ? 'passed' : 'failed',
              duration: Date.now() - startTime,
              details: {
                url,
                method,
                statusCode: response.status,
              },
            });
          } else {
            // GET以外はスキップ
            this.results.push({
              testName,
              status: 'skipped',
              duration: 0,
              error: `${method}メソッドは自動テストでスキップ`,
            });
          }
        } catch (error) {
          this.results.push({
            testName,
            status: 'failed',
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * スクリーンショットサイズからviewportサイズを取得
   */
  private getViewportSize(screenshotSize: string): { width: number; height: number } {
    const sizeMap: Record<string, { width: number; height: number }> = {
      // iPhone Series
      'mobile-iphone12-mini': { width: 375, height: 812 },
      'mobile-iphone12': { width: 390, height: 844 },
      'mobile-iphone14': { width: 390, height: 844 },
      'mobile-iphone14pro': { width: 393, height: 852 },
      'mobile-iphone14plus': { width: 428, height: 926 },
      'mobile-iphone15': { width: 393, height: 852 },
      'mobile-iphone15pro': { width: 393, height: 852 },
      'mobile-iphone15promax': { width: 430, height: 932 },
      'mobile-iphone16': { width: 402, height: 874 },
      'mobile-iphone16pro': { width: 402, height: 874 },
      'mobile-iphone16promax': { width: 440, height: 956 },
      // Android Series
      'mobile-galaxys20': { width: 360, height: 800 },
      'mobile-galaxys21': { width: 384, height: 854 },
      'mobile-galaxys22': { width: 360, height: 780 },
      'mobile-galaxys23': { width: 360, height: 780 },
      'mobile-galaxys24': { width: 384, height: 832 },
      'mobile-pixel6': { width: 412, height: 915 },
      'mobile-pixel7': { width: 412, height: 915 },
      'mobile-pixel8': { width: 412, height: 915 },
      'mobile-pixel8pro': { width: 448, height: 992 },
      // iPad Series
      'tablet-ipad-mini': { width: 744, height: 1133 },
      'tablet-ipad': { width: 820, height: 1180 },
      'tablet-ipad-air': { width: 820, height: 1180 },
      'tablet-ipadpro11': { width: 834, height: 1194 },
      'tablet-ipadpro12': { width: 1024, height: 1366 },
      // Android Tablets
      'tablet-galaxy-tab-s8': { width: 753, height: 1205 },
      'tablet-galaxy-tab-s9': { width: 753, height: 1205 },
      // Desktop Sizes
      'desktop-1280': { width: 1280, height: 720 },
      'desktop-1366': { width: 1366, height: 768 },
      'desktop-1440': { width: 1440, height: 900 },
      'desktop-1920': { width: 1920, height: 1080 },
      'desktop-2560': { width: 2560, height: 1440 },
      'desktop-3840': { width: 3840, height: 2160 },
    };

    return sizeMap[screenshotSize] || sizeMap['desktop-1920'];
  }

  /**
   * スクリーンショットを撮影
   */
  private async takeScreenshot(name: string): Promise<string | undefined> {
    if (!this.page) return undefined;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}_${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      
      await fs.mkdir(this.screenshotDir, { recursive: true });
      await this.page.screenshot({ path: filepath, fullPage: true });
      
      return `/screenshots/${filename}`;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return undefined;
    }
  }

  /**
   * フォームが存在するページを探す
   */
  private findPageWithForm(form: FormInfo): string | undefined {
    // ファイルパスからページを推測
    const formFile = form.file;
    
    for (const page of this.analysisResult.pages) {
      if (page.forms.some(f => f.name === form.name)) {
        return page.route;
      }
    }

    // デフォルトでルートページを返す
    return '/';
  }

  /**
   * テスト用の値を生成
   */
  private generateTestValue(element: any): string {
    const { type, name } = element;
    
    if (name) {
      if (name.includes('email')) return 'test@example.com';
      if (name.includes('password')) return 'Test123!@#';
      if (name.includes('name')) return 'テストユーザー';
      if (name.includes('phone')) return '090-1234-5678';
      if (name.includes('url')) return 'https://example.com';
      if (name.includes('message')) return 'これはテストメッセージです';
    }
    
    switch (type) {
      case 'email': return 'test@example.com';
      case 'password': return 'Test123!@#';
      case 'tel': return '090-1234-5678';
      case 'url': return 'https://example.com';
      case 'number': return '100';
      case 'date': return '2024-01-01';
      case 'textarea': return 'テストテキスト';
      default: return 'テストデータ';
    }
  }
}