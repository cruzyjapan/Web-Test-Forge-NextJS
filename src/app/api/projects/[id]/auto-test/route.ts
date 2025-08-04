import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/db/prisma";

// 動的インポートでanalyzerとexecutorモジュールを読み込む
const loadModules = async () => {
  const { SourceCodeAnalyzer } = await import("@/lib/analyzer/source-code-analyzer");
  const { AutoTestExecutor } = await import("@/lib/analyzer/auto-test-executor");
  return { SourceCodeAnalyzer, AutoTestExecutor };
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
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

    console.log(`Starting auto test execution for project: ${project.name}`);

    // 解析結果がない場合は新たに解析を実行
    let analysis = analysisResult;
    if (!analysis) {
      const { SourceCodeAnalyzer } = await loadModules();
      const projectPath = process.cwd();
      const baseUrl = project.baseUrl || "http://localhost:3000";
      
      const analyzer = new SourceCodeAnalyzer(projectPath, baseUrl);
      analysis = await analyzer.analyze();
    }

    // テストランを作成
    const testRun = await prisma.testRun.create({
      data: {
        projectId,
        status: "running",
        config: {
          browsers: ["chromium"],
          screenshot: "always",
          timeout: 30000,
        },
      },
    });

    // スクリーンショットディレクトリ
    const screenshotDir = path.join(process.cwd(), "public", "screenshots");

    // バックグラウンドでテストを実行
    // Note: Next.js App Routerではバックグラウンドタスクを直接実行できないため、
    // プロミスを使用して非同期実行をシミュレート
    executeTestsInBackground(testRun.id, analysis, screenshotDir, project.baseUrl, project.screenshotSize || "desktop-1920")
      .then(() => console.log(`Test execution completed for run: ${testRun.id}`))
      .catch((error) => console.error(`Test execution failed for run ${testRun.id}:`, error));

    return NextResponse.json({
      testRunId: testRun.id,
      message: "テストの実行を開始しました",
      summary: {
        routes: analysis.routes.length,
        pages: analysis.pages.length,
        forms: analysis.forms.length,
        navigation: analysis.navigation.length,
      },
    });
  } catch (error) {
    console.error("Auto test error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    const errorMessage = error instanceof Error ? error.message : "自動テストの実行に失敗しました";
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// バックグラウンドでテストを実行
async function executeTestsInBackground(
  testRunId: string,
  analysisResult: any,
  screenshotDir: string,
  baseUrl: string,
  screenshotSize: string
) {
  console.log("Starting background test execution for run:", testRunId);
  
  try {
    const { AutoTestExecutor } = await loadModules();
    
    // baseUrlが解析結果に含まれていることを確認
    if (!analysisResult.baseUrl) {
      analysisResult.baseUrl = baseUrl;
    }

    // テストを実行（スクリーンショットサイズを追加）
    const executor = new AutoTestExecutor(analysisResult, screenshotDir, screenshotSize);
    const results = await executor.executeAll();

    console.log(`Test execution completed: ${results.passed} passed, ${results.failed} failed`);

    // 結果を保存
    await prisma.testRun.update({
      where: { id: testRunId },
      data: {
        status: results.failed > 0 ? "failed" : "completed",
        results: {
          totalTests: results.totalTests,
          passed: results.passed,
          failed: results.failed,
          skipped: results.skipped,
          duration: results.duration,
          tests: results.tests,
          screenshots: results.screenshots,
        },
        completedAt: new Date(),
      },
    });

    // スクリーンショットを保存
    for (const screenshot of results.screenshots) {
      if (screenshot) {
        await prisma.screenshot.create({
          data: {
            testRunId,
            browser: "chromium",
            pageName: screenshot.split("/").pop()?.split("_")[0] || "unknown",
            url: analysisResult.baseUrl,
            filePath: screenshot,
          },
        });
      }
    }

    console.log(`Test results saved for run: ${testRunId}`);
  } catch (error) {
    console.error("Background test execution error:", error);
    console.error("Error details:", error instanceof Error ? error.stack : String(error));
    
    // エラー時はテストランを失敗状態に更新
    await prisma.testRun.update({
      where: { id: testRunId },
      data: {
        status: "failed",
        results: {
          error: error instanceof Error ? error.message : String(error),
        },
        completedAt: new Date(),
      },
    });
  }
}