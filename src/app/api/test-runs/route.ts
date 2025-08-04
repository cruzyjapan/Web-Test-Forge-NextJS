import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    const whereClause = status ? { status } : {}
    
    const runs = await prisma.testRun.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        suite: {
          select: {
            id: true,
            name: true,
            testCases: {
              select: {
                id: true,
                name: true,
                description: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // 最新50件を取得
    })

    // Parse results to get test case names
    const runsWithTestInfo = runs.map(run => {
      let testInfo = null
      if (run.suite) {
        testInfo = {
          suiteName: run.suite.name,
          testCount: run.suite.testCases.length,
          testCases: run.suite.testCases
        }
      }
      
      // Parse results to get success/failure count
      let successCount = 0
      let totalCount = 0
      if (run.results) {
        try {
          const results = typeof run.results === 'string' ? JSON.parse(run.results) : run.results
          if (Array.isArray(results)) {
            totalCount = results.length
            successCount = results.filter((r: any) => r.success).length
          }
        } catch (e) {
          console.error("Failed to parse results:", e)
        }
      }
      
      return {
        ...run,
        testInfo,
        successCount,
        totalCount
      }
    })

    return NextResponse.json(runsWithTestInfo)
  } catch (error) {
    console.error("Failed to fetch test runs:", error)
    return NextResponse.json(
      { error: "Failed to fetch test runs" },
      { status: 500 }
    )
  }
}