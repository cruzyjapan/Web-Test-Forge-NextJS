/**
 * ローカルで動作する仕様書ベースのテストケース生成器
 * 外部APIを使用せず、ルールベースとパターンマッチングで生成
 */

interface TestStep {
  action: "navigate" | "click" | "type" | "wait" | "assert" | "scroll" | "select" | "hover";
  selector?: string;
  value?: string;
  expectedResult?: string;
}

interface GeneratedTestCase {
  name: string;
  description: string;
  priority: "high" | "medium" | "low";
  steps: TestStep[];
  tags?: string[];
}

interface SpecDocument {
  content: string;
  fileName: string;
  type?: "markdown" | "text" | "html" | "json";
}

interface SpecPattern {
  pattern: RegExp;
  extractor: (matches: RegExpMatchArray, context: AnalysisContext) => Partial<GeneratedTestCase>[];
  priority: number;
}

interface AnalysisContext {
  baseUrl: string;
  projectName?: string;
  language: "ja" | "en";
  existingTests?: string[];
}

export class LocalTestGenerator {
  private patterns: SpecPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * パターンマッチング用のルールを初期化
   */
  private initializePatterns() {
    // ユーザー認証関連のパターン
    this.patterns.push({
      pattern: /(ログイン|サインイン|認証|authentication|login|sign\s*in)/gi,
      priority: 10,
      extractor: (matches, context) => {
        const tests: Partial<GeneratedTestCase>[] = [];

        // 正常系ログインテスト
        tests.push({
          name: "正常なユーザーログイン",
          description: "有効な認証情報でログインできることを確認",
          priority: "high",
          tags: ["auth", "login", "smoke"],
          steps: [
            {
              action: "navigate",
              value: `${context.baseUrl}/login`,
              expectedResult: "ログインページが表示される",
            },
            {
              action: "type",
              selector: '[data-testid="email"], input[type="email"], #email',
              value: "test@example.com",
              expectedResult: "メールアドレスが入力される",
            },
            {
              action: "type",
              selector: '[data-testid="password"], input[type="password"], #password',
              value: "Test123!@#",
              expectedResult: "パスワードが入力される",
            },
            {
              action: "click",
              selector: '[data-testid="login-button"], button[type="submit"]',
              expectedResult: "ログインボタンがクリックされる",
            },
            {
              action: "wait",
              value: "2000",
              expectedResult: "ページ遷移を待機",
            },
            {
              action: "assert",
              selector: '[data-testid="dashboard"], .dashboard, #dashboard',
              expectedResult: "ダッシュボードが表示される",
            },
          ],
        });

        // 異常系ログインテスト
        tests.push({
          name: "無効な認証情報でのログイン失敗",
          description: "誤った認証情報でエラーが表示されることを確認",
          priority: "high",
          tags: ["auth", "login", "error"],
          steps: [
            {
              action: "navigate",
              value: `${context.baseUrl}/login`,
              expectedResult: "ログインページが表示される",
            },
            {
              action: "type",
              selector: '[data-testid="email"], input[type="email"]',
              value: "wrong@example.com",
              expectedResult: "無効なメールアドレスが入力される",
            },
            {
              action: "type",
              selector: '[data-testid="password"], input[type="password"]',
              value: "wrongpassword",
              expectedResult: "無効なパスワードが入力される",
            },
            {
              action: "click",
              selector: '[data-testid="login-button"], button[type="submit"]',
              expectedResult: "ログインボタンがクリックされる",
            },
            {
              action: "assert",
              selector: '[data-testid="error-message"], .error, .alert-danger',
              expectedResult: "エラーメッセージが表示される",
            },
          ],
        });

        return tests;
      },
    });

    // ユーザー登録関連のパターン
    this.patterns.push({
      pattern:
        /(新規登録|サインアップ|アカウント作成|registration|signup|sign\s*up|create\s*account)/gi,
      priority: 9,
      extractor: (matches, context) => [
        {
          name: "新規ユーザー登録",
          description: "新しいアカウントを作成できることを確認",
          priority: "high",
          tags: ["auth", "registration"],
          steps: [
            {
              action: "navigate",
              value: `${context.baseUrl}/signup`,
              expectedResult: "登録ページが表示される",
            },
            {
              action: "type",
              selector: '[data-testid="name"], input[name="name"]',
              value: "テストユーザー",
              expectedResult: "名前が入力される",
            },
            {
              action: "type",
              selector: '[data-testid="email"], input[type="email"]',
              value: `test${Date.now()}@example.com`,
              expectedResult: "メールアドレスが入力される",
            },
            {
              action: "type",
              selector: '[data-testid="password"], input[type="password"]:nth-of-type(1)',
              value: "SecurePass123!",
              expectedResult: "パスワードが入力される",
            },
            {
              action: "type",
              selector: '[data-testid="password-confirm"], input[type="password"]:nth-of-type(2)',
              value: "SecurePass123!",
              expectedResult: "パスワード確認が入力される",
            },
            {
              action: "click",
              selector: '[data-testid="terms"], input[type="checkbox"]',
              expectedResult: "利用規約に同意",
            },
            {
              action: "click",
              selector: '[data-testid="register-button"], button[type="submit"]',
              expectedResult: "登録ボタンがクリックされる",
            },
            {
              action: "assert",
              selector: '[data-testid="welcome"], .success',
              expectedResult: "登録完了メッセージが表示される",
            },
          ],
        },
      ],
    });

    // CRUD操作のパターン
    this.patterns.push({
      pattern: /(一覧表示|リスト表示|list|index|show\s*all)/gi,
      priority: 5,
      extractor: (matches, context) => [
        {
          name: "データ一覧表示",
          description: "データの一覧が正しく表示されることを確認",
          priority: "medium",
          tags: ["crud", "read"],
          steps: [
            {
              action: "navigate",
              value: context.baseUrl,
              expectedResult: "ページが表示される",
            },
            {
              action: "wait",
              value: "1000",
              expectedResult: "データ読み込みを待機",
            },
            {
              action: "assert",
              selector: '[data-testid="data-list"], .list, table',
              expectedResult: "データ一覧が表示される",
            },
          ],
        },
      ],
    });

    // 作成操作のパターン
    this.patterns.push({
      pattern: /(作成|追加|新規|create|add|new)/gi,
      priority: 8,
      extractor: (matches, context) => [
        {
          name: "新規データ作成",
          description: "新しいデータを作成できることを確認",
          priority: "high",
          tags: ["crud", "create"],
          steps: [
            {
              action: "navigate",
              value: context.baseUrl,
              expectedResult: "ページが表示される",
            },
            {
              action: "click",
              selector: '[data-testid="create-button"], button:has-text("新規作成")',
              expectedResult: "新規作成ボタンがクリックされる",
            },
            {
              action: "type",
              selector: '[data-testid="title"], input[name="title"]',
              value: `テストデータ ${new Date().toISOString()}`,
              expectedResult: "タイトルが入力される",
            },
            {
              action: "type",
              selector: '[data-testid="description"], textarea',
              value: "これはテストデータです",
              expectedResult: "説明が入力される",
            },
            {
              action: "click",
              selector: '[data-testid="save-button"], button[type="submit"]',
              expectedResult: "保存ボタンがクリックされる",
            },
            {
              action: "assert",
              selector: '[data-testid="success-message"], .toast-success',
              expectedResult: "成功メッセージが表示される",
            },
          ],
        },
      ],
    });

    // 編集操作のパターン
    this.patterns.push({
      pattern: /(編集|更新|修正|edit|update|modify)/gi,
      priority: 7,
      extractor: (matches, context) => [
        {
          name: "データ編集",
          description: "既存データを編集できることを確認",
          priority: "high",
          tags: ["crud", "update"],
          steps: [
            {
              action: "navigate",
              value: context.baseUrl,
              expectedResult: "ページが表示される",
            },
            {
              action: "click",
              selector: '[data-testid="edit-button"]:first, .edit-button:first',
              expectedResult: "編集ボタンがクリックされる",
            },
            {
              action: "type",
              selector: '[data-testid="title"], input[name="title"]',
              value: " (編集済み)",
              expectedResult: "タイトルが編集される",
            },
            {
              action: "click",
              selector: '[data-testid="save-button"], button[type="submit"]',
              expectedResult: "保存ボタンがクリックされる",
            },
            {
              action: "assert",
              selector: '[data-testid="success-message"]',
              expectedResult: "更新成功メッセージが表示される",
            },
          ],
        },
      ],
    });

    // 削除操作のパターン
    this.patterns.push({
      pattern: /(削除|除去|delete|remove)/gi,
      priority: 6,
      extractor: (matches, context) => [
        {
          name: "データ削除",
          description: "データを削除できることを確認",
          priority: "medium",
          tags: ["crud", "delete"],
          steps: [
            {
              action: "navigate",
              value: context.baseUrl,
              expectedResult: "ページが表示される",
            },
            {
              action: "click",
              selector: '[data-testid="delete-button"]:first, .delete-button:first',
              expectedResult: "削除ボタンがクリックされる",
            },
            {
              action: "click",
              selector: '[data-testid="confirm-delete"], button:has-text("確認")',
              expectedResult: "削除を確認",
            },
            {
              action: "assert",
              selector: '[data-testid="success-message"]',
              expectedResult: "削除成功メッセージが表示される",
            },
          ],
        },
      ],
    });

    // 検索機能のパターン
    this.patterns.push({
      pattern: /(検索|フィルタ|絞り込み|search|filter)/gi,
      priority: 5,
      extractor: (matches, context) => [
        {
          name: "検索機能",
          description: "検索機能が正しく動作することを確認",
          priority: "medium",
          tags: ["search", "filter"],
          steps: [
            {
              action: "navigate",
              value: context.baseUrl,
              expectedResult: "ページが表示される",
            },
            {
              action: "type",
              selector: '[data-testid="search-input"], input[type="search"]',
              value: "テスト検索ワード",
              expectedResult: "検索キーワードが入力される",
            },
            {
              action: "click",
              selector: '[data-testid="search-button"], button:has-text("検索")',
              expectedResult: "検索ボタンがクリックされる",
            },
            {
              action: "wait",
              value: "1000",
              expectedResult: "検索結果を待機",
            },
            {
              action: "assert",
              selector: '[data-testid="search-results"]',
              expectedResult: "検索結果が表示される",
            },
          ],
        },
      ],
    });

    // フォームバリデーションのパターン
    this.patterns.push({
      pattern: /(バリデーション|入力チェック|validation|form\s*check)/gi,
      priority: 4,
      extractor: (matches, context) => [
        {
          name: "フォームバリデーション",
          description: "フォームの入力検証が機能することを確認",
          priority: "medium",
          tags: ["validation", "form"],
          steps: [
            {
              action: "navigate",
              value: context.baseUrl,
              expectedResult: "ページが表示される",
            },
            {
              action: "click",
              selector: 'button[type="submit"]:first',
              expectedResult: "空のフォームで送信を試みる",
            },
            {
              action: "assert",
              selector: '[data-testid="validation-error"], .error-message',
              expectedResult: "バリデーションエラーが表示される",
            },
          ],
        },
      ],
    });
  }

