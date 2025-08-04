import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const period = searchParams.get('period') || 'week'
    const lang = searchParams.get('lang') || 'en'
    
    let runs
    
    if (projectId) {
      // プロジェクト別のレポート
      runs = await prisma.testRun.findMany({
        where: {
          projectId
        },
        include: {
          project: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } else {
      // 期間別のレポート
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
      
      runs = await prisma.testRun.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        include: {
          project: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }
    
    // CSVデータの作成
    const headers = lang === 'ja' 
      ? ['実行ID', 'プロジェクト', 'テスト名', 'テスト内容', '実行日時', 'ステータス', '結果', '実行時間(秒)']
      : ['Run ID', 'Project', 'Test Name', 'Test Content', 'Execution Time', 'Status', 'Result', 'Duration (sec)']
    const csvRows = [headers]
    
    runs.forEach(run => {
      let duration = 0
      
      if (run.startedAt && run.completedAt) {
        duration = Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
      }
      
      const executionTime = run.startedAt ? new Date(run.startedAt).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : (lang === 'ja' ? '未実行' : 'Not executed')
      
      if (run.results) {
        try {
          const results = JSON.parse(run.results)
          
          // 各テストケースの詳細を出力
          if (results.tests && Array.isArray(results.tests)) {
            results.tests.forEach((test: any) => {
              csvRows.push([
                run.id,
                run.project?.name || (lang === 'ja' ? '不明' : 'Unknown'),
                test.name || (lang === 'ja' ? 'テスト' : 'Test'),
                test.description || test.steps?.join(' → ') || '',
                executionTime,
                run.status,
                test.status === 'passed' ? (lang === 'ja' ? '成功' : 'Success') : 
                test.status === 'failed' ? (lang === 'ja' ? '失敗' : 'Failed') : 
                (lang === 'ja' ? 'スキップ' : 'Skipped'),
                test.duration ? (test.duration / 1000).toFixed(2) : duration.toString()
              ])
            })
          } else {
            // テスト詳細がない場合は実行全体の情報を出力
            csvRows.push([
              run.id,
              run.project?.name || (lang === 'ja' ? '不明' : 'Unknown'),
              lang === 'ja' ? '全体テスト' : 'Overall Test',
              results.message || '',
              executionTime,
              run.status,
              run.status === 'completed' ? (lang === 'ja' ? '完了' : 'Completed') : 
              run.status === 'failed' ? (lang === 'ja' ? '失敗' : 'Failed') : 
              (lang === 'ja' ? '実行中' : 'Running'),
              duration.toString()
            ])
          }
        } catch (e) {
          // JSONパースエラーの場合も基本情報を出力
          csvRows.push([
            run.id,
            run.project?.name || (lang === 'ja' ? '不明' : 'Unknown'),
            lang === 'ja' ? 'テスト実行' : 'Test Run',
            '',
            executionTime,
            run.status,
            run.status === 'completed' ? (lang === 'ja' ? '完了' : 'Completed') : 
            run.status === 'failed' ? (lang === 'ja' ? '失敗' : 'Failed') : 
            (lang === 'ja' ? '実行中' : 'Running'),
            duration.toString()
          ])
        }
      } else {
        // 結果がない場合も基本情報を出力
        csvRows.push([
          run.id,
          run.project?.name || (lang === 'ja' ? '不明' : 'Unknown'),
          lang === 'ja' ? 'テスト実行' : 'Test Run',
          '',
          executionTime,
          run.status,
          lang === 'ja' ? '未実行' : 'Not executed',
          '0'
        ])
      }
    })
    
    // CSVフォーマットに変換
    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    // BOMを付加（Excelで開いた時の文字化け対策）
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent
    
    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="test-report-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Failed to export report:", error)
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    )
  }
}