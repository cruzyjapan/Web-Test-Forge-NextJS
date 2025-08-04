import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  baseUrl: z.string().url(),
  sourcePath: z.string().optional(),
  screenshotSize: z.string().optional().default("desktop-1920"),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.userId) {
      // Return empty array instead of error for better UX
      return NextResponse.json([]);
    }
    
    const projects = await prisma.project.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return empty array instead of error for better UX
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. セッション確認
    const session = await getSession();
    
    if (!session || !session.userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    
    // 2. リクエストボディ解析
    let body;
    try {
      body = await req.json();
    } catch (bodyError) {
      return NextResponse.json({ error: "不正なリクエスト形式" }, { status: 400 });
    }
    
    // 3. バリデーション
    let data;
    try {
      data = createProjectSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "入力データが無効です", details: validationError.errors },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "バリデーションエラー" }, { status: 400 });
    }

    // 4. データベース作成
    let project;
    try {
      project = await prisma.project.create({
        data: {
          ...data,
          userId: session.userId,
        },
      });
    } catch (dbError) {
      return NextResponse.json({ 
        error: "データベースエラー",
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
    
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      {
        error: "プロジェクトの作成に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
