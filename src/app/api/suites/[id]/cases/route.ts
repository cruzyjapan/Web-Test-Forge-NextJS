import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const createTestCaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  steps: z.array(
    z.object({
      action: z.string(),
      selector: z.string().optional(),
      value: z.string().optional(),
      expectedResult: z.string().optional(),
    }),
  ),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const testCases = await prisma.testCase.findMany({
      where: { suiteId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(testCases);
  } catch (_error) {
    return NextResponse.json({ error: "テストケースの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = createTestCaseSchema.parse(body);

    const testCase = await prisma.testCase.create({
      data: {
        name: data.name,
        description: data.description,
        suiteId: id,
        steps: JSON.stringify(data.steps),
        config: JSON.stringify({}),
      },
    });

    return NextResponse.json(testCase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力データが無効です", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "テストケースの作成に失敗しました" }, { status: 500 });
  }
}
