import { type NextRequest, NextResponse } from "next/server";
import { LocalTestGenerator } from "@/lib/ai/local-test-generator";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const formData = await req.formData();

    // フォームデータから仕様書の内容を取得
    const specContent = formData.get("specContent") as string;
    const specFiles = formData.getAll("specFiles") as File[];
    const baseUrl = formData.get("baseUrl") as string;
    const projectName = formData.get("projectName") as string;

    console.log("Received request:", {
      hasSpecContent: !!specContent,
      specContentLength: specContent?.length,
      filesCount: specFiles.length,
      fileNames: specFiles.map(f => f.name),
      fileSizes: specFiles.map(f => f.size),
      baseUrl,
      projectName
    });

    if (!specContent && specFiles.length === 0) {
      return NextResponse.json({ error: "仕様書の内容またはファイルが必要です" }, { status: 400 });
    }

    // テストスイートの存在確認
    const suite = await prisma.testSuite.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!suite) {
      return NextResponse.json({ error: "テストスイートが見つかりません" }, { status: 404 });
    }

    // テストジェネレーターを初期化
    const generator = new LocalTestGenerator();
    const context = {
      baseUrl: baseUrl || suite.project.baseUrl,
      projectName: projectName || suite.project.name,
      language: "ja" as const,
    };

    const generatedTests = [];

    // テキスト入力から生成
    if (specContent) {
      const tests = await generator.generateFromSpec(
        {
          content: specContent,
          fileName: "input.txt",
          type: "text",
        },
        context,
      );
      generatedTests.push(...tests);
    }

    // ファイルから生成
    for (const file of specFiles) {
      console.log(`Processing file: ${file.name}`);
      const content = await file.text();
      console.log(`File content length: ${content.length}, first 100 chars:`, content.substring(0, 100));
      
      const fileType = detectFileType(file.name);
      console.log(`Detected file type: ${fileType}`);
      
      const tests = await generator.generateFromSpec(
        {
          content,
          fileName: file.name,
          type: fileType,
        },
        context,
      );
      
      console.log(`Generated ${tests.length} tests from ${file.name}`);
      generatedTests.push(...tests);
    }

    // 生成されたテストケースをデータベースに保存
    const createdTestCases = [];
    for (const test of generatedTests) {
      const testCase = await prisma.testCase.create({
        data: {
          name: test.name,
          description: test.description,
          suiteId: id,
          steps: JSON.stringify(test.steps),
          config: JSON.stringify({}),
        },
      });
      createdTestCases.push({
        ...testCase,
        steps: test.steps,
        priority: test.priority,
        tags: test.tags,
      });
    }

    return NextResponse.json({
      message: `${createdTestCases.length}件のテストケースを生成しました`,
      testCases: createdTestCases,
    });
  } catch (error) {
    console.error("Test generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    const errorStack = error instanceof Error ? error.stack : "";
    
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name
    });
    
    return NextResponse.json({ 
      error: "テストケースの生成に失敗しました",
      details: errorMessage 
    }, { status: 500 });
  }
}

function detectFileType(fileName: string): "markdown" | "text" | "html" | "json" {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "md":
    case "markdown":
      return "markdown";
    case "html":
    case "htm":
      return "html";
    case "json":
      return "json";
    default:
      return "text";
  }
}
