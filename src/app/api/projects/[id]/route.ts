import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  baseUrl: z.string().url().optional(),
  sourcePath: z.string().optional(),
  requiresAuth: z.boolean().optional(),
  authEmail: z.string().optional(),
  authPassword: z.string().optional(),
  loginUrl: z.string().optional(),
  screenshotSize: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        testSuites: true,
        testRuns: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "プロジェクトが見つかりません" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (_error) {
    return NextResponse.json({ error: "プロジェクトの取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Check if project exists first
    const existingProject = await prisma.project.findUnique({
      where: { id }
    });
    
    if (!existingProject) {
      console.error("Project not found:", id);
      return NextResponse.json({ error: "プロジェクトが見つかりません" }, { status: 404 });
    }
    
    const body = await req.json();
    
    // Validate the input first
    let validatedData;
    try {
      validatedData = updateProjectSchema.parse(body);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "入力データが無効です", details: validationError.errors },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "バリデーションエラー" }, { status: 400 });
    }
    
    // Build update data, converting empty strings to null for nullable fields
    const updateData: any = {};
    
    // Handle each field from validated data
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description === "" ? null : validatedData.description;
    }
    
    if (validatedData.baseUrl !== undefined) {
      updateData.baseUrl = validatedData.baseUrl;
    }
    
    if (validatedData.sourcePath !== undefined) {
      updateData.sourcePath = validatedData.sourcePath === "" ? null : validatedData.sourcePath;
    }
    
    if (validatedData.requiresAuth !== undefined) {
      updateData.requiresAuth = validatedData.requiresAuth;
    }
    
    if (validatedData.authEmail !== undefined) {
      updateData.authEmail = validatedData.authEmail === "" ? null : validatedData.authEmail;
    }
    
    if (validatedData.authPassword !== undefined) {
      updateData.authPassword = validatedData.authPassword === "" ? null : validatedData.authPassword;
    }
    
    if (validatedData.loginUrl !== undefined) {
      updateData.loginUrl = validatedData.loginUrl === "" ? null : validatedData.loginUrl;
    }
    
    if (validatedData.screenshotSize !== undefined) {
      updateData.screenshotSize = validatedData.screenshotSize || "desktop-1920";
    }
    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Project update error:", error);
    
    if (error instanceof Error) {
      console.error("Error details:");
      console.error("  Message:", error.message);
      console.error("  Name:", error.name);
      if ('code' in error) {
        console.error("  Code:", (error as any).code);
      }
      if ('meta' in error) {
        console.error("  Meta:", (error as any).meta);
      }
    }

    return NextResponse.json({ 
      error: "プロジェクトの更新に失敗しました",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // 関連データを削除（カスケード削除）
    // 1. スクリーンショットを削除
    await prisma.screenshot.deleteMany({
      where: {
        testRun: {
          projectId: id
        }
      }
    });
    
    // 2. テスト実行を削除
    await prisma.testRun.deleteMany({
      where: { projectId: id }
    });
    
    // 3. テストケースを削除（まずスイートIDを取得）
    const suites = await prisma.testSuite.findMany({
      where: { projectId: id },
      select: { id: true }
    });
    
    for (const suite of suites) {
      await prisma.testCase.deleteMany({
        where: { suiteId: suite.id }
      });
    }
    
    // 4. テストスイートを削除
    await prisma.testSuite.deleteMany({
      where: { projectId: id }
    });
    
    // 5. プロジェクトを削除
    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "プロジェクトの削除に失敗しました" }, { status: 500 });
  }
}
