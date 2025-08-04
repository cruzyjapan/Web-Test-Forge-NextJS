import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const updateTestCaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  steps: z.array(
    z.object({
      action: z.string(),
      selector: z.string().optional(),
      value: z.string().optional(),
      expectedResult: z.string().optional(),
    })
  ),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const testCase = await prisma.testCase.findUnique({
      where: { id: caseId },
    });

    if (!testCase) {
      return NextResponse.json({ error: "テストケースが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      ...testCase,
      steps: JSON.parse(testCase.steps),
      config: testCase.config ? JSON.parse(testCase.config) : {},
    });
  } catch (_error) {
    return NextResponse.json({ error: "テストケースの取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await req.json();
    const data = updateTestCaseSchema.parse(body);

    const testCase = await prisma.testCase.update({
      where: { id: caseId },
      data: {
        name: data.name,
        description: data.description,
        steps: JSON.stringify(data.steps),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...testCase,
      steps: data.steps,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力データが無効です", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "テストケースの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const { caseId } = await params;
    
    await prisma.testCase.delete({
      where: { id: caseId },
    });

    return NextResponse.json({ message: "テストケースを削除しました" });
  } catch (_error) {
    return NextResponse.json({ error: "テストケースの削除に失敗しました" }, { status: 500 });
  }
}