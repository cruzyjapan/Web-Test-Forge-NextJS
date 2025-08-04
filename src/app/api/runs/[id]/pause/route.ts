import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { publishTestControl, storeTestExecutionState } from "@/lib/redis/test-control"

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
    
    if (testRun.status !== 'running') {
      return NextResponse.json(
        { error: "Test is not running" },
        { status: 400 }
      )
    }
    
    // Update the test run status to paused
    const updatedRun = await prisma.testRun.update({
      where: { id: runId },
      data: {
        status: 'paused',
        results: JSON.stringify({
          ...JSON.parse(testRun.results || '{}'),
          pausedAt: new Date().toISOString(),
        }),
      },
    })
    
    // Send pause signal to the test runner process via Redis pub/sub
    await publishTestControl({
      action: 'pause',
      runId,
      timestamp: new Date().toISOString(),
    })
    
    // Store current execution state for later resume
    const currentResults = JSON.parse(testRun.results || '{}')
    if (currentResults.currentStep) {
      await storeTestExecutionState(runId, {
        currentStepIndex: currentResults.currentStep,
        completedSteps: currentResults.completedSteps || [],
        context: currentResults.context || {},
      })
    }
    
    return NextResponse.json({
      success: true,
      testRun: updatedRun,
    })
  } catch (error) {
    console.error("Failed to pause test run:", error)
    return NextResponse.json(
      { error: "Failed to pause test run" },
      { status: 500 }
    )
  }
}