import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const updateTestSuiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const testSuite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { createdAt: "asc" }, // 作成順（古い順）でソート
        },
        project: true,
      },
    });

    if (!testSuite) {
      return NextResponse.json({ error: "テストスイートが見つかりません" }, { status: 404 });
    }

    // テストケースを番号順にソート（名前に番号が含まれている場合）
    const sortedTestCases = [...testSuite.testCases].sort((a, b) => {
      // 名前から番号を抽出（例: "1. ページ表示: ホーム" -> 1）
      const getNumber = (name: string) => {
        const match = name.match(/^(\d+)\./);
        return match ? parseInt(match[1], 10) : 999999;
      };
      
      const numA = getNumber(a.name);
      const numB = getNumber(b.name);
      
      if (numA !== numB) {
        return numA - numB;
      }
      // 番号が同じか番号がない場合は名前順
      return a.name.localeCompare(b.name);
    });

    // stepsとconfigをパース
    const formattedSuite = {
      ...testSuite,
      testCases: sortedTestCases.map(tc => ({
        ...tc,
        steps: typeof tc.steps === 'string' ? JSON.parse(tc.steps) : tc.steps,
        config: typeof tc.config === 'string' ? JSON.parse(tc.config) : tc.config,
      }))
    };

    return NextResponse.json(formattedSuite);
  } catch (_error) {
    return NextResponse.json({ error: "テストスイートの取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateTestSuiteSchema.parse(body);

    const testSuite = await prisma.testSuite.update({
      where: { id },
      data,
    });

    return NextResponse.json(testSuite);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力データが無効です", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "テストスイートの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // First delete all test cases associated with this suite
    await prisma.testCase.deleteMany({
      where: { suiteId: id },
    });
    
    // Then delete the test suite itself
    await prisma.testSuite.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete test suite:", error);
    return NextResponse.json({ error: "テストスイートの削除に失敗しました" }, { status: 500 });
  }
}