  /**
   * 仕様書からテストケースを生成
   */
  async generateFromSpec(
    spec: SpecDocument,
    context: AnalysisContext,
  ): Promise<GeneratedTestCase[]> {
    try {
      console.log(`Generating tests from spec: ${spec.fileName}, type: ${spec.type}`);
      const testCases: GeneratedTestCase[] = [];
      const content = spec.content;

      if (!content || content.trim().length === 0) {
        console.warn("Empty content received");
        return [];
      }

      // パターンマッチングでテストケースを抽出
      for (const pattern of this.patterns.sort((a, b) => b.priority - a.priority)) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          console.log(`Pattern matched: ${pattern.pattern.source}`);
          const cases = pattern.extractor(matches, context);
          testCases.push(...cases.map((c) => this.completeTestCase(c)));
        }
      }

      // 機能仕様書の構造を解析
      const structuredTests = this.analyzeStructuredSpec(content, context);
      testCases.push(...structuredTests);

      console.log(`Total test cases generated: ${testCases.length}`);
      
      // 重複除去と優先順位付け
      return this.deduplicateAndPrioritize(testCases);
    } catch (error) {
      console.error("Error in generateFromSpec:", error);
      throw error;
    }
  }

  /**
   * 構造化された仕様書を解析
   */
  private analyzeStructuredSpec(content: string, context: AnalysisContext): GeneratedTestCase[] {
    const tests: GeneratedTestCase[] = [];

    // まず、テンプレート形式のテストケースを解析
    const templateTests = this.parseTemplateFormat(content, context);
    tests.push(...templateTests);

    // 機能要件のセクションを検出
    const functionalRequirements = this.extractSections(content, [
      "機能要件",
      "機能仕様",
      "Functional Requirements",
      "Features",
    ]);

    for (const section of functionalRequirements) {
      const testCase = this.generateTestFromRequirement(section, context);
      if (testCase) {
        tests.push(testCase);
      }
    }

    // ユースケースを検出
    const useCases = this.extractSections(content, [
      "ユースケース",
      "Use Case",
      "シナリオ",
      "Scenario",
    ]);

    for (const useCase of useCases) {
      const testCase = this.generateTestFromUseCase(useCase, context);
      if (testCase) {
        tests.push(testCase);
      }
    }

    return tests;
  }

  /**
   * テンプレート形式のテストケースを解析
   */
  private parseTemplateFormat(content: string, context: AnalysisContext): GeneratedTestCase[] {
    const tests: GeneratedTestCase[] = [];
    const lines = content.split('\n');
    
    let currentTestCase: Partial<GeneratedTestCase> | null = null;
    let currentSteps: TestStep[] = [];
    let inTestCase = false;
    let inTestSteps = false;
    
    console.log(`Parsing template format, total lines: ${lines.length}`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // テストケースの開始を検出 (## テストケース: で始まる行)
      if (line.match(/^##\s*テストケース[:：]/)) {
        console.log(`Found test case header at line ${i}: ${line}`);
        
        // 前のテストケースを保存
        if (currentTestCase && currentSteps.length > 0) {
          currentTestCase.steps = currentSteps;
          tests.push(this.completeTestCase(currentTestCase));
          console.log(`Saved test case: ${currentTestCase.name} with ${currentSteps.length} steps`);
        }
        
        // 新しいテストケースを開始
        const testName = line.replace(/^##\s*テストケース[:：]\s*/, '');
        currentTestCase = {
          name: testName || '無題のテストケース',
          description: '',
          priority: 'medium' as const,
          tags: ['imported'],
        };
        currentSteps = [];
        inTestCase = true;
        inTestSteps = false;
      }
      
      // ### テスト概要セクションの検出
      else if (inTestCase && line.match(/^###\s*テスト概要/)) {
        console.log(`Found test overview section at line ${i}`);
        // このセクション内でテスト名、説明、優先度を探す
      }
      
      // テスト名を検出 (- **テスト名**: の形式)
      else if (inTestCase && line.match(/^[-*]\s*\*\*テスト名\*\*[:：]/)) {
        const testName = line.replace(/^[-*]\s*\*\*テスト名\*\*[:：]\s*/, '');
        if (currentTestCase) {
          currentTestCase.name = testName;
          console.log(`Set test name: ${testName}`);
        }
      }
      
      // 説明を検出
      else if (inTestCase && line.match(/^[-*]\s*\*\*説明\*\*[:：]/)) {
        const description = line.replace(/^[-*]\s*\*\*説明\*\*[:：]\s*/, '');
        if (currentTestCase) {
          currentTestCase.description = description;
          console.log(`Set description: ${description}`);
        }
      }
      
      // 優先度を検出
      else if (inTestCase && line.match(/^[-*]\s*\*\*優先度\*\*[:：]/)) {
        const priority = line.replace(/^[-*]\s*\*\*優先度\*\*[:：]\s*/, '').toLowerCase();
        if (currentTestCase) {
          if (priority.includes('高') || priority.includes('high')) {
            currentTestCase.priority = 'high';
          } else if (priority.includes('低') || priority.includes('low')) {
            currentTestCase.priority = 'low';
          } else {
            currentTestCase.priority = 'medium';
          }
          console.log(`Set priority: ${currentTestCase.priority}`);
        }
      }
      
      // テストステップセクションの開始
      else if (line.match(/^###\s*テストステップ/)) {
        inTestSteps = true;
        console.log(`Entering test steps section at line ${i}`);
      }
      
      // 各ステップの開始を検出 (#### ステップN: の形式)
      else if (inTestSteps && line.match(/^####\s*ステップ\d+[:：]/)) {
        // ステップ名を取得
        const stepName = line.replace(/^####\s*ステップ\d+[:：]\s*/, '');
        console.log(`Found step at line ${i}: ${stepName}`);
        
        // 次の数行でステップの詳細を収集
        const step: TestStep = {
          action: 'navigate' as any,
          expectedResult: stepName,
        };
        
        // 次の行からステップの詳細を解析
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const detailLine = lines[j].trim();
          
          if (detailLine.match(/^[-*]\s*\*\*アクション\*\*[:：]/)) {
            const action = detailLine.replace(/^[-*]\s*\*\*アクション\*\*[:：]\s*/, '');
            step.action = this.mapActionType(action.toLowerCase());
            console.log(`  - Action: ${action} -> ${step.action}`);
          }
          else if (detailLine.match(/^[-*]\s*\*\*URL\*\*[:：]/)) {
            const url = detailLine.replace(/^[-*]\s*\*\*URL\*\*[:：]\s*/, '');
            step.value = url.startsWith('/') ? `${context.baseUrl}${url}` : url;
            console.log(`  - URL: ${step.value}`);
          }
          else if (detailLine.match(/^[-*]\s*\*\*セレクタ\*\*[:：]/)) {
            step.selector = detailLine.replace(/^[-*]\s*\*\*セレクタ\*\*[:：]\s*/, '');
            console.log(`  - Selector: ${step.selector}`);
          }
          else if (detailLine.match(/^[-*]\s*\*\*値\*\*[:：]/)) {
            const value = detailLine.replace(/^[-*]\s*\*\*値\*\*[:：]\s*/, '');
            // navigateアクション以外の場合のみ値を設定
            if (step.action !== 'navigate') {
              step.value = value;
            }
            console.log(`  - Value: ${value}`);
          }
          else if (detailLine.match(/^[-*]\s*\*\*期待結果\*\*[:：]/)) {
            step.expectedResult = detailLine.replace(/^[-*]\s*\*\*期待結果\*\*[:：]\s*/, '');
            console.log(`  - Expected: ${step.expectedResult}`);
          }
          else if (detailLine.match(/^####\s*ステップ\d+[:：]/) || detailLine.match(/^##/) || detailLine.match(/^---/)) {
            // 次のステップまたはセクションに到達
            break;
          }
        }
        
        currentSteps.push(step);
        console.log(`Added step: ${JSON.stringify(step)}`);
      }
    }
    
    // 最後のテストケースを保存
    if (currentTestCase && currentSteps.length > 0) {
      currentTestCase.steps = currentSteps;
      tests.push(this.completeTestCase(currentTestCase));
      console.log(`Saved final test case: ${currentTestCase.name} with ${currentSteps.length} steps`);
    }
    
    console.log(`Total parsed test cases: ${tests.length}`);
    return tests;
  }

  /**
   * アクションタイプをマッピング
   */
  private mapActionType(action: string): TestStep['action'] {
    const actionMap: Record<string, TestStep['action']> = {
      'navigate': 'navigate',
      'ページ遷移': 'navigate',
      'ページ移動': 'navigate',
      'click': 'click',
      'クリック': 'click',
      'type': 'type',
      '入力': 'type',
      'テキスト入力': 'type',
      'wait': 'wait',
      '待機': 'wait',
      '待つ': 'wait',
      'assert': 'assert',
      '検証': 'assert',
      '確認': 'assert',
      '要素の存在確認': 'assert',
      'scroll': 'scroll',
      'スクロール': 'scroll',
      'select': 'select',
      '選択': 'select',
      'ドロップダウン選択': 'select',
      'hover': 'hover',
      'ホバー': 'hover',
      'マウスオーバー': 'hover',
    };
    
    // 部分一致も許可
    for (const [key, value] of Object.entries(actionMap)) {
      if (action.includes(key)) {
        return value;
      }
    }
    
    // デフォルトはnavigateではなく、元のアクションをログに出力
    console.warn(`Unknown action type: ${action}, defaulting to 'navigate'`);
    return 'navigate';
  }

  /**
   * セクションを抽出
   */
  private extractSections(content: string, keywords: string[]): string[] {
    const sections: string[] = [];
    const lines = content.split("\n");
    let currentSection = "";
    let inSection = false;

    for (const line of lines) {
      const isHeader = keywords.some((keyword) =>
        line.toLowerCase().includes(keyword.toLowerCase()),
      );

      if (isHeader) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = line + "\n";
        inSection = true;
      } else if (inSection) {
        if (line.match(/^#{1,3}\s/) || line.match(/^\d+\.\s/)) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = line + "\n";
        } else {
          currentSection += line + "\n";
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * 機能要件からテストケースを生成
   */
  private generateTestFromRequirement(
    requirement: string,
    context: AnalysisContext,
  ): GeneratedTestCase | null {
    const lines = requirement.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return null;

    const title = lines[0].replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "");
    const steps: TestStep[] = [];

    // ナビゲーションステップ
    steps.push({
      action: "navigate",
      value: context.baseUrl,
      expectedResult: "ページが表示される",
    });

    // 内容から操作を推測
    const content = lines.slice(1).join(" ");

    if (content.includes("ボタン") || content.includes("クリック")) {
      steps.push({
        action: "click",
        selector: "button",
        expectedResult: "ボタンがクリックされる",
      });
    }

    if (content.includes("入力") || content.includes("フォーム")) {
      steps.push({
        action: "type",
        selector: "input",
        value: "テストデータ",
        expectedResult: "データが入力される",
      });
    }

    if (content.includes("表示") || content.includes("確認")) {
      steps.push({
        action: "assert",
        selector: "body",
        expectedResult: "期待される内容が表示される",
      });
    }

    return {
      name: `機能テスト: ${title}`,
      description: `${title}の機能が正しく動作することを確認`,
      priority: "medium",
      tags: ["functional"],
      steps,
    };
  }

  /**
   * ユースケースからテストケースを生成
   */
  private generateTestFromUseCase(
    useCase: string,
    context: AnalysisContext,
  ): GeneratedTestCase | null {
    const lines = useCase.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return null;

    const title = lines[0].replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "");
    const steps: TestStep[] = [];

    // ユースケースのステップを解析
    const stepPatterns = [
      /(?:前提|事前条件|Precondition)[:：](.*)/i,
      /(?:ステップ|Step)\s*\d+[:：](.*)/i,
      /(?:期待結果|Expected)[:：](.*)/i,
    ];

    for (const line of lines) {
      for (const pattern of stepPatterns) {
        const match = line.match(pattern);
        if (match) {
          // ステップの内容からアクションを推測
          const stepContent = match[1].trim();
          if (stepContent.includes("ページ") || stepContent.includes("画面")) {
            steps.push({
              action: "navigate",
              value: context.baseUrl,
              expectedResult: stepContent,
            });
          } else if (stepContent.includes("クリック") || stepContent.includes("押")) {
            steps.push({
              action: "click",
              selector: "button",
              expectedResult: stepContent,
            });
          } else if (stepContent.includes("入力")) {
            steps.push({
              action: "type",
              selector: "input",
              value: "テストデータ",
              expectedResult: stepContent,
            });
          } else if (stepContent.includes("表示") || stepContent.includes("確認")) {
            steps.push({
              action: "assert",
              selector: "body",
              expectedResult: stepContent,
            });
          }
        }
      }
    }

    if (steps.length === 0) {
      // デフォルトのステップ
      steps.push({
        action: "navigate",
        value: context.baseUrl,
        expectedResult: "ページが表示される",
      });
      steps.push({
        action: "assert",
        selector: "body",
        expectedResult: "ユースケースが実行される",
      });
    }

    return {
      name: `ユースケース: ${title}`,
      description: `${title}のシナリオを実行`,
      priority: "high",
      tags: ["usecase", "scenario"],
      steps,
    };
  }

  /**
   * テストケースを完成させる
   */
  private completeTestCase(partial: Partial<GeneratedTestCase>): GeneratedTestCase {
    return {
      name: partial.name || "無題のテスト",
      description: partial.description || "テストケースの説明",
      priority: partial.priority || "medium",
      steps: partial.steps || [],
      tags: partial.tags || [],
    };
  }

  /**
   * 重複を除去して優先順位でソート
   */
  private deduplicateAndPrioritize(testCases: GeneratedTestCase[]): GeneratedTestCase[] {
    const uniqueTests = new Map<string, GeneratedTestCase>();

    for (const testCase of testCases) {
      const key = `${testCase.name}_${testCase.steps.length}`;
      if (!uniqueTests.has(key) || testCase.priority === "high") {
        uniqueTests.set(key, testCase);
      }
    }

    return Array.from(uniqueTests.values()).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 複数の仕様書から生成
   */
  async generateFromMultipleSpecs(
    specs: SpecDocument[],
    context: AnalysisContext,
  ): Promise<GeneratedTestCase[]> {
    const allTests: GeneratedTestCase[] = [];

    for (const spec of specs) {
      const tests = await this.generateFromSpec(spec, context);
      allTests.push(...tests);
    }

    return this.deduplicateAndPrioritize(allTests);
  }
}
