import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { executeTest } from "@/lib/playwright/test-runner-v3";

const createTestRunSchema = z.object({
  testSuiteId: z.string().optional(),
  testCaseIds: z.array(z.string()).optional(),
  browsers: z.array(z.enum(["chromium", "firefox", "webkit"])).default(["chromium"]),
  config: z
    .object({
      baseUrl: z.string().url().optional(),
      timeout: z.number().default(30000),
      screenshot: z.enum(["always", "on-failure", "never"]).default("on-failure"),
      screenshotSize: z.string().optional(),
    })
    .optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "プロジェクトIDが必要です" }, { status: 400 });
    }
    
    const testRuns = await prisma.testRun.findMany({
      where: { projectId: id },
      include: {
        screenshots: true,
        suite: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Parse results to include test case information
    const testRunsWithDetails = await Promise.all(testRuns.map(async (run) => {
      let testCaseInfo = null;
      
      try {
        const results = typeof run.results === 'string' ? JSON.parse(run.results) : run.results;
        
        // Extract test case names from results if available
        if (Array.isArray(results)) {
          const testCaseNames = results
            .filter((r: any) => r.testCaseName)
            .map((r: any) => r.testCaseName);
          
          if (testCaseNames.length > 0) {
            testCaseInfo = {
              testCases: testCaseNames,
              count: testCaseNames.length
            };
          }
        } else if (results && results.testCases) {
          testCaseInfo = {
            testCases: results.testCases,
            count: results.testCases.length
          };
        }
      } catch (e) {
        // If parsing fails, continue without test case info
      }

      return {
        ...run,
        testCaseInfo
      };
    }));

    return NextResponse.json(testRunsWithDetails);
  } catch (error) {
    console.error("Error fetching test runs:", error);
    return NextResponse.json({ 
      error: "テスト実行履歴の取得に失敗しました",
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "プロジェクトIDが必要です" }, { status: 400 });
    }
    
    const body = await req.json();
    const data = createTestRunSchema.parse(body);

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "プロジェクトが見つかりません" }, { status: 404 });
    }

    const testRun = await prisma.testRun.create({
      data: {
        projectId: id,
        suiteId: data.testSuiteId,
        status: "pending",
        results: JSON.stringify({}),
      },
    });

    await prisma.testRun.update({
      where: { id: testRun.id },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    const testConfig = {
      baseUrl: data.config?.baseUrl || project.baseUrl,
      timeout: data.config?.timeout || 30000,
      screenshot: data.config?.screenshot || "on-failure",
      screenshotSize: data.config?.screenshotSize || project.screenshotSize || "desktop-1920",
      browsers: data.browsers,
      testSuiteId: data.testSuiteId,
      testCaseIds: data.testCaseIds,
      projectId: id,
    };

    try {
      const results = await executeTest(testRun.id, testConfig);

      await prisma.testRun.update({
        where: { id: testRun.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          results: JSON.stringify(results),
        },
      });

      return NextResponse.json({
        id: testRun.id,
        status: "completed",
        results,
      });
    } catch (testError) {
      await prisma.testRun.update({
        where: { id: testRun.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          results: JSON.stringify({
            error: testError instanceof Error ? testError.message : String(testError),
          }),
        },
      });

      throw testError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力データが無効です", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "テスト実行の開始に失敗しました" }, { status: 500 });
  }
}
