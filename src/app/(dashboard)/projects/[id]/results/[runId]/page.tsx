"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, Download, Image as ImageIcon, Loader2, Pause, Play } from "lucide-react"
import Image from "next/image"
import { useLanguage } from "@/contexts/language-context"
import { useEffect, useRef, useState } from "react"
import { playTestCompletionSound } from "@/lib/utils/sound"
import { useMutation } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { AuthFailureAlert } from "@/components/ui/auth-failure-alert"

export default function TestResultDetailPage() {
  const params = useParams()
  const { language } = useLanguage()
  const { toast } = useToast()
  const projectId = params.id as string
  const runId = params.runId as string
  const hasPlayedSound = useRef(false)
  const [isPaused, setIsPaused] = useState(false)

  const { data: testRun, isLoading } = useQuery({
    queryKey: ["testRun", runId],
    queryFn: async () => {
      const res = await fetch(`/api/runs/${runId}`)
      if (!res.ok) throw new Error("Failed to fetch test run")
      return res.json()
    },
    refetchInterval: (data) => {
      // Stop refetching if test is complete or paused
      if (data?.status === 'completed' || data?.status === 'failed' || data?.status === 'paused') {
        return false
      }
      // Refetch every 2 seconds if still running
      return 2000
    }
  })

  // Play sound when test completes
  useEffect(() => {
    if (testRun && !hasPlayedSound.current) {
      if (testRun.status === 'completed') {
        hasPlayedSound.current = true
        playTestCompletionSound(true)
      } else if (testRun.status === 'failed') {
        hasPlayedSound.current = true
        playTestCompletionSound(false)
      }
    }
    // Update paused state based on test run status
    if (testRun?.status === 'paused') {
      setIsPaused(true)
    } else if (testRun?.status === 'running') {
      setIsPaused(false)
    }
  }, [testRun?.status])

  // Pause/Resume mutation
  const pauseResumeMutation = useMutation({
    mutationFn: async (action: 'pause' | 'resume') => {
      const res = await fetch(`/api/runs/${runId}/${action}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`Failed to ${action} test`)
      return res.json()
    },
    onSuccess: (data, action) => {
      toast({
        title: language === 'ja' ? '成功' : 'Success',
        description: language === 'ja' 
          ? (action === 'pause' ? 'テストを一時停止しました' : 'テストを再開しました')
          : (action === 'pause' ? 'Test paused successfully' : 'Test resumed successfully'),
      })
      setIsPaused(action === 'pause')
    },
    onError: (error, action) => {
      toast({
        title: language === 'ja' ? 'エラー' : 'Error',
        description: language === 'ja'
          ? `テストの${action === 'pause' ? '一時停止' : '再開'}に失敗しました`
          : `Failed to ${action} test`,
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!testRun) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-gray-500">{language === 'ja' ? 'テスト結果が見つかりません' : 'Test results not found'}</p>
          <Button asChild className="mt-4">
            <Link href={`/projects/${projectId}/results`}>{language === 'ja' ? '結果一覧へ戻る' : 'Back to Results'}</Link>
          </Button>
        </div>
      </div>
    )
  }

  const resultsData = typeof testRun.results === "string" ? JSON.parse(testRun.results) : testRun.results
  const results = resultsData && Array.isArray(resultsData) ? resultsData : []

  return (
    <div className="container mx-auto py-8">
      <AuthFailureAlert />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button asChild variant="ghost" className="mr-4">
              <Link href={`/projects/${projectId}/results`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{language === 'ja' ? 'テスト結果詳細' : 'Test Result Details'}</h1>
              {testRun.suite && (
                <p className="text-lg text-gray-700 mt-1">
                  {testRun.suite.name}
                </p>
              )}
              <p className="text-gray-600">
                {new Date(testRun.createdAt).toLocaleString(language === 'ja' ? "ja-JP" : "en-US", {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {(testRun.status === "running" || testRun.status === "paused") && (
              <Button 
                variant={isPaused ? "success" : "destructive"}
                className={isPaused ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                onClick={() => pauseResumeMutation.mutate(isPaused ? 'resume' : 'pause')}
                disabled={pauseResumeMutation.isPending}
              >
                {pauseResumeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isPaused ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {language === 'ja' ? '再開' : 'Resume'}
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    {language === 'ja' ? '一時停止' : 'Pause'}
                  </>
                )}
              </Button>
            )}
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {language === 'ja' ? 'レポートをダウンロード' : 'Download Report'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {testRun.status === "completed" ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : testRun.status === "failed" ? (
                    <XCircle className="h-6 w-6 text-red-500" />
                  ) : testRun.status === "paused" ? (
                    <Pause className="h-6 w-6 text-yellow-500" />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  )}
                  <div>
                    <CardTitle>
                      {testRun.status === "completed"
                        ? (language === 'ja' ? "テスト成功" : "Test Passed")
                        : testRun.status === "failed"
                        ? (language === 'ja' ? "テスト失敗" : "Test Failed")
                        : testRun.status === "paused"
                        ? (language === 'ja' ? "一時停止中" : "Paused")
                        : (language === 'ja' ? "実行中" : "Running")}
                    </CardTitle>
                    <CardDescription>
                      {testRun.startedAt && testRun.completedAt && (
                        <span>
                          {language === 'ja' ? '実行時間: ' : 'Duration: '}
                          {Math.round(
                            (new Date(testRun.completedAt).getTime() -
                              new Date(testRun.startedAt).getTime()) /
                              1000
                          )}
                          {language === 'ja' ? '秒' : 's'}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{language === 'ja' ? 'テストケース実行結果' : 'Test Case Results'}</h2>
                <div className="text-sm text-gray-600">
                  {language === 'ja' ? '成功' : 'Passed'}: {results.filter((r: any) => r.success).length} / {results.length}
                </div>
              </div>
              {results.map((result: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">
                          {result.testCaseName || result.testCase?.name || (language === 'ja' ? `テストケース ${index + 1}` : `Test Case ${index + 1}`)}
                        </CardTitle>
                        {result.testCase?.description && (
                          <CardDescription className="mt-1">
                            {result.testCase.description}
                          </CardDescription>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                          <span>
                            {language === 'ja' ? 'ブラウザ' : 'Browser'}: {result.browser === "chromium"
                              ? "Chrome"
                              : result.browser === "firefox"
                              ? "Firefox"
                              : "Safari"}
                          </span>
                          <span>{language === 'ja' ? '実行時間' : 'Duration'}: {(result.duration / 1000).toFixed(2)}{language === 'ja' ? '秒' : 's'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">{language === 'ja' ? '成功' : 'Passed'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-5 w-5" />
                            <span className="font-medium">{language === 'ja' ? '失敗' : 'Failed'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        <p className="font-medium mb-1">{language === 'ja' ? 'エラー内容:' : 'Error Details:'}</p>
                        <p>{result.error}</p>
                      </div>
                    )}

                    {(() => {
                      const steps = result.testCase?.steps
                      const parsedSteps = steps ? (typeof steps === 'string' ? JSON.parse(steps) : steps) : null
                      
                      if (!parsedSteps || !Array.isArray(parsedSteps) || parsedSteps.length === 0) {
                        return null
                      }
                      
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">{language === 'ja' ? 'テストステップ詳細' : 'Test Step Details'}</h4>
                            <span className="text-xs text-gray-500">
                              {parsedSteps.length}{language === 'ja' ? 'ステップ' : ' steps'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {parsedSteps.map((step: any, stepIndex: number) => {
                            const executedStep = result.steps?.[stepIndex];
                            return (
                              <div
                                key={stepIndex}
                                className={`p-3 rounded-lg border ${
                                  executedStep?.success 
                                    ? "bg-green-50 border-green-200" 
                                    : executedStep?.success === false 
                                    ? "bg-red-50 border-red-200"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-2 flex-1">
                                    {executedStep?.success ? (
                                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                    ) : executedStep?.success === false ? (
                                      <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                    ) : (
                                      <div className="h-4 w-4 rounded-full bg-gray-300 mt-0.5" />
                                    )}
                                    <div className="flex-1 space-y-1">
                                      <p className="text-sm font-medium">
                                        {stepIndex + 1}. {step.action}
                                      </p>
                                      {step.selector && (
                                        <p className="text-xs text-gray-600">
                                          {language === 'ja' ? 'セレクタ' : 'Selector'}: <code className="bg-gray-100 px-1 py-0.5 rounded">{step.selector}</code>
                                        </p>
                                      )}
                                      {step.value && (
                                        <p className="text-xs text-gray-600">
                                          {step.action === 'navigate' || step.action === 'goto' ? (
                                            <>
                                              URL: <code className="bg-blue-50 px-1 py-0.5 rounded text-blue-700">{step.value}</code>
                                            </>
                                          ) : (
                                            <>
                                              {language === 'ja' ? '入力値' : 'Input'}: <code className="bg-blue-50 px-1 py-0.5 rounded text-blue-700">{step.value}</code>
                                            </>
                                          )}
                                        </p>
                                      )}
                                      {step.expectedResult && (
                                        <p className="text-xs text-gray-500">
                                          {language === 'ja' ? '期待結果' : 'Expected Result'}: {step.expectedResult}
                                        </p>
                                      )}
                                      {executedStep?.url && (
                                        <p className="text-xs text-gray-600">
                                          {language === 'ja' ? '実行後URL' : 'Result URL'}: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{executedStep.url}</code>
                                        </p>
                                      )}
                                      {executedStep?.screenshot && (
                                        <p className="text-xs text-blue-600">
                                          📸 {language === 'ja' ? 'スクリーンショット' : 'Screenshot'}: {executedStep.screenshot.split('/').pop()}
                                        </p>
                                      )}
                                      {executedStep?.error && (
                                        <p className="text-xs text-red-600 mt-1">
                                          {language === 'ja' ? 'エラー' : 'Error'}: {executedStep.error}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {executedStep?.duration && (
                                    <span className="text-xs text-gray-500">
                                      {executedStep.duration}ms
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      )
                    })()}

                    {(() => {
                      const steps = result.testCase?.steps
                      const parsedSteps = steps ? (typeof steps === 'string' ? JSON.parse(steps) : steps) : null
                      const hasTestCaseSteps = parsedSteps && Array.isArray(parsedSteps) && parsedSteps.length > 0
                      
                      if (hasTestCaseSteps || !result.steps || result.steps.length === 0) {
                        return null
                      }
                      
                      return (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">{language === 'ja' ? '実行ステップ' : 'Execution Steps'}</h4>
                        <div className="space-y-2">
                          {result.steps.map((step: any, stepIndex: number) => (
                            <div
                              key={stepIndex}
                              className={`p-3 rounded-lg border ${
                                step.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2 flex-1">
                                  {step.success ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{step.name}</p>
                                    {step.screenshot && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        📸 {language === 'ja' ? 'スクリーンショット' : 'Screenshot'}: {step.screenshot.split('/').pop()}
                                      </p>
                                    )}
                                    {step.error && (
                                      <p className="text-xs text-red-600 mt-1">
                                        {language === 'ja' ? 'エラー' : 'Error'}: {step.error}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs text-gray-500">{step.duration}ms</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {testRun.screenshots && testRun.screenshots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="mr-2 h-5 w-5" />
                  {language === 'ja' ? 'スクリーンショット' : 'Screenshots'}
                </CardTitle>
                <CardDescription>
                  {language === 'ja' ? 'テスト実行時にキャプチャされた画面' : 'Captured screens during test execution'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {testRun.screenshots.map((screenshot: any) => (
                    <div key={screenshot.id} className="space-y-2">
                      <div className="bg-gray-100 rounded border overflow-hidden">
                        {screenshot.filePath ? (
                          <a 
                            href={screenshot.filePath} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={screenshot.filePath}
                              alt={`${screenshot.browser} - ${screenshot.pageName}`}
                              className="w-full h-auto"
                              loading="lazy"
                            />
                          </a>
                        ) : (
                          <div className="aspect-video flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-medium">
                          {screenshot.browser} - {screenshot.pageName}
                        </p>
                        <p className="text-gray-500 truncate">{screenshot.url}</p>
                        <a 
                          href={screenshot.filePath}
                          download
                          className="text-blue-500 hover:underline"
                        >
                          {language === 'ja' ? 'ダウンロード' : 'Download'}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}