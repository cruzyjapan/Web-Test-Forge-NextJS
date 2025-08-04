import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

interface TestStep {
  action: string;
  selector?: string;
  value?: string;
  expectedResult: string;
  url?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    console.log("Complete test registration for project:", projectId);
    
    const body = await request.json();
    const { analysisResult, selectedTabs, language = 'ja', screenshotSize = 'desktop-1920' } = body;
    
    // プロジェクトを取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "プロジェクトが見つかりません" },
        { status: 404 }
      );
    }

    // テストスイートを作成
    const suite = await prisma.testSuite.create({
      data: {
        name: language === 'ja'
          ? `[${project.name}] 完全自動生成 (${new Date().toLocaleString("ja-JP", { 
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })})`
          : `[${project.name}] Fully Automated (${new Date().toLocaleString("en-US", { 
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })})`,
        description: language === 'ja'
          ? `${project.name}のソースコード解析から完全自動生成`
          : `Fully auto-generated from ${project.name} source code analysis`,
        projectId,
      },
    });

    console.log("Created suite:", suite.id);

    const baseUrl = project.baseUrl.endsWith('/') 
      ? project.baseUrl.slice(0, -1) 
      : project.baseUrl;
    
    console.log("Using base URL for test creation:", baseUrl);
    console.log("Project requires auth:", project.requiresAuth);
    console.log("Screenshot size:", screenshotSize);
    
    // Parse screenshot size to get viewport dimensions
    const getViewportFromSize = (size: string) => {
      const sizeMap: Record<string, { width: number; height: number; name: string }> = {
        // Mobile devices
        'mobile-iphone12': { width: 390, height: 844, name: 'iPhone 12' },
        'mobile-iphone13': { width: 390, height: 844, name: 'iPhone 13' },
        'mobile-iphone14': { width: 393, height: 852, name: 'iPhone 14' },
        'mobile-iphone15': { width: 393, height: 852, name: 'iPhone 15' },
        'mobile-iphonese': { width: 375, height: 667, name: 'iPhone SE' },
        'mobile-galaxys21': { width: 384, height: 854, name: 'Galaxy S21' },
        'mobile-galaxys22': { width: 360, height: 780, name: 'Galaxy S22' },
        'mobile-galaxys23': { width: 360, height: 780, name: 'Galaxy S23' },
        'mobile-galaxys24': { width: 384, height: 832, name: 'Galaxy S24' },
        'mobile-pixel6': { width: 412, height: 915, name: 'Pixel 6' },
        'mobile-pixel7': { width: 412, height: 915, name: 'Pixel 7' },
        'mobile-pixel8': { width: 412, height: 915, name: 'Pixel 8' },
        'mobile-pixel8pro': { width: 448, height: 992, name: 'Pixel 8 Pro' },
        // Tablets
        'tablet-ipad-mini': { width: 744, height: 1133, name: 'iPad mini 6' },
        'tablet-ipad': { width: 820, height: 1180, name: 'iPad 10th' },
        'tablet-ipad-air': { width: 820, height: 1180, name: 'iPad Air 5' },
        'tablet-ipadpro11': { width: 834, height: 1194, name: 'iPad Pro 11"' },
        'tablet-ipadpro12': { width: 1024, height: 1366, name: 'iPad Pro 12.9"' },
        'tablet-galaxy-tab-s8': { width: 753, height: 1205, name: 'Galaxy Tab S8' },
        'tablet-galaxy-tab-s9': { width: 753, height: 1205, name: 'Galaxy Tab S9' },
        // Desktop sizes
        'desktop-1280': { width: 1280, height: 720, name: 'Desktop HD Ready' },
        'desktop-1366': { width: 1366, height: 768, name: 'Desktop HD' },
        'desktop-1440': { width: 1440, height: 900, name: 'Desktop HD+' },
        'desktop-1920': { width: 1920, height: 1080, name: 'Desktop Full HD' },
        'desktop-2560': { width: 2560, height: 1440, name: 'Desktop 2K' },
        'desktop-3840': { width: 3840, height: 2160, name: 'Desktop 4K' },
      };
      
      return sizeMap[size] || sizeMap['desktop-1920']; // Default to Full HD
    };
    
    const viewport = getViewportFromSize(screenshotSize);
    
    let createdCount = 0;
    const createdTests: any[] = [];

    // ログインステップを作成する関数
    const createLoginSteps = () => {
      if (!project.requiresAuth) return [];
      
      return [
        {
          action: "navigate",
          value: project.loginUrl || `${baseUrl}/login`,
          expectedResult: language === 'ja' ? "ログインページが表示される" : "Login page is displayed",
        },
        {
          action: "wait",
          value: "2000",
          expectedResult: language === 'ja' ? "ログインフォームが読み込まれる" : "Login form is loaded",
        },
        {
          action: "type",
          selector: 'input[type="email"], input[type="text"], input[name*="email"], input[name*="username"], #email, #username',
          value: project.authEmail || "",
          expectedResult: language === 'ja' ? "メールアドレス/ユーザー名が入力される" : "Email/Username is entered",
        },
        {
          action: "type",
          selector: 'input[type="password"], input[name*="password"], #password',
          value: project.authPassword || "",
          expectedResult: language === 'ja' ? "パスワードが入力される" : "Password is entered",
        },
        {
          action: "click",
          selector: 'button[type="submit"], input[type="submit"], button:contains("ログイン"), button:contains("Login")',
          expectedResult: language === 'ja' ? "ログインボタンをクリック" : "Click login button",
        },
        {
          action: "wait",
          value: "3000",
          expectedResult: language === 'ja' ? "ログイン処理が完了する" : "Login process completes",
        },
      ];
    };

    // 1. ホームページテスト（ページテストが選択されている場合のみ）
    if (selectedTabs?.['page-tests'] !== false) {
      const homeTestSteps = [
        {
          action: "viewport",
          value: `${viewport.width}x${viewport.height}`,
          expectedResult: language === 'ja' ? `${viewport.name}サイズに設定` : `Set to ${viewport.name} size`,
        },
        ...createLoginSteps(),
        {
          action: "navigate",
          value: baseUrl,
          expectedResult: language === 'ja' ? "ページが表示される" : "Page is displayed",
        },
        {
          action: "wait",
          value: "2000",
          expectedResult: language === 'ja' ? "ページが完全に読み込まれる" : "Page is fully loaded",
        },
        {
          action: "assert",
          selector: "body",
          expectedResult: language === 'ja' ? "ページコンテンツが存在する" : "Page content exists",
        },
      ];

      const homeTest = await prisma.testCase.create({
        data: {
          name: language === 'ja' 
            ? (project.requiresAuth ? "ログイン後のホームページ表示テスト" : "ホームページ表示テスト")
            : (project.requiresAuth ? "Homepage Display Test After Login" : "Homepage Display Test"),
          description: language === 'ja'
            ? (project.requiresAuth 
                ? "ログイン認証後にトップページが正しく表示されることを確認"
                : "トップページが正しく表示されることを確認")
            : (project.requiresAuth 
                ? "Verify that the homepage displays correctly after login authentication"
                : "Verify that the homepage displays correctly"),
          suiteId: suite.id,
          steps: JSON.stringify(homeTestSteps),
          config: JSON.stringify({
            autoGenerated: true,
            timestamp: new Date().toISOString(),
            baseUrl: baseUrl,
            requiresAuth: project.requiresAuth,
            viewport: viewport,
            screenshotSize: screenshotSize,
          }),
        },
      });
      createdTests.push(homeTest);
      createdCount++;
    }

    // 2. 全ページのテストケースを作成（ページテストが選択されている場合のみ）
    if (selectedTabs?.['page-tests'] !== false && analysisResult?.pages && Array.isArray(analysisResult.pages)) {
      // Filter out API routes
      const nonApiPages = analysisResult.pages.filter(page => {
        const route = page.route || "/";
        return !route.startsWith('/api/') && !route.includes('/api/');
      });
      
      console.log(`Creating test cases for ${nonApiPages.length} pages (excluding API routes)`);
      
      for (let i = 0; i < nonApiPages.length; i++) {
        const page = nonApiPages[i];
        try {
          const route = page.route || "/";
          const fullUrl = route.startsWith('http') 
            ? route 
            : `${baseUrl}${route.startsWith('/') ? route : '/' + route}`;
          
          console.log(`Creating test for page ${i + 1}/${nonApiPages.length}: ${route} -> ${fullUrl}`);
          
          const steps: TestStep[] = [
            ...createLoginSteps(),
            {
              action: "navigate",
              value: fullUrl,
              expectedResult: language === 'ja' 
                ? `${page.title || route}ページが表示される`
                : `${page.title || route} page is displayed`,
            },
            {
              action: "wait",
              value: "2000",
              expectedResult: language === 'ja' ? "ページが完全に読み込まれる" : "Page is fully loaded",
            },
            {
              action: "assert",
              selector: "body",
              expectedResult: language === 'ja' ? "ページ本体が表示される" : "Page body is displayed",
            },
          ];

          // ページ内のフォームをテスト
          if (page.forms && page.forms.length > 0) {
            for (const form of page.forms) {
              steps.push({
                action: "assert",
                selector: "form",
                expectedResult: language === 'ja' 
                  ? `フォーム「${form.name || 'フォーム'}」が表示される`
                  : `Form "${form.name || 'Form'}" is displayed`,
              });
              
              // フォーム内の各要素の存在確認
              if (form.elements) {
                for (const element of form.elements.slice(0, 3)) {
                  if (element.selector) {
                    steps.push({
                      action: "assert",
                      selector: element.selector,
                      expectedResult: language === 'ja' 
                        ? `${element.name || element.type}要素が存在する`
                        : `${element.name || element.type} element exists`,
                    });
                  }
                }
              }
            }
          }

          // ページ内のすべてのリンクをテスト
          if (page.links && page.links.length > 0) {
            // 重複を除去
            const uniqueLinks = [...new Set(page.links)];
            for (const link of uniqueLinks) {
              // 外部リンクやメールリンクを除外
              if (!link.startsWith('mailto:') && !link.startsWith('tel:') && !link.startsWith('#')) {
                steps.push({
                  action: "assert",
                  selector: `a[href="${link}"], a[href*="${link}"]`,
                  expectedResult: language === 'ja' 
                    ? `${link}へのリンクが存在する`
                    : `Link to ${link} exists`,
                });
              }
            }
          }

          const testCase = await prisma.testCase.create({
            data: {
              name: language === 'ja' 
                ? `ページテスト: ${page.title || page.route}`
                : `Page Test: ${page.title || page.route}`,
              description: language === 'ja'
                ? `${page.route}ページの完全な表示と要素確認`
                : `Complete display and element verification for ${page.route} page`,
              suiteId: suite.id,
              steps: JSON.stringify(steps),
              config: JSON.stringify({
                autoGenerated: true,
                route: page.route,
                baseUrl: baseUrl,
                fullUrl: fullUrl,
                formCount: page.forms?.length || 0,
                linkCount: page.links?.length || 0,
                pageIndex: i + 1,
                totalPages: nonApiPages.length,
              }),
            },
          });
          createdTests.push(testCase);
          createdCount++;
          console.log(`Created test case ${testCase.id} for page ${route}`);
        } catch (err) {
          console.error(`Failed to create test case for page ${page.route}:`, err);
        }
      }
      
      console.log(`Completed creating ${createdCount - 1} page test cases`);
    }

    // 3. フォームテストケースを作成（フォームテストが選択されている場合のみ）
    if (selectedTabs?.['form-tests'] !== false && analysisResult?.forms && Array.isArray(analysisResult.forms)) {
      console.log(`Creating test cases for ${analysisResult.forms.length} forms`);
      
      for (let formIndex = 0; formIndex < analysisResult.forms.length; formIndex++) {
        const form = analysisResult.forms[formIndex];
        try {
          // フォームのURLを決定
          let formUrl = baseUrl;
          if (form.action) {
            formUrl = form.action.startsWith('http') 
              ? form.action 
              : `${baseUrl}${form.action.startsWith('/') ? form.action : '/' + form.action}`;
          }
          
          console.log(`Creating tests for form ${formIndex + 1}/${analysisResult.forms.length}: ${form.name}`);
          
          // 正常系テスト
          const normalSteps: TestStep[] = [
            ...createLoginSteps(),
            {
              action: "navigate",
              value: formUrl,
              expectedResult: language === 'ja' ? "フォームページが表示される" : "Form page is displayed",
            },
            {
              action: "wait",
              value: "2000",
              expectedResult: language === 'ja' ? "フォームが完全に読み込まれる" : "Form is fully loaded",
            },
          ];

          // フォーム要素への入力（すべての要素を網羅）
          if (form.elements && form.elements.length > 0) {
            for (const element of form.elements) {
              if (element.type === 'text' || element.type === 'input') {
                normalSteps.push({
                  action: "type",
                  selector: element.selector || `input[name="${element.name}"]`,
                  value: language === 'ja' ? 'テストデータ123' : 'TestData123',
                  expectedResult: language === 'ja' ? `${element.name || 'テキスト'}が入力される` : `${element.name || 'Text'} is entered`,
                });
              } else if (element.type === 'email') {
                normalSteps.push({
                  action: "type",
                  selector: element.selector || `input[type="email"][name="${element.name}"]`,
                  value: 'test@example.com',
                  expectedResult: language === 'ja' ? `${element.name || 'メールアドレス'}が入力される` : `${element.name || 'Email'} is entered`,
                });
              } else if (element.type === 'password') {
                normalSteps.push({
                  action: "type",
                  selector: element.selector || `input[type="password"][name="${element.name}"]`,
                  value: 'TestPassword123!',
                  expectedResult: language === 'ja' ? `${element.name || 'パスワード'}が入力される` : `${element.name || 'Password'} is entered`,
                });
              } else if (element.type === 'tel') {
                normalSteps.push({
                  action: "type",
                  selector: element.selector || `input[type="tel"][name="${element.name}"]`,
                  value: '090-1234-5678',
                  expectedResult: language === 'ja' ? `${element.name || '電話番号'}が入力される` : `${element.name || 'Phone number'} is entered`,
                });
              } else if (element.type === 'number') {
                normalSteps.push({
                  action: "type",
                  selector: element.selector || `input[type="number"][name="${element.name}"]`,
                  value: '100',
                  expectedResult: language === 'ja' ? `${element.name || '数値'}が入力される` : `${element.name || 'Number'} is entered`,
                });
              } else if (element.type === 'date') {
                normalSteps.push({
                  action: "type",
                  selector: element.selector || `input[type="date"][name="${element.name}"]`,
                  value: '2024-12-01',
                  expectedResult: language === 'ja' ? `${element.name || '日付'}が入力される` : `${element.name || 'Date'} is entered`,
                });
              } else if (element.type === 'textarea') {
                normalSteps.push({
                  action: "type",
                  selector: element.selector || `textarea[name="${element.name}"]`,
                  value: language === 'ja' ? 'これはテストメッセージです。\n複数行の\nテキストです。' : 'This is a test message.\nMultiple lines\nof text.',
                  expectedResult: language === 'ja' ? `${element.name || 'テキストエリア'}が入力される` : `${element.name || 'Text area'} is entered`,
                });
              } else if (element.type === 'select') {
                normalSteps.push({
                  action: "select",
                  selector: element.selector || `select[name="${element.name}"]`,
                  value: "1",
                  expectedResult: language === 'ja' ? `${element.name || 'セレクト'}が選択される` : `${element.name || 'Select'} is selected`,
                });
              } else if (element.type === 'checkbox') {
                normalSteps.push({
                  action: "click",
                  selector: element.selector || `input[type="checkbox"][name="${element.name}"]`,
                  expectedResult: language === 'ja' ? `${element.name || 'チェックボックス'}がチェックされる` : `${element.name || 'Checkbox'} is checked`,
                });
              } else if (element.type === 'radio') {
                normalSteps.push({
                  action: "click",
                  selector: element.selector || `input[type="radio"][name="${element.name}"]`,
                  expectedResult: language === 'ja' ? `${element.name || 'ラジオボタン'}が選択される` : `${element.name || 'Radio button'} is selected`,
                });
              }
            }
          }

          // 送信ボタン
          normalSteps.push({
            action: "click",
            selector: 'button[type="submit"], input[type="submit"]',
            expectedResult: language === 'ja' ? "フォームが送信される" : "Form is submitted",
          });

          const normalTest = await prisma.testCase.create({
            data: {
              name: language === 'ja' ? `フォームテスト: ${form.name} (正常系)` : `Form Test: ${form.name} (Normal)`,
              description: language === 'ja' ? `${form.name}フォームの正常動作確認（全要素入力）` : `Normal operation check for ${form.name} form (all elements input)`,
              suiteId: suite.id,
              steps: JSON.stringify(normalSteps),
              config: JSON.stringify({
                autoGenerated: true,
                formName: form.name,
                formAction: form.action,
                formUrl: formUrl,
                baseUrl: baseUrl,
                testType: 'normal',
                elementCount: form.elements?.length || 0,
                formIndex: formIndex + 1,
                totalForms: analysisResult.forms.length,
              }),
            },
          });
          createdTests.push(normalTest);
          createdCount++;

          // バリデーションテスト（空入力）
          const validationSteps: TestStep[] = [
            {
              action: "navigate",
              value: formUrl,
              expectedResult: language === 'ja' ? "フォームページが表示される" : "Form page is displayed",
            },
            {
              action: "wait",
              value: "2000",
              expectedResult: language === 'ja' ? "フォームが完全に読み込まれる" : "Form is fully loaded",
            },
            {
              action: "click",
              selector: 'button[type="submit"], input[type="submit"], button:contains("送信"), button:contains("Submit")',
              expectedResult: language === 'ja' ? "空のフォームを送信" : "Submit empty form",
            },
            {
              action: "wait",
              value: "1000",
              expectedResult: language === 'ja' ? "バリデーション処理を待つ" : "Wait for validation process",
            },
            {
              action: "assert",
              selector: '.error, .error-message, .invalid-feedback, [role="alert"], .text-red-500, .text-danger',
              expectedResult: language === 'ja' ? "バリデーションエラーが表示される" : "Validation errors are displayed",
            },
          ];
          
          // 個別フィールドのバリデーションテスト
          if (form.elements && form.elements.length > 0) {
            for (const element of form.elements.filter(e => e.required)) {
              validationSteps.push({
                action: "assert",
                selector: `${element.selector} + .error, ${element.selector} ~ .error-message`,
                expectedResult: language === 'ja' ? `${element.name || element.type}の必須エラーが表示される` : `Required error for ${element.name || element.type} is displayed`,
              });
            }
          }

          const validationTest = await prisma.testCase.create({
            data: {
              name: language === 'ja' ? `フォームテスト: ${form.name} (バリデーション)` : `Form Test: ${form.name} (Validation)`,
              description: language === 'ja' ? `${form.name}フォームのバリデーション確認` : `Validation check for ${form.name} form`,
              suiteId: suite.id,
              steps: JSON.stringify(validationSteps),
              config: JSON.stringify({
                autoGenerated: true,
                formName: form.name,
                formAction: form.action,
                baseUrl: baseUrl,
                testType: 'validation',
              }),
            },
          });
          createdTests.push(validationTest);
          createdCount++;
        } catch (err) {
          console.error("Failed to create test case for form:", err);
        }
      }
    }

    // 4. ナビゲーションテスト（ナビゲーションテストが選択されている場合のみ）
    if (selectedTabs?.['navigation-tests'] !== false && analysisResult?.navigation && Array.isArray(analysisResult.navigation)) {
      console.log(`Creating navigation tests for ${analysisResult.navigation.length} links`);
      
      const navSteps: TestStep[] = [
        {
          action: "navigate",
          value: baseUrl,
          expectedResult: language === 'ja' ? "トップページが表示される" : "Homepage is displayed",
        },
        {
          action: "wait",
          value: "2000",
          expectedResult: language === 'ja' ? "ページが完全に読み込まれる" : "Page is fully loaded",
        },
      ];

      // 重複を除去してソート
      const uniqueLinks = [...new Set(analysisResult.navigation)].sort();
      
      for (const link of uniqueLinks) {
        // 外部リンクやアンカーリンクを除外
        if (link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:')) {
          continue;
        }
        
        const linkUrl = link.startsWith('http') 
          ? link 
          : `${baseUrl}${link.startsWith('/') ? link : '/' + link}`;
        
        navSteps.push({
          action: "assert",
          selector: `a[href="${link}"], a[href*="${link}"], Link[href="${link}"]`,
          expectedResult: language === 'ja' ? `リンク「${link}」が存在する` : `Link "${link}" exists`,
        });
        
        navSteps.push({
          action: "click",
          selector: `a[href="${link}"]:first, a[href*="${link}"]:first`,
          expectedResult: language === 'ja' ? `${link}へ遷移する` : `Navigate to ${link}`,
        });
        
        navSteps.push({
          action: "wait",
          value: "2000",
          expectedResult: language === 'ja' ? "遷移先ページが読み込まれる" : "Destination page is loaded",
        });
        
        navSteps.push({
          action: "assert",
          selector: "body",
          expectedResult: language === 'ja' ? `${link}ページが正常に表示される` : `${link} page displays correctly`,
        });
        
        navSteps.push({
          action: "navigate",
          value: baseUrl,
          expectedResult: language === 'ja' ? "トップページに戻る" : "Return to homepage",
        });
        
        navSteps.push({
          action: "wait",
          value: "1000",
          expectedResult: language === 'ja' ? "トップページが再読み込みされる" : "Homepage is reloaded",
        });
      }

      if (navSteps.length > 2) {
        const navTest = await prisma.testCase.create({
          data: {
            name: language === 'ja' ? "ナビゲーションテスト（全リンク網羅）" : "Navigation Test (All Links Coverage)",
            description: language === 'ja' ? `${uniqueLinks.length}個のナビゲーションリンクの完全な動作確認` : `Complete operation check for ${uniqueLinks.length} navigation links`,
            suiteId: suite.id,
            steps: JSON.stringify(navSteps),
            config: JSON.stringify({
              autoGenerated: true,
              baseUrl: baseUrl,
              linkCount: uniqueLinks.length,
              links: uniqueLinks,
            }),
          },
        });
        createdTests.push(navTest);
        createdCount++;
        console.log(`Created navigation test with ${uniqueLinks.length} links`);
      }
    }

    // 5. ボタンアクションテスト
    const buttonSelectors = [
      'button:not([type="submit"])',
      'a.btn',
      'a.button',
      '[role="button"]',
    ];

    const buttonSteps: TestStep[] = [
      {
        action: "navigate",
        value: baseUrl,
        expectedResult: language === 'ja' ? "ページが表示される" : "Page is displayed",
      },
    ];

    for (const selector of buttonSelectors) {
      buttonSteps.push({
        action: "assert",
        selector: selector,
        expectedResult: language === 'ja' ? `${selector}ボタンが存在する場合の確認` : `Check if ${selector} button exists`,
      });
    }

    const buttonTest = await prisma.testCase.create({
      data: {
        name: language === 'ja' ? "ボタン要素テスト" : "Button Element Test",
        description: language === 'ja' ? "ページ内のボタン要素の存在確認" : "Verification of button elements in the page",
        suiteId: suite.id,
        steps: JSON.stringify(buttonSteps),
        config: JSON.stringify({
          autoGenerated: true,
          baseUrl: baseUrl,
        }),
      },
    });
    createdTests.push(buttonTest);
    createdCount++;

    // 6. レスポンシブテスト
    const viewports = [
      { width: 375, height: 667, name: "Mobile" },
      { width: 768, height: 1024, name: "Tablet" },
      { width: 1920, height: 1080, name: "Desktop" },
    ];

    for (const viewport of viewports) {
      const responsiveSteps: TestStep[] = [
        {
          action: "viewport",
          value: `${viewport.width}x${viewport.height}`,
          expectedResult: language === 'ja' ? `${viewport.name}サイズに設定` : `Set to ${viewport.name} size`,
        },
        {
          action: "navigate",
          value: baseUrl,
          expectedResult: language === 'ja' ? "ページが表示される" : "Page is displayed",
        },
        {
          action: "assert",
          selector: "body",
          expectedResult: language === 'ja' ? `${viewport.name}表示で正常に表示される` : `Displays correctly in ${viewport.name} view`,
        },
      ];

      const responsiveTest = await prisma.testCase.create({
        data: {
          name: language === 'ja' ? `レスポンシブテスト: ${viewport.name}` : `Responsive Test: ${viewport.name}`,
          description: language === 'ja' ? `${viewport.name}サイズでの表示確認` : `Display verification at ${viewport.name} size`,
          suiteId: suite.id,
          steps: JSON.stringify(responsiveSteps),
          config: JSON.stringify({
            autoGenerated: true,
            baseUrl: baseUrl,
            viewport: viewport,
          }),
        },
      });
      createdTests.push(responsiveTest);
      createdCount++;
    }

    // 7. APIエンドポイントテスト（APIテストは常にスキップ - スナップショット非対応）
    if (false && analysisResult?.routes && Array.isArray(analysisResult.routes)) {
      const apiRoutes = analysisResult.routes.filter(r => r.path.startsWith('/api'));
      console.log(`Found ${apiRoutes.length} API endpoints - skipping (screenshots not supported)`);
      
      // APIテストは現バージョンではスキップ（スクリーンショット対応が必要なため）
      for (const route of apiRoutes) {
        try {
          const fullApiUrl = `${baseUrl}${route.path}`;
          
          // 各HTTPメソッドごとにスキップされたテストケースを作成
          for (const method of route.method || ['GET']) {
            const skippedApiSteps: TestStep[] = [
              {
                action: "skip",
                value: "APIテストはスクリーンショット撮影に対応していないため、現バージョンではスキップされます",
                expectedResult: "テストをスキップ",
              },
            ];
            
            const apiTest = await prisma.testCase.create({
              data: {
                name: `[SKIP] API: ${route.path} (${method})`,
                description: `${route.path}エンドポイントの${method}メソッドテスト (スクリーンショット非対応のためスキップ)`,
                suiteId: suite.id,
                steps: JSON.stringify(skippedApiSteps),
                config: JSON.stringify({
                  autoGenerated: true,
                  skipped: true,
                  skipReason: "APIテストはスクリーンショット撮影に対応していません",
                  baseUrl: baseUrl,
                  apiUrl: fullApiUrl,
                  method: method,
                  route: route.path,
                }),
              },
            });
            createdTests.push(apiTest);
            createdCount++;
          }
        } catch (err) {
          console.error(`Failed to create skipped API test for ${route.path}:`, err);
        }
      }
    }

    // 8. 動的ルートのテスト
    if (analysisResult?.routes && Array.isArray(analysisResult.routes)) {
      const dynamicRoutes = analysisResult.routes.filter(r => r.params && r.params.length > 0);
      console.log(`Found ${dynamicRoutes.length} dynamic routes`);
      
      for (const route of dynamicRoutes) {
        try {
          // パラメータ付きURLの例を生成
          let testUrl = route.path;
          for (const param of route.params || []) {
            testUrl = testUrl.replace(`:${param}`, 'test-id-123');
          }
          
          const fullTestUrl = `${baseUrl}${testUrl}`;
          
          const dynamicSteps: TestStep[] = [
            {
              action: "navigate",
              value: fullTestUrl,
              expectedResult: language === 'ja' ? `動的ルート ${route.path} のテスト` : `Test for dynamic route ${route.path}`,
            },
            {
              action: "wait",
              value: "2000",
              expectedResult: language === 'ja' ? "ページが読み込まれる" : "Page is loaded",
            },
            {
              action: "assert",
              selector: "body",
              expectedResult: language === 'ja' ? "動的ページが正常に表示される" : "Dynamic page displays correctly",
            },
          ];
          
          const dynamicTest = await prisma.testCase.create({
            data: {
              name: language === 'ja' ? `動的ルート: ${route.path}` : `Dynamic Route: ${route.path}`,
              description: language === 'ja' ? `パラメータ付きルート ${route.path} のテスト` : `Test for parameterized route ${route.path}`,
              suiteId: suite.id,
              steps: JSON.stringify(dynamicSteps),
              config: JSON.stringify({
                autoGenerated: true,
                baseUrl: baseUrl,
                route: route.path,
                testUrl: fullTestUrl,
                params: route.params,
              }),
            },
          });
          createdTests.push(dynamicTest);
          createdCount++;
        } catch (err) {
          console.error(`Failed to create dynamic route test for ${route.path}:`, err);
        }
      }
    }

    console.log(`Created ${createdCount} test cases total`);
    console.log(`Test breakdown (based on selected tabs):
      - Home page: ${selectedTabs?.['page-tests'] !== false ? 1 : 0}
      - Page tests: ${selectedTabs?.['page-tests'] !== false ? (analysisResult?.pages?.length || 0) : 0}
      - Form tests (normal): ${selectedTabs?.['form-tests'] !== false ? (analysisResult?.forms?.length || 0) : 0}
      - Form tests (validation): ${selectedTabs?.['form-tests'] !== false ? (analysisResult?.forms?.length || 0) : 0}
      - Navigation test: ${selectedTabs?.['navigation-tests'] !== false ? (analysisResult?.navigation?.length ? 1 : 0) : 0}
      - Button test: 1
      - Responsive tests: 3
      - API tests: 0 (disabled - no snapshots)
      - Dynamic route tests: ${analysisResult?.routes?.filter(r => r.params?.length > 0).length || 0}
    `);

    return NextResponse.json({
      success: true,
      suiteId: suite.id,
      suiteName: suite.name,
      totalTestCases: createdCount,
      message: language === 'ja'
        ? `${createdCount}個の詳細なテストケースを完全に登録しました`
        : `Successfully registered ${createdCount} detailed test cases`,
      testCases: createdTests.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
      })),
      summary: {
        pages: selectedTabs?.['page-tests'] !== false ? (analysisResult?.pages?.length || 0) : 0,
        forms: selectedTabs?.['form-tests'] !== false ? (analysisResult?.forms?.length || 0) : 0,
        navigation: selectedTabs?.['navigation-tests'] !== false ? (analysisResult?.navigation?.length || 0) : 0,
        apiRoutes: 0, // Always 0 - API tests disabled
        dynamicRoutes: analysisResult?.routes?.filter(r => r.params?.length > 0).length || 0,
        selectedTabs: selectedTabs || {},
      },
    });
    
  } catch (error) {
    console.error("Complete test registration error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "テストケースの登録に失敗しました",
          message: error.message,
          name: error.name,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "不明なエラーが発生しました" },
      { status: 500 }
    );
  }
}