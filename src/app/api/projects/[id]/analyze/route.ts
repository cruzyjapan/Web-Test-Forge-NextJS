import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import os from "os"
import { prisma } from "@/lib/db/prisma"

// 動的インポートでanalyzerモジュールを読み込む
const loadAnalyzers = async () => {
  const { SourceCodeAnalyzer } = await import("@/lib/analyzer/source-code-analyzer")
  const { TestCaseGenerator } = await import("@/lib/analyzer/test-case-generator")
  return { SourceCodeAnalyzer, TestCaseGenerator }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json().catch(() => ({}))
    const language = body.language || 'ja' // デフォルトは日本語

    // プロジェクトを取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: "プロジェクトが見つかりません" },
        { status: 404 }
      )
    }

    // プロジェクトのソースコードパスを取得
    // sourcePathが指定されていればそれを使用、なければ現在のディレクトリ
    let projectPath = project.sourcePath || process.cwd()
    
    // ホームディレクトリの展開
    if (projectPath.startsWith('~')) {
      projectPath = path.join(os.homedir(), projectPath.slice(1))
    }
    
    // パスの正規化（絶対パスの場合はそのまま、相対パスの場合のみresolve）
    if (!path.isAbsolute(projectPath)) {
      projectPath = path.resolve(projectPath)
    }
    
    // ディレクトリの存在確認
    try {
      const stats = await fs.stat(projectPath)
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: `指定されたパスはディレクトリではありません: ${projectPath}` },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: `指定されたディレクトリが見つかりません: ${projectPath}` },
        { status: 400 }
      )
    }
    
    const baseUrl = project.baseUrl || "http://localhost:3000"

    console.log(`Analyzing project: ${project.name}`)
    console.log(`Project path: ${projectPath}`)
    console.log(`Base URL: ${baseUrl}`)

    // Analyzerモジュールを動的に読み込み
    const { SourceCodeAnalyzer, TestCaseGenerator } = await loadAnalyzers()
    
    // ステップ1: ソースコード解析
    const analyzer = new SourceCodeAnalyzer(projectPath, baseUrl)
    const analysisResult = await analyzer.analyze()

    // ステップ2: テストケース生成
    const tempDir = path.join(os.tmpdir(), `test-gen-${projectId}`)
    await fs.mkdir(tempDir, { recursive: true })

    const generator = new TestCaseGenerator(analysisResult, tempDir, project.baseUrl, language)
    await generator.generate()

    // 生成されたテストケースを読み込み
    const generatedTests: Record<string, string> = {}
    const testFiles = [
      "page-tests.md",
      "form-tests.md",
      "navigation-tests.md",
      "api-tests.md",
    ]

    for (const file of testFiles) {
      const filePath = path.join(tempDir, file)
      try {
        const content = await fs.readFile(filePath, "utf-8")
        generatedTests[file.replace(".md", "")] = content
      } catch (error) {
        console.log(`File not found: ${file}`)
      }
    }

    // 一時ファイルをクリーンアップ
    try {
      await fs.rm(tempDir, { recursive: true })
    } catch (error) {
      console.error("Failed to cleanup temp files:", error)
    }

    // 解析結果を保存（オプション）
    // Note: metadataフィールドがPrismaスキーマに存在しない場合はコメントアウト
    // await prisma.project.update({
    //   where: { id: projectId },
    //   data: {
    //     updatedAt: new Date(),
    //   },
    // })

    return NextResponse.json({
      analysis: analysisResult,
      tests: generatedTests,
      summary: {
        routes: analysisResult.routes.length,
        pages: analysisResult.pages.length,
        forms: analysisResult.forms.length,
        navigation: analysisResult.navigation.length,
      },
    })
  } catch (error) {
    console.error("Analysis error:", error)
    const errorMessage = error instanceof Error ? error.message : "ソースコード解析に失敗しました"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}