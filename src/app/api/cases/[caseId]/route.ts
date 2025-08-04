import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    // テストケースの存在確認
    const testCase = await prisma.testCase.findUnique({
      where: { id: caseId },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "テストケースが見つかりません" },
        { status: 404 }
      );
    }

    // テストケースを削除
    await prisma.testCase.delete({
      where: { id: caseId },
    });

    return NextResponse.json({
      message: "テストケースを削除しました",
    });
  } catch (error) {
    console.error("Delete test case error:", error);
    return NextResponse.json(
      { error: "テストケースの削除に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await request.json();

    // テストケースの存在確認
    const testCase = await prisma.testCase.findUnique({
      where: { id: caseId },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "テストケースが見つかりません" },
        { status: 404 }
      );
    }

    // テストケースを更新
    const updatedTestCase = await prisma.testCase.update({
      where: { id: caseId },
      data: {
        name: body.name,
        description: body.description,
        steps: typeof body.steps === 'string' ? body.steps : JSON.stringify(body.steps),
      },
    });

    return NextResponse.json(updatedTestCase);
  } catch (error) {
    console.error("Update test case error:", error);
    return NextResponse.json(
      { error: "テストケースの更新に失敗しました" },
      { status: 500 }
    );
  }
}