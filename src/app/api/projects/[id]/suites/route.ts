import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const createTestSuiteSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const testSuites = await prisma.testSuite.findMany({
      where: { projectId: id },
      include: {
        testCases: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(testSuites);
  } catch (_error) {
    return NextResponse.json({ error: "テストスイートの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = createTestSuiteSchema.parse(body);

    const testSuite = await prisma.testSuite.create({
      data: {
        ...data,
        projectId: id,
      },
    });

    return NextResponse.json(testSuite);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力データが無効です", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "テストスイートの作成に失敗しました" }, { status: 500 });
  }
}
