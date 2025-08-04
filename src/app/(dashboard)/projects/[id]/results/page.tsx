"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, Clock, Image, Loader2, Pause, Play } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

export default function TestResultsPage() {
  const params = useParams()
  const { language } = useLanguage()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const projectId = params.id as string
  const [pausedRuns, setPausedRuns] = useState<Set<string>>(new Set())

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch project")
      return res.json()
    },
  })

  const { data: testRuns, isLoading } = useQuery({
    queryKey: ["testRuns", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/runs`)
      if (!res.ok) throw new Error("Failed to fetch test runs")
      return res.json()
    },
    refetchInterval: 5000,
  })

  // Pause/Resume mutation
  const pauseResumeMutation = useMutation({
    mutationFn: async ({ runId, action }: { runId: string; action: 'pause' | 'resume' }) => {
      const res = await fetch(`/api/runs/${runId}/${action}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`Failed to ${action} test`)
      return res.json()
    },
    onSuccess: (data, variables) => {
      toast({
        title: language === 'ja' ? '成功' : 'Success',
        description: language === 'ja' 
          ? (variables.action === 'pause' ? 'テストを一時停止しました' : 'テストを再開しました')
          : (variables.action === 'pause' ? 'Test paused successfully' : 'Test resumed successfully'),
      })
      if (variables.action === 'pause') {
        setPausedRuns(prev => new Set(prev).add(variables.runId))
      } else {
        setPausedRuns(prev => {
          const newSet = new Set(prev)
          newSet.delete(variables.runId)
          return newSet
        })
      }
      queryClient.invalidateQueries({ queryKey: ["testRuns", projectId] })
    },
    onError: (error, variables) => {
      toast({
        title: language === 'ja' ? 'エラー' : 'Error',
        description: language === 'ja'
          ? `テストの${variables.action === 'pause' ? '一時停止' : '再開'}に失敗しました`
          : `Failed to ${variables.action} test`,
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

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Button asChild variant="ghost" className="mr-4">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">テスト結果</h1>
            <p className="text-gray-600">{project?.name}</p>
          </div>
        </div>

        {testRuns && testRuns.length > 0 ? (
          <div className="space-y-4">
            {testRuns.map((run: any) => (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {run.status === "completed" ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : run.status === "failed" ? (
                        <XCircle className="h-6 w-6 text-red-500" />
                      ) : run.status === "running" ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      ) : run.status === "paused" ? (
                        <Pause className="h-6 w-6 text-yellow-500" />
                      ) : (
                        <Clock className="h-6 w-6 text-gray-400" />
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {run.status === "completed"
                            ? (language === 'ja' ? "テスト成功" : "Test Passed")
                            : run.status === "failed"
                            ? (language === 'ja' ? "テスト失敗" : "Test Failed")
                            : run.status === "running"
                            ? (language === 'ja' ? "実行中" : "Running")
                            : run.status === "paused"
                            ? (language === 'ja' ? "一時停止中" : "Paused")
                            : (language === 'ja' ? "待機中" : "Pending")}
                        </CardTitle>
                        <CardDescription>
                          {new Date(run.createdAt).toLocaleString("ja-JP")}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(run.status === "running" || run.status === "paused") && (
                        <Button 
                          size="sm" 
                          variant={run.status === "paused" || pausedRuns.has(run.id) ? "success" : "outline"}
                          onClick={() => pauseResumeMutation.mutate({ 
                            runId: run.id, 
                            action: (run.status === "paused" || pausedRuns.has(run.id)) ? 'resume' : 'pause' 
                          })}
                          disabled={pauseResumeMutation.isPending}
                        >
                          {pauseResumeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (run.status === "paused" || pausedRuns.has(run.id)) ? (
                            <>
                              <Play className="mr-1 h-3 w-3" />
                              {language === 'ja' ? '再開' : 'Resume'}
                            </>
                          ) : (
                            <>
                              <Pause className="mr-1 h-3 w-3" />
                              {language === 'ja' ? '一時停止' : 'Pause'}
                            </>
                          )}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/projects/${projectId}/results/${run.id}`}>
                          {language === 'ja' ? '詳細を見る' : 'View Details'}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const results = typeof run.results === "string" ? JSON.parse(run.results) : run.results;
                    
                    // テストケース名とURLを表示
                    if (results && results.tests && Array.isArray(results.tests)) {
                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-2">
                            {results.tests.slice(0, 5).map((test: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                              >
                                <div className="flex items-center space-x-3 flex-1">
                                  {test.status === 'passed' ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  ) : test.status === 'failed' ? (
                                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {test.name || '無題のテスト'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {test.details?.url || test.details?.route || '—'}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs text-gray-500 ml-2">
                                  {test.duration}ms
                                </span>
                              </div>
                            ))}
                          </div>
                          {results.tests.length > 5 && (
                            <p className="text-sm text-gray-500 text-center">
                              他 {results.tests.length - 5} 件のテスト
                            </p>
                          )}
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-sm text-gray-600">
                              合計: {results.totalTests || 0} 件
                            </span>
                            <div className="flex space-x-4 text-sm">
                              <span className="text-green-600">
                                成功: {results.passed || 0}
                              </span>
                              <span className="text-red-600">
                                失敗: {results.failed || 0}
                              </span>
                              <span className="text-gray-600">
                                スキップ: {results.skipped || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (results && typeof results === "object" && Array.isArray(results)) {
                      // 古い形式のデータに対応
                      return (
                        <div className="grid gap-4 md:grid-cols-3">
                          {results.map((result: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center space-x-2">
                                {result.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm font-medium">
                                  {result.browser === "chromium"
                                    ? "Chrome"
                                    : result.browser === "firefox"
                                    ? "Firefox"
                                    : "Safari"}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {result.duration}ms
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    } else if (results && results.error) {
                      return (
                        <div className="text-red-600 text-sm">
                          エラー: {results.error}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-sm">
                          結果データがありません
                        </div>
                      );
                    }
                  })()}

                  {run.screenshots && run.screenshots.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <Image className="h-4 w-4" />
                        <span>{run.screenshots.length} 件のスクリーンショット</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {run.screenshots.slice(0, 3).map((screenshot: any) => (
                          <div
                            key={screenshot.id}
                            className="aspect-video bg-gray-100 rounded border overflow-hidden relative group"
                          >
                            {screenshot.filePath ? (
                              <Link href={`/projects/${projectId}/results/${run.id}`}>
                                <img
                                  src={screenshot.filePath}
                                  alt={`${screenshot.browser} - ${screenshot.pageName}`}
                                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity cursor-pointer"
                                  loading="lazy"
                                />
                              </Link>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                        ))}
                        {run.screenshots.length > 3 && (
                          <Link 
                            href={`/projects/${projectId}/results/${run.id}`}
                            className="aspect-video bg-gray-200 rounded border flex items-center justify-center hover:bg-gray-300 transition-colors"
                          >
                            <div className="text-center">
                              <span className="text-2xl font-bold text-gray-600">
                                +{run.screenshots.length - 3}
                              </span>
                              <p className="text-xs text-gray-500">もっと見る</p>
                            </div>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {run.startedAt && run.completedAt && (
                    <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        実行時間:{" "}
                        {Math.round(
                          (new Date(run.completedAt).getTime() -
                            new Date(run.startedAt).getTime()) /
                            1000
                        )}
                        秒
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">まだテスト結果がありません</p>
              <Button asChild>
                <Link href={`/projects/${projectId}/test`}>
                  最初のテストを実行
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}