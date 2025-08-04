import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chromium } from "playwright";
import path from "path";
import fs from "fs/promises";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  
  try {
    const body = await request.json();
    const { analysisResult } = body;

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

    // テストランを作成
    const testRun = await prisma.testRun.create({
      data: {
        projectId,
        status: "running",
        results: JSON.stringify({
          config: {
            browsers: ["chromium"],
            screenshot: "always",
            timeout: 30000,
          },
        }),
      },
    });

    // 簡易的なテスト実行
    const results = await executeSimpleTests(
      analysisResult,
      project.baseUrl,
      testRun.id
    );

    // テストランを更新
    await prisma.testRun.update({
      where: { id: testRun.id },
      data: {
        status: results.failed > 0 ? "failed" : "completed",
        results: JSON.stringify({
          totalTests: results.totalTests,
          passed: results.passed,
          failed: results.failed,
          duration: results.duration,
          tests: results.tests,
        }),
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      testRunId: testRun.id,
      message: "テストが完了しました",
      results: {
        totalTests: results.totalTests,
        passed: results.passed,
        failed: results.failed,
      },
    });
  } catch (error) {
    console.error("Simple test error:", error);
    return NextResponse.json(
      { 
        error: "テスト実行に失敗しました",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

async function executeSimpleTests(
  analysisResult: any,
  baseUrl: string,
  testRunId: string
) {
  const startTime = Date.now();
  const tests: any[] = [];
  let passed = 0;
  let failed = 0;

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (error) {
    console.error("Failed to launch browser:", error);
    // ブラウザが起動できない場合はHTTPテストのみ実行
    return await executeHttpTests(analysisResult, baseUrl);
  }

  try {
    const context = await browser.newContext({
      locale: 'ja-JP',
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    // 簡易的なページテスト（最初の3ページのみ）
    const pagesToTest = analysisResult.pages?.slice(0, 3) || [];
    
    for (const pageInfo of pagesToTest) {
      const testName = `ページ: ${pageInfo.route}`;
      const testStart = Date.now();
      
      try {
        const url = `${baseUrl}${pageInfo.route}`;
        console.log(`Testing: ${url}`);
        
        const response = await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        if (response && response.ok()) {
          // スクリーンショットを撮影
          const screenshotDir = path.join(process.cwd(), "public", "screenshots");
          await fs.mkdir(screenshotDir, { recursive: true });
          
          const screenshotPath = path.join(
            screenshotDir,
            `${testRunId}_${pageInfo.route.replace(/\//g, '-')}.png`
          );
          
          await page.screenshot({ 
            path: screenshotPath,
            fullPage: false  // フルページではなく表示部分のみ
          });
          
          tests.push({
            name: testName,
            status: 'passed',
            duration: Date.now() - testStart,
            screenshot: `/screenshots/${path.basename(screenshotPath)}`,
          });
          passed++;
        } else {
          tests.push({
            name: testName,
            status: 'failed',
            duration: Date.now() - testStart,
            error: `HTTP ${response?.status()}`,
          });
          failed++;
        }
      } catch (error) {
        tests.push({
          name: testName,
          status: 'failed',
          duration: Date.now() - testStart,
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  return {
    totalTests: tests.length,
    passed,
    failed,
    duration: Date.now() - startTime,
    tests,
  };
}

// HTTPリクエストのみでテストを実行（フォールバック）
async function executeHttpTests(
  analysisResult: any,
  baseUrl: string
) {
  const startTime = Date.now();
  const tests: any[] = [];
  let passed = 0;
  let failed = 0;

  // ページのHTTPテスト
  const pagesToTest = analysisResult.pages?.slice(0, 5) || [];
  
  for (const pageInfo of pagesToTest) {
    const testName = `HTTPテスト: ${pageInfo.route}`;
    const testStart = Date.now();
    
    try {
      const url = `${baseUrl}${pageInfo.route}`;
      console.log(`HTTP Testing: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
        },
      });
      
      if (response.ok) {
        tests.push({
          name: testName,
          status: 'passed',
          duration: Date.now() - testStart,
          details: {
            statusCode: response.status,
            url,
          },
        });
        passed++;
      } else {
        tests.push({
          name: testName,
          status: 'failed',
          duration: Date.now() - testStart,
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
        failed++;
      }
    } catch (error) {
      tests.push({
        name: testName,
        status: 'failed',
        duration: Date.now() - testStart,
        error: error instanceof Error ? error.message : String(error),
      });
      failed++;
    }
  }

  // APIエンドポイントのテスト
  const apiRoutes = analysisResult.routes?.filter((r: any) => 
    r.path.startsWith('/api') && r.method.includes('GET')
  ).slice(0, 3) || [];
  
  for (const route of apiRoutes) {
    const testName = `API: GET ${route.path}`;
    const testStart = Date.now();
    
    try {
      const url = `${baseUrl}${route.path}`;
      console.log(`API Testing: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      tests.push({
        name: testName,
        status: response.ok ? 'passed' : 'failed',
        duration: Date.now() - testStart,
        details: {
          statusCode: response.status,
          url,
        },
      });
      
      if (response.ok) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      tests.push({
        name: testName,
        status: 'failed',
        duration: Date.now() - testStart,
        error: error instanceof Error ? error.message : String(error),
      });
      failed++;
    }
  }

  return {
    totalTests: tests.length,
    passed,
    failed,
    duration: Date.now() - startTime,
    tests,
  };
}