import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET(request: NextRequest) {
  try {
    const suites = await prisma.testSuite.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            testCases: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(suites)
  } catch (error) {
    console.error("Failed to fetch test suites:", error)
    return NextResponse.json(
      { error: "Failed to fetch test suites" },
      { status: 500 }
    )
  }
}