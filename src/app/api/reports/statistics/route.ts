import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'week'
    
    // 期間に基づいて日付を計算
    const now = new Date()
    let startDate = new Date()
    
    switch(period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // テスト実行の統計を取得
    const runs = await prisma.testRun.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        project: true,
        suite: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // 全テストケース数を取得
    const totalTestCases = await prisma.testCase.count()
    
    // テストスイート数を取得
    const totalSuites = await prisma.testSuite.count()

    const totalRuns = runs.length
    const completedRuns = runs.filter(r => r.status === 'completed').length
    const failedRuns = runs.filter(r => r.status === 'failed').length
    const runningRuns = runs.filter(r => r.status === 'running').length
    const pendingRuns = runs.filter(r => r.status === 'pending').length
    
    // 成功率計算
    const successRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0

    // 平均実行時間を計算
    const durationsMs = runs
      .filter(r => r.startedAt && r.completedAt)
      .map(r => new Date(r.completedAt!).getTime() - new Date(r.startedAt!).getTime())
    
    const averageDuration = durationsMs.length > 0 
      ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 1000)
      : 0

    // テスト結果から詳細な統計を取得
    let totalTests = 0
    let passedTests = 0
    let failedTests = 0
    
    runs.forEach(run => {
      if (run.results) {
        try {
          const results = JSON.parse(run.results)
          if (results.tests && Array.isArray(results.tests)) {
            totalTests += results.tests.length
            passedTests += results.tests.filter((t: any) => t.status === 'passed').length
            failedTests += results.tests.filter((t: any) => t.status === 'failed').length
          }
        } catch (e) {
          // JSONパースエラーは無視
        }
      }
    })

    // 前回期間との比較（トレンド）
    let previousStartDate = new Date(startDate)
    switch(period) {
      case 'day':
        previousStartDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        previousStartDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        previousStartDate.setMonth(startDate.getMonth() - 1)
        break
    }

    const previousRuns = await prisma.testRun.findMany({
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    })

    const previousCompletedRuns = previousRuns.filter(r => r.status === 'completed').length
    const previousSuccessRate = previousRuns.length > 0 
      ? (previousCompletedRuns / previousRuns.length) * 100 
      : 0
    
    const trend = successRate > previousSuccessRate ? 'up' : 'down'
    const trendDiff = Math.abs(successRate - previousSuccessRate)

    return NextResponse.json({
      totalRuns,
      completedRuns,
      failedRuns,
      runningRuns,
      pendingRuns,
      successRate: Math.round(successRate * 10) / 10,
      averageDuration,
      totalTests,
      passedTests,
      failedTests,
      totalTestCases,
      totalSuites,
      trend,
      trendDiff: Math.round(trendDiff * 10) / 10,
      period,
      recentRuns: runs.slice(0, 10).map(run => ({
        id: run.id,
        projectId: run.projectId,
        projectName: run.project?.name || "不明なプロジェクト",
        suiteName: run.suite?.name,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        results: run.results ? JSON.parse(run.results) : null
      }))
    })
  } catch (error) {
    console.error("Failed to fetch statistics:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}