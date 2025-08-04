"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar, TrendingUp, TrendingDown, BarChart, PieChart, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"

export default function ReportsPage() {
  const { t, language } = useLanguage()
  const [selectedPeriod, setSelectedPeriod] = useState("week")
  const [exportLoading, setExportLoading] = useState(false)

  const { data: stats, isLoading } = useQuery({
    queryKey: ["test-statistics", selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/reports/statistics?period=${selectedPeriod}`)
      if (!res.ok) throw new Error("Failed to fetch statistics")
      return res.json()
    },
  })

  const { data: projects } = useQuery({
    queryKey: ["projects-with-runs"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Failed to fetch projects")
      const projectList = await res.json()
      
      // Fetch recent runs for each project
      const projectsWithRuns = await Promise.all(projectList.map(async (project: any) => {
        const runsRes = await fetch(`/api/projects/${project.id}/results?limit=5`)
        const runs = runsRes.ok ? await runsRes.json() : []
        return { ...project, recentRuns: runs }
      }))
      
      return projectsWithRuns
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('common.loading')}...</div>
      </div>
    )
  }

  const handleExportReport = async (projectId?: string) => {
    setExportLoading(true)
    try {
      const endpoint = projectId 
        ? `/api/reports/export?projectId=${projectId}&lang=${language}`
        : `/api/reports/export?period=${selectedPeriod}&lang=${language}`
      
      const res = await fetch(endpoint)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const periodLabel = selectedPeriod === 'day' 
    ? (language === 'ja' ? '24時間' : '24 hours')
    : selectedPeriod === 'week' 
    ? (language === 'ja' ? '7日間' : '7 days')
    : (language === 'ja' ? '30日間' : '30 days')

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
            <p className="text-gray-600 mt-2">{t('reports.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label>{t('reports.period')}:</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t('reports.last24Hours')}</SelectItem>
                <SelectItem value="week">{t('reports.last7Days')}</SelectItem>
                <SelectItem value="month">{t('reports.last30Days')}</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportReport()}
              disabled={exportLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              {exportLoading ? t('common.loading') : t('reports.exportCsv')}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('reports.overview')}</TabsTrigger>
          <TabsTrigger value="project">{t('reports.projectReports')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{language === 'ja' ? '総実行回数' : 'Total Runs'}</CardTitle>
                <BarChart className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalRuns || 0}</div>
                <p className="text-xs text-gray-500 mt-1">{language === 'ja' ? `過去${periodLabel}` : `Last ${periodLabel}`}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{language === 'ja' ? '成功率' : 'Success Rate'}</CardTitle>
                <PieChart className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
                <div className="flex items-center mt-1">
                  {stats?.trend === "up" ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-500">+{stats?.trendDiff || 0}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-xs text-red-500">-{stats?.trendDiff || 0}%</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{language === 'ja' ? '平均実行時間' : 'Avg Duration'}</CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.averageDuration || 0}{language === 'ja' ? '秒' : 's'}</div>
                <p className="text-xs text-gray-500 mt-1">{language === 'ja' ? 'テストあたり' : 'Per test'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{language === 'ja' ? 'テスト数' : 'Tests'}</CardTitle>
                <FileText className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalTests || 0}</div>
                <p className="text-xs text-red-500 mt-1">{stats?.failedTests || 0} {language === 'ja' ? '失敗' : 'failed'}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? '最近のテスト結果' : 'Recent Test Results'}</CardTitle>
              <CardDescription>{language === 'ja' ? '直近10件のテスト実行結果' : 'Last 10 test executions'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentRuns?.length > 0 ? (
                  stats.recentRuns.map((run: any) => {
                    const passedTests = run.results?.tests?.filter((t: any) => t.status === 'passed').length || 0
                    const totalTests = run.results?.tests?.length || 0
                    
                    return (
                      <Link 
                        key={run.id} 
                        href={`/projects/${run.projectId}/results/${run.id}`}
                        className="block hover:no-underline"
                      >
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <div className="flex items-center space-x-3 flex-1">
                            <Badge variant={run.status === 'completed' ? "success" : run.status === 'failed' ? "destructive" : "secondary"}>
                              {run.status === 'completed' ? (language === 'ja' ? "成功" : "Success") : run.status === 'failed' ? (language === 'ja' ? "失敗" : "Failed") : (language === 'ja' ? "実行中" : "Running")}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium">{run.projectName}</p>
                              <p className="text-sm font-medium text-blue-600">
                                {run.suiteName || run.testInfo?.suiteName || (language === 'ja' ? 'テストスイート' : 'Test Suite')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {run.startedAt ? new Date(run.startedAt).toLocaleString(language === 'ja' ? "ja-JP" : "en-US") : (language === 'ja' ? "未実行" : "Not executed")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              {totalTests > 0 && (
                                <>
                                  <p className="font-medium">{passedTests} / {totalTests}</p>
                                  <p className="text-xs text-gray-500">{language === 'ja' ? 'テスト通過' : 'Tests passed'}</p>
                                </>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </Link>
                    )
                  })
                ) : (
                  <p className="text-center text-gray-500 py-4">{language === 'ja' ? 'テスト実行履歴がありません' : 'No test execution history'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="project" className="space-y-6">
          <div className="grid gap-4">
            {projects?.map((project: any) => {
              const totalRuns = project.recentRuns?.length || 0
              const successRuns = project.recentRuns?.filter((r: any) => r.status === 'completed').length || 0
              const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0
              
              return (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription>{project.url}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center mb-6">
                      <div>
                        <p className="text-2xl font-bold">{totalRuns}</p>
                        <p className="text-sm text-gray-500">{language === 'ja' ? '総実行回数' : 'Total Runs'}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{successRate}%</p>
                        <p className="text-sm text-gray-500">{language === 'ja' ? '成功率' : 'Success Rate'}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{project._count?.testSuites || 0}</p>
                        <p className="text-sm text-gray-500">{language === 'ja' ? 'テストスイート' : 'Test Suites'}</p>
                      </div>
                    </div>
                    
                    {project.recentRuns && project.recentRuns.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3">{language === 'ja' ? '最近のテスト実行' : 'Recent Test Runs'}</h4>
                        <div className="space-y-2">
                          {project.recentRuns.slice(0, 3).map((run: any) => (
                            <Link
                              key={run.id}
                              href={`/projects/${project.id}/results/${run.id}`}
                              className="block hover:no-underline"
                            >
                              <div className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <Badge variant={run.status === 'completed' ? "success" : run.status === 'failed' ? "destructive" : "secondary"} className="text-xs">
                                    {run.status === 'completed' ? (language === 'ja' ? "成功" : "Success") : 
                                     run.status === 'failed' ? (language === 'ja' ? "失敗" : "Failed") : 
                                     (language === 'ja' ? "実行中" : "Running")}
                                  </Badge>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {run.suite?.name || (language === 'ja' ? 'テストスイート' : 'Test Suite')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {run.createdAt ? new Date(run.createdAt).toLocaleString(language === 'ja' ? "ja-JP" : "en-US", {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : ''}
                                    </p>
                                  </div>
                                </div>
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}