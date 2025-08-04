"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, CheckCircle, TestTube, Zap, Play, Clock, Loader2, Pause } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { AuthFailureAlert } from "@/components/ui/auth-failure-alert"

export function HomePage() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [pausedRuns, setPausedRuns] = useState<Set<string>>(new Set())
  
  // Fetch running tests
  const { data: runningTests } = useQuery({
    queryKey: ["running-tests"],
    queryFn: async () => {
      const res = await fetch("/api/test-runs?status=running")
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 5000, // Refresh every 5 seconds
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
      queryClient.invalidateQueries({ queryKey: ["running-tests"] })
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

  const features = language === 'ja' ? [
    {
      icon: TestTube,
      color: "blue",
      title: "簡単なテスト設定",
      description: "直感的なUIでテストシナリオを作成。コーディング不要で複雑なテストも実現可能。"
    },
    {
      icon: CheckCircle,
      color: "green",
      title: "Chrome対応",
      description: "Chromeブラウザでのテスト実行に特化。安定した自動テストを実現。"
    },
    {
      icon: Zap,
      color: "purple",
      title: "リアルタイム結果",
      description: "テスト実行中の進捗をリアルタイムで確認。詳細なレポートとスクリーンショット付き。"
    }
  ] : [
    {
      icon: TestTube,
      color: "blue",
      title: "Easy Test Setup",
      description: "Create test scenarios with intuitive UI. Complex tests possible without coding."
    },
    {
      icon: CheckCircle,
      color: "green",
      title: "Chrome Support",
      description: "Specialized for Chrome browser testing. Achieve stable automated tests."
    },
    {
      icon: Zap,
      color: "purple",
      title: "Real-time Results",
      description: "Monitor test execution progress in real-time. Detailed reports with screenshots."
    }
  ]

  const mainFeatures = language === 'ja' ? [
    "認証付きページのテスト対応",
    "スクリーンショット自動撮影",
    "UIレビュー機能",
    "テスト結果のレポート生成",
    "MCP統合による拡張性"
  ] : [
    "Authentication page testing support",
    "Automatic screenshot capture",
    "UI review functionality",
    "Test result report generation",
    "Extensibility through MCP integration"
  ]

  return (
    <div className="min-h-screen">
      <AuthFailureAlert />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Web Test Forge</h1>
          <p className="text-xl text-gray-600 mb-8">
            {t('dashboard.subtitle')}
          </p>
          <Button asChild size="lg">
            <Link href="/projects">
              {t('dashboard.getStarted')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Running Tests Section */}
        {runningTests && runningTests.length > 0 && (
          <Card className="mb-8 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
                {language === 'ja' ? '実行中のテスト' : 'Running Tests'}
              </CardTitle>
              <CardDescription>
                {language === 'ja' 
                  ? `${runningTests.length}件のテストが実行中です` 
                  : `${runningTests.length} test(s) currently running`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {runningTests.slice(0, 3).map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <Play className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="font-medium text-sm">
                          {test.project?.name || (language === 'ja' ? '不明なプロジェクト' : 'Unknown Project')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {test.testInfo?.suiteName || (language === 'ja' ? 'テストスイート' : 'Test Suite')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-blue-50">
                        {test.testInfo?.testCount || 0} {language === 'ja' ? 'テスト' : 'tests'}
                      </Badge>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {test.startedAt && (
                          <>
                            {Math.floor((Date.now() - new Date(test.startedAt).getTime()) / 1000)}
                            {language === 'ja' ? '秒' : 's'}
                          </>
                        )}
                      </div>
                      {(test.status === "running" || test.status === "paused") && (
                        <Button 
                          size="sm" 
                          variant={test.status === "paused" || pausedRuns.has(test.id) ? "success" : "outline"}
                          onClick={() => pauseResumeMutation.mutate({ 
                            runId: test.id, 
                            action: (test.status === "paused" || pausedRuns.has(test.id)) ? 'resume' : 'pause' 
                          })}
                          disabled={pauseResumeMutation.isPending}
                        >
                          {pauseResumeMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (test.status === "paused" || pausedRuns.has(test.id)) ? (
                            <Play className="h-3 w-3" />
                          ) : (
                            <Pause className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projects/${test.projectId}/results/${test.id}`}>
                          {language === 'ja' ? '詳細' : 'Details'}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {runningTests.length > 3 && (
                  <div className="text-center">
                    <Button asChild variant="link" size="sm">
                      <Link href="/test-runs">
                        {language === 'ja' 
                          ? `他${runningTests.length - 3}件のテストを表示` 
                          : `View ${runningTests.length - 3} more test(s)`}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const colorClasses = {
              blue: "bg-blue-100 text-blue-600",
              green: "bg-green-100 text-green-600",
              purple: "bg-purple-100 text-purple-600"
            }
            const bgColor = colorClasses[feature.color as keyof typeof colorClasses]

            return (
              <Card key={index}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${bgColor.split(' ')[0]}`}>
                    <Icon className={`h-6 w-6 ${bgColor.split(' ')[1]}`} />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-4">
            {language === 'ja' ? '主な機能' : 'Main Features'}
          </h2>
          <div className="max-w-2xl mx-auto text-left">
            <ul className="space-y-3">
              {mainFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}