import OpenAI from "openai";

interface TestStep {
  action: "navigate" | "click" | "type" | "wait" | "assert";
  selector?: string;
  value?: string;
  expectedResult?: string;
}

interface GeneratedTestCase {
  name: string;
  description: string;
  steps: TestStep[];
}

interface SpecDocument {
  content: string;
  fileName: string;
  type?: "markdown" | "text" | "html";
}

const systemPrompt = `あなたは優秀なQAエンジニアです。
仕様書を分析して、Playwrightで実行可能なE2Eテストケースを生成します。

以下のルールに従ってください：
1. 重要な機能から順にテストケースを作成
2. 正常系と異常系の両方をカバー
3. ユーザーの実際の操作フローを再現
4. セレクタはできるだけ具体的に（data-testid, aria-label, textなど）
5. 各テストケースは独立して実行可能

出力形式は以下のJSONスキーマに従ってください：
{
  "testCases": [
    {
      "name": "テストケース名",
      "description": "テストの目的と概要",
      "steps": [
        {
          "action": "navigate|click|type|wait|assert",
          "selector": "CSS selector or text",
          "value": "入力値やURL（必要な場合）",
          "expectedResult": "期待される結果"
        }
      ]
    }
  ]
}`;

export class TestCaseGenerator {
  private openai: OpenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: false,
      });
    }
  }

  /**
   * 仕様書からテストケースを生成
   */
  async generateFromSpec(
    spec: SpecDocument,
    baseUrl: string,
    additionalContext?: string,
  ): Promise<GeneratedTestCase[]> {
    if (!this.openai) {
      // OpenAI APIキーがない場合は、ルールベースで生成
      return this.generateRuleBasedTests(spec, baseUrl);
    }

    try {
      const userPrompt = `
以下の仕様書から、E2Eテストケースを生成してください。

ベースURL: ${baseUrl}
${additionalContext ? `追加コンテキスト: ${additionalContext}` : ""}

仕様書（${spec.fileName}）:
---
${spec.content}
---

重要な機能を網羅する5-10個のテストケースを生成してください。
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.testCases || [];
    } catch (error) {
      console.error("OpenAI API error:", error);
      // フォールバック: ルールベースで生成
      return this.generateRuleBasedTests(spec, baseUrl);
    }
  }

  /**
   * 複数の仕様書からテストケースを生成
   */
  async generateFromMultipleSpecs(
    specs: SpecDocument[],
    baseUrl: string,
    additionalContext?: string,
  ): Promise<GeneratedTestCase[]> {
    const allTestCases: GeneratedTestCase[] = [];

    for (const spec of specs) {
      const testCases = await this.generateFromSpec(spec, baseUrl, additionalContext);
      allTestCases.push(...testCases);
    }

    // 重複を除去して優先度順にソート
    return this.deduplicateAndPrioritize(allTestCases);
  }

  /**
   * ルールベースでテストケースを生成（フォールバック）
   */
  private generateRuleBasedTests(spec: SpecDocument, baseUrl: string): GeneratedTestCase[] {
    const testCases: GeneratedTestCase[] = [];
    const content = spec.content.toLowerCase();

    // ログイン機能の検出
    if (content.includes("ログイン") || content.includes("login") || content.includes("認証")) {
      testCases.push({
        name: "ユーザーログイン機能のテスト",
        description: "正常なログインフローを確認",
        steps: [
          {
            action: "navigate",
            value: `${baseUrl}/login`,
            expectedResult: "ログインページが表示される",
          },
          {
            action: "type",
            selector: 'input[name="email"], input[type="email"]',
            value: "test@example.com",
            expectedResult: "メールアドレスが入力される",
          },
          {
            action: "type",
            selector: 'input[name="password"], input[type="password"]',
            value: "password123",
            expectedResult: "パスワードが入力される",
          },
          {
            action: "click",
            selector: 'button[type="submit"], button:has-text("ログイン")',
            expectedResult: "ログインボタンがクリックされる",
          },
          {
            action: "wait",
            value: "2000",
            expectedResult: "ページ遷移を待機",
          },
          {
            action: "assert",
            selector: "body",
            expectedResult: "ダッシュボードまたはホームページが表示される",
          },
        ],
      });

      testCases.push({
        name: "ログイン失敗時のエラー表示",
        description: "無効な認証情報でのエラーハンドリングを確認",
        steps: [
          {
            action: "navigate",
            value: `${baseUrl}/login`,
            expectedResult: "ログインページが表示される",
          },
          {
            action: "type",
            selector: 'input[name="email"], input[type="email"]',
            value: "invalid@example.com",
            expectedResult: "メールアドレスが入力される",
          },
          {
            action: "type",
            selector: 'input[name="password"], input[type="password"]',
            value: "wrongpassword",
            expectedResult: "パスワードが入力される",
          },
          {
            action: "click",
            selector: 'button[type="submit"], button:has-text("ログイン")',
            expectedResult: "ログインボタンがクリックされる",
          },
          {
            action: "assert",
            selector: '.error, .alert, [role="alert"]',
            expectedResult: "エラーメッセージが表示される",
          },
        ],
      });
    }

    // 登録機能の検出
    if (content.includes("登録") || content.includes("signup") || content.includes("新規")) {
      testCases.push({
        name: "新規ユーザー登録のテスト",
        description: "新規アカウント作成フローを確認",
        steps: [
          {
            action: "navigate",
            value: `${baseUrl}/signup`,
            expectedResult: "登録ページが表示される",
          },
          {
            action: "type",
            selector: 'input[name="name"], input[placeholder*="名前"]',
            value: "テストユーザー",
            expectedResult: "名前が入力される",
          },
          {
            action: "type",
            selector: 'input[name="email"], input[type="email"]',
            value: `test${Date.now()}@example.com`,
            expectedResult: "メールアドレスが入力される",
          },
          {
            action: "type",
            selector: 'input[name="password"], input[type="password"]',
            value: "SecurePass123!",
            expectedResult: "パスワードが入力される",
          },
          {
            action: "click",
            selector: 'button[type="submit"], button:has-text("登録")',
            expectedResult: "登録ボタンがクリックされる",
          },
          {
            action: "assert",
            selector: "body",
            expectedResult: "登録完了またはダッシュボードが表示される",
          },
        ],
      });
    }

    // 検索機能の検出
    if (content.includes("検索") || content.includes("search") || content.includes("フィルタ")) {
      testCases.push({
        name: "検索機能のテスト",
        description: "検索とフィルタリング機能を確認",
        steps: [
          {
            action: "navigate",
            value: baseUrl,
            expectedResult: "トップページが表示される",
          },
          {
            action: "type",
            selector: 'input[type="search"], input[placeholder*="検索"]',
            value: "テスト検索ワード",
            expectedResult: "検索キーワードが入力される",
          },
          {
            action: "click",
            selector: 'button[type="submit"], button:has-text("検索")',
            expectedResult: "検索が実行される",
          },
          {
            action: "wait",
            value: "1000",
            expectedResult: "検索結果の表示を待機",
          },
          {
            action: "assert",
            selector: '.results, .search-results, [data-testid="results"]',
            expectedResult: "検索結果が表示される",
          },
        ],
      });
    }

    // CRUD操作の検出
    if (content.includes("作成") || content.includes("create") || content.includes("追加")) {
      testCases.push({
        name: "データ作成機能のテスト",
        description: "新規データの作成フローを確認",
        steps: [
          {
            action: "navigate",
            value: baseUrl,
            expectedResult: "ページが表示される",
          },
          {
            action: "click",
            selector: 'button:has-text("新規作成"), button:has-text("追加"), .add-button',
            expectedResult: "新規作成ボタンがクリックされる",
          },
          {
            action: "type",
            selector: 'input[name="title"], input:first-of-type',
            value: `テストデータ ${Date.now()}`,
            expectedResult: "タイトルが入力される",
          },
          {
            action: "click",
            selector: 'button[type="submit"], button:has-text("保存")',
            expectedResult: "保存ボタンがクリックされる",
          },
          {
            action: "assert",
            selector: '.success, .toast, [role="alert"]',
            expectedResult: "成功メッセージが表示される",
          },
        ],
      });
    }

    // 基本的なナビゲーションテスト
    if (testCases.length === 0) {
      testCases.push({
        name: "基本的なページ表示テスト",
        description: "ページが正常に表示されることを確認",
        steps: [
          {
            action: "navigate",
            value: baseUrl,
            expectedResult: "ページが表示される",
          },
          {
            action: "assert",
            selector: "body",
            expectedResult: "ページコンテンツが存在する",
          },
        ],
      });
    }

    return testCases;
  }

  /**
   * 重複を除去して優先度順にソート
   */
  private deduplicateAndPrioritize(testCases: GeneratedTestCase[]): GeneratedTestCase[] {
    const uniqueTests = new Map<string, GeneratedTestCase>();

    for (const testCase of testCases) {
      const key = this.generateTestKey(testCase);
      if (!uniqueTests.has(key)) {
        uniqueTests.set(key, testCase);
      }
    }

    // 優先度順にソート（ログイン > 基本機能 > その他）
    return Array.from(uniqueTests.values()).sort((a, b) => {
      const priorityA = this.getTestPriority(a);
      const priorityB = this.getTestPriority(b);
      return priorityB - priorityA;
    });
  }

  private generateTestKey(testCase: GeneratedTestCase): string {
    return `${testCase.name}_${testCase.steps.length}`;
  }

  private getTestPriority(testCase: GeneratedTestCase): number {
    const name = testCase.name.toLowerCase();
    if (name.includes("ログイン") || name.includes("認証")) return 10;
    if (name.includes("登録") || name.includes("サインアップ")) return 9;
    if (name.includes("作成") || name.includes("追加")) return 8;
    if (name.includes("編集") || name.includes("更新")) return 7;
    if (name.includes("削除")) return 6;
    if (name.includes("検索")) return 5;
    if (name.includes("表示") || name.includes("一覧")) return 4;
    return 1;
  }
}

// 仕様書パーサー
export class SpecParser {
  /**
   * ディレクトリから仕様書を読み込み
   */
  static parseFiles(files: File[]): SpecDocument[] {
    return files.map((file) => ({
      fileName: file.name,
      content: "", // This will be filled after reading the file
      type: SpecParser.detectFileType(file.name),
    }));
  }

  private static detectFileType(fileName: string): "markdown" | "text" | "html" {
    if (fileName.endsWith(".md")) return "markdown";
    if (fileName.endsWith(".html") || fileName.endsWith(".htm")) return "html";
    return "text";
  }

  /**
   * ファイルの内容を読み込み
   */
  static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}
