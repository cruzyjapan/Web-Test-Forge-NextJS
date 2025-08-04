"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Play, Settings, FileText, Loader2, FileSearch } from "lucide-react"
import { formatDateTime } from "@/lib/utils/date"
import { useLanguage } from "@/contexts/language-context"

export default function ProjectDetailPage() {
  const params = useParams()
  const { language } = useLanguage()
  const projectId = params.id as string

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch project")
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-gray-500">{language === 'ja' ? 'プロジェクトが見つかりません' : 'Project not found'}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/projects">{language === 'ja' ? 'プロジェクト一覧へ戻る' : 'Back to Projects'}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Button asChild variant="ghost" className="mr-4">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                {language === 'ja' ? 'プロジェクト情報' : 'Project Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">{language === 'ja' ? 'ベースURL' : 'Base URL'}</p>
                <p className="font-medium">{project.baseUrl}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{language === 'ja' ? '作成日' : 'Created'}</p>
                <p className="font-medium">
                  {formatDateTime(project.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{language === 'ja' ? '最終更新' : 'Last Updated'}</p>
                <p className="font-medium">
                  {formatDateTime(project.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {language === 'ja' ? 'テストスイート' : 'Test Suites'}
              </CardTitle>
              <CardDescription>
                {language === 'ja' ? 'テストケースのグループ' : 'Groups of test cases'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">
                  {project.testSuites?.length || 0}
                </p>
                <p className="text-sm text-gray-500">{language === 'ja' ? '個のテストスイート' : 'test suites'}</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/projects/${projectId}/suites`}>
                    {language === 'ja' ? '管理' : 'Manage'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Play className="mr-2 h-5 w-5" />
                {language === 'ja' ? '最新のテスト実行' : 'Latest Test Run'}
              </CardTitle>
              <CardDescription>
                {language === 'ja' ? '直近の実行結果' : 'Recent execution results'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.testRuns && project.testRuns.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    {language === 'ja' ? 'ステータス: ' : 'Status: '}
                    <span
                      className={`font-medium ${
                        project.testRuns[0].status === "completed"
                          ? "text-green-600"
                          : project.testRuns[0].status === "failed"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {project.testRuns[0].status === "completed"
                        ? (language === 'ja' ? '成功' : 'Success')
                        : project.testRuns[0].status === "failed"
                        ? (language === 'ja' ? '失敗' : 'Failed')
                        : (language === 'ja' ? '実行中' : 'Running')}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(project.testRuns[0].createdAt)}
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/projects/${projectId}/results`}>
                      {language === 'ja' ? '結果を見る' : 'View Results'}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-2">
                    {language === 'ja' ? 'まだテストが実行されていません' : 'No tests have been run yet'}
                  </p>
                  <Button size="sm" asChild>
                    <Link href={`/projects/${projectId}/test`}>
                      {language === 'ja' ? '最初のテストを実行' : 'Run First Test'}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? 'クイックアクション' : 'Quick Actions'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/projects/${projectId}/suites`}>
                  <FileText className="mr-2 h-4 w-4" />
                  {language === 'ja' ? 'テストスイート一覧' : 'Test Suites List'}
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/projects/${projectId}/suites/new`}>
                  {language === 'ja' ? 'テストスイートを作成' : 'Create Test Suite'}
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/projects/${projectId}/analyze`}>
                  <FileSearch className="mr-2 h-4 w-4" />
                  {language === 'ja' ? 'ソースコード解析' : 'Source Code Analysis'}
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/projects/${projectId}/settings`}>
                  {language === 'ja' ? 'プロジェクト設定' : 'Project Settings'}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? '統計情報' : 'Statistics'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">
                    {project.testRuns?.length || 0}
                  </p>
                  <p className="text-sm text-gray-500">{language === 'ja' ? '総実行回数' : 'Total Runs'}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {project.testRuns?.filter((r: any) => r.status === "completed").length || 0}
                  </p>
                  <p className="text-sm text-gray-500">{language === 'ja' ? '成功回数' : 'Success Runs'}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {project.testSuites?.length || 0}
                  </p>
                  <p className="text-sm text-gray-500">{language === 'ja' ? 'テストスイート' : 'Test Suites'}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {project.testRuns?.length > 0
                      ? Math.round(
                          (project.testRuns.filter((r: any) => r.status === "completed").length /
                            project.testRuns.length) *
                            100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-sm text-gray-500">{language === 'ja' ? '成功率' : 'Success Rate'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}