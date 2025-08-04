import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const testRun = await prisma.testRun.findUnique({
      where: { id },
      include: {
        project: true,
        screenshots: true,
        suite: {
          include: {
            testCases: true,
          },
        },
      },
    });

    if (!testRun) {
      return NextResponse.json({ error: "テスト実行結果が見つかりません" }, { status: 404 });
    }

    // resultsがJSONの場合、パースして各テストケースの詳細を追加
    let enrichedResults: any = testRun.results;
    if (typeof testRun.results === 'string') {
      try {
        const parsedResults = JSON.parse(testRun.results);
        if (Array.isArray(parsedResults) && testRun.suite?.testCases) {
          enrichedResults = parsedResults.map((result: any, index: number) => {
            const testCase = testRun.suite?.testCases[index];
            return {
              ...result,
              testCase: testCase ? {
                id: testCase.id,
                name: testCase.name,
                description: testCase.description,
                steps: typeof testCase.steps === 'string' ? JSON.parse(testCase.steps) : testCase.steps,
              } : null,
            };
          });
        }
      } catch (e) {
        console.error("Failed to parse results:", e);
      }
    }

    return NextResponse.json({
      ...testRun,
      results: enrichedResults,
    });
  } catch (_error) {
    return NextResponse.json({ error: "テスト実行結果の取得に失敗しました" }, { status: 500 });
  }
}
