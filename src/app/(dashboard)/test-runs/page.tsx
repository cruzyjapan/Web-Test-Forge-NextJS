"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Play, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Pause } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { AuthFailureAlert } from "@/components/ui/auth-failure-alert"

export default function TestRunsPage() {
  const { language, t } = useLanguage()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [pausedRuns, setPausedRuns] = useState<Set<string>>(new Set())
  
  const { data: runs, isLoading } = useQuery({
    queryKey: ["all-test-runs"],
    queryFn: async () => {
      const res = await fetch("/api/test-runs")
      if (!res.ok) throw new Error("Failed to fetch test runs")
      return res.json()
    },
    refetchInterval: 5000, // 5秒ごとに更新
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
      queryClient.invalidateQueries({ queryKey: ["all-test-runs"] })
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: "success",
      failed: "destructive",
      running: "default",
      paused: "warning",
      pending: "secondary",
    }
    return (
      <Badge variant={variants[status] || "outline"}>
        {status === "completed" && (language === 'ja' ? "完了" : "Completed")}
        {status === "failed" && (language === 'ja' ? "失敗" : "Failed")}
        {status === "running" && (language === 'ja' ? "実行中" : "Running")}
        {status === "paused" && (language === 'ja' ? "一時停止" : "Paused")}
        {status === "pending" && (language === 'ja' ? "待機中" : "Pending")}
        {!["completed", "failed", "running", "pending"].includes(status) && status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <AuthFailureAlert />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('testRuns.testExecutionHistory')}</h1>
        <p className="text-gray-600 mt-2">{t('testRuns.allTestExecutions')}</p>
      </div>

      {!runs || runs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Play className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">{t('testRuns.noExecutionHistory')}</p>
            <Button asChild variant="success">
              <Link href="/test-suites">
                {t('testRuns.viewTestSuites')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.map((run: any) => {
            const results = run.results ? JSON.parse(run.results) : null
            const passedTests = results?.tests?.filter((t: any) => t.status === "passed").length || 0
            const totalTests = results?.tests?.length || 0

            return (
              <Card key={run.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <CardTitle className="text-lg">
                          {run.testInfo?.suiteName || run.project?.name || t('testRuns.unknownProject')}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <div className="space-y-1">
                            <div>{t('testRuns.project')}: {run.project?.name}</div>
                            {run.testInfo && (
                              <div>{t('testRuns.testCount')}: {run.testInfo.testCount}{language === 'ja' ? '件' : ' cases'}</div>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(run.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 text-sm">
                      {(run.totalCount > 0 || totalTests > 0) && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">{t('testRuns.testResults')}:</span>
                          <span className={
                            run.successCount === run.totalCount || passedTests === totalTests
                              ? "text-green-600 font-medium" 
                              : "text-orange-600 font-medium"
                          }>
                            {run.successCount || passedTests} / {run.totalCount || totalTests} {t('testRuns.success')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {run.startedAt ? new Date(run.startedAt).toLocaleString(language === 'ja' ? "ja-JP" : "en-US", {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }) : t('testRuns.notExecuted')}
                      </div>
                      {run.completedAt && run.startedAt && (
                        <div className="text-gray-600">
                          {t('testRuns.executionTime')}: {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}{language === 'ja' ? '秒' : 's'}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(run.status === "running" || run.status === "paused") && (
                        <Button 
                          size="sm" 
                          variant={run.status === "paused" || pausedRuns.has(run.id) ? "success" : "destructive"}
                          className={run.status === "paused" || pausedRuns.has(run.id) ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
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
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projects/${run.projectId}/results/${run.id}`}>
                          {t('common.view')} {t('common.details')}
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {run.testInfo?.testCases && run.testInfo.testCases.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">{t('testRuns.executedTestCases')}:</span>
                        <div className="mt-2 space-y-2">
                          {run.testInfo.testCases.slice(0, 3).map((tc: any) => (
                            <div key={tc.id} className="pl-4 border-l-2 border-gray-200">
                              <div className="font-medium text-gray-800 text-sm">
                                {tc.name}
                              </div>
                              {tc.description && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  {tc.description}
                                </div>
                              )}
                            </div>
                          ))}
                          {run.testInfo.testCases.length > 3 && (
                            <div className="text-xs text-gray-500 pl-4">
                              {language === 'ja' ? `他${run.testInfo.testCases.length - 3}件のテストケース` : `${run.testInfo.testCases.length - 3} ${t('testRuns.otherTestCases')}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}