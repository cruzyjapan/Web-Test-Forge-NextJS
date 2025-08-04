import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const testSuite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          }
        },
        testCases: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!testSuite) {
      return NextResponse.json({ error: "テストスイートが見つかりません" }, { status: 404 })
    }

    // テストケースを番号順にソート
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

    return NextResponse.json({
      ...testSuite,
      testCases: sortedTestCases
    })
  } catch (_error) {
    return NextResponse.json({ error: "テストスイートの取得に失敗しました" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // まず、テストスイートに関連するテストケースをすべて削除
    await prisma.testCase.deleteMany({
      where: { suiteId: id },
    });

    // その後、テストスイートを削除
    const deletedSuite = await prisma.testSuite.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "テストスイートを削除しました",
      deletedSuite,
    });
  } catch (error) {
    console.error("Failed to delete test suite:", error);
    return NextResponse.json(
      { error: "テストスイートの削除に失敗しました" },
      { status: 500 }
    );
  }
}