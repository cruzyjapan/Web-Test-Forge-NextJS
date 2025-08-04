import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { publishTestControl, getTestExecutionState } from "@/lib/redis/test-control"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runId = params.id
    
    // Get the test run
    const testRun = await prisma.testRun.findUnique({
      where: { id: runId },
    })
    
    if (!testRun) {
      return NextResponse.json(
        { error: "Test run not found" },
        { status: 404 }
      )
    }
    
    if (testRun.status !== 'paused') {
      return NextResponse.json(
        { error: "Test is not paused" },
        { status: 400 }
      )
    }
    
    // Retrieve execution state for resume
    const executionState = await getTestExecutionState(runId)
    
    // Update the test run status back to running
    const updatedRun = await prisma.testRun.update({
      where: { id: runId },
      data: {
        status: 'running',
        results: JSON.stringify({
          ...JSON.parse(testRun.results || '{}'),
          resumedAt: new Date().toISOString(),
          resumeState: executionState,
        }),
      },
    })
    
    // Send resume signal to the test runner process via Redis pub/sub
    await publishTestControl({
      action: 'resume',
      runId,
      timestamp: new Date().toISOString(),
    })
    
    return NextResponse.json({
      success: true,
      testRun: updatedRun,
      executionState, // Include state for the test runner to resume from
    })
  } catch (error) {
    console.error("Failed to resume test run:", error)
    return NextResponse.json(
      { error: "Failed to resume test run" },
      { status: 500 }
    )
  }
}