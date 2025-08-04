"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play, Loader2, CheckCircle, FileText, Monitor } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export default function TestSuiteRunPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { language, t } = useLanguage()
  const suiteId = params.id as string
  const [selectedCases, setSelectedCases] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(true)
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set())

  // テストスイートとテストケースを取得
  const { data: suite, isLoading } = useQuery({
    queryKey: ["test-suite", suiteId],
    queryFn: async () => {
      const res = await fetch(`/api/test-suites/${suiteId}`)
      if (!res.ok) throw new Error("Failed to fetch test suite")
      return res.json()
    },
  })

  // テスト実行のミューテーション
  const runMutation = useMutation({
    mutationFn: async () => {
      const testCaseIds = selectAll 
        ? undefined 
        : selectedCases.length > 0 
          ? selectedCases 
          : undefined

      const res = await fetch(`/api/projects/${suite.projectId}/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testSuiteId: suiteId,
          testCaseIds,
          browsers: ["chromium"],
          config: {
            screenshot: "always",
          },
        }),
      })

      if (!res.ok) {
        throw new Error(t('messages.failedToStartTest'))
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast({
        title: t('messages.testExecutionStarted'),
        description: t('messages.redirectingToResults'),
      })
      router.push(`/projects/${suite.projectId}/results/${data.id}`)
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('messages.failedToStartTest'),
        variant: "destructive",
      })
    },
  })

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedCases([])
    }
  }

  const handleSelectCase = (caseId: string, checked: boolean) => {
    setSelectAll(false)
    if (checked) {
      setSelectedCases([...selectedCases, caseId])
    } else {
      setSelectedCases(selectedCases.filter(id => id !== caseId))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!suite) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-gray-500">{t('testRuns.testSuiteNotFound')}</p>
        </div>
      </div>
    )
  }

  const selectedCount = selectAll ? suite.testCases?.length || 0 : selectedCases.length

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button asChild variant="ghost" className="mr-4">
            <Link href="/test-suites">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{t('testRuns.testExecution')}</h1>
            <p className="text-lg text-gray-700 mt-1">{suite.name}</p>
            {suite.description && (
              <p className="text-gray-600 mt-1">{suite.description}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* テストスイート情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {t('testRuns.testSuiteDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">{t('testRuns.project')}</p>
                  <p className="font-medium">{suite.project?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('testRuns.testCaseCount')}</p>
                  <p className="font-medium">{suite.testCases?.length || 0}{language === 'ja' ? '件' : ' cases'}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('testRuns.createdDate')}</p>
                  <p className="font-medium">
                    {new Date(suite.createdAt).toLocaleDateString(language === 'ja' ? "ja-JP" : "en-US")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* テストケース選択 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('testRuns.executeTestCases')}</CardTitle>
                <Badge variant="secondary">
                  {selectedCount}{language === 'ja' ? t('testRuns.selectedCount') : ` ${t('testRuns.selectedCount')}`}
                </Badge>
              </div>
              <CardDescription>
                {t('testRuns.selectTestCases')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-3 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="font-medium">
                    {t('testRuns.executeAllTests')}
                  </Label>
                </div>

                {suite.testCases && suite.testCases.length > 0 ? (
                  <div className="space-y-2">
                    {suite.testCases.map((testCase: any) => {
                      const steps = typeof testCase.steps === 'string' 
                        ? JSON.parse(testCase.steps) 
                        : testCase.steps || []
                      
                      return (
                        <div
                          key={testCase.id}
                          className={`p-3 rounded-lg border ${
                            selectAll || selectedCases.includes(testCase.id)
                              ? "bg-blue-50 border-blue-200"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={testCase.id}
                              checked={selectAll || selectedCases.includes(testCase.id)}
                              onCheckedChange={(checked) => 
                                handleSelectCase(testCase.id, checked as boolean)
                              }
                              disabled={selectAll}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <Label htmlFor={testCase.id} className="font-medium cursor-pointer">
                                    {testCase.name}
                                  </Label>
                                  {testCase.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {testCase.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    {steps.length} {t('testRuns.steps')}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const newExpanded = new Set(expandedCases)
                                    if (newExpanded.has(testCase.id)) {
                                      newExpanded.delete(testCase.id)
                                    } else {
                                      newExpanded.add(testCase.id)
                                    }
                                    setExpandedCases(newExpanded)
                                  }}
                                >
                                  {expandedCases.has(testCase.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              
                              {expandedCases.has(testCase.id) && steps.length > 0 && (
                                <div className="mt-3 pl-4 space-y-2 border-l-2 border-gray-200">
                                  {steps.map((step: any, index: number) => (
                                    <div key={index} className="text-xs space-y-1">
                                      <div className="flex items-start gap-2">
                                        <span className="font-semibold text-gray-700 min-w-[20px]">
                                          {index + 1}.
                                        </span>
                                        <div className="flex-1">
                                          <span className="font-medium text-gray-800">
                                            {step.action}
                                          </span>
                                          {step.selector && (
                                            <div className="text-gray-600 mt-0.5">
                                              {t('testRuns.selector')}: <code className="bg-gray-100 px-1 py-0.5 rounded">{step.selector}</code>
                                            </div>
                                          )}
                                          {step.value && (
                                            <div className="text-gray-600 mt-0.5">
                                              {t('testRuns.value')}: <code className="bg-blue-50 px-1 py-0.5 rounded text-blue-700">{step.value}</code>
                                            </div>
                                          )}
                                          {step.expectedResult && (
                                            <div className="text-gray-500 mt-0.5">
                                              {t('testRuns.expectedResult')}: {step.expectedResult}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('testRuns.noTestCases')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 実行設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="mr-2 h-5 w-5" />
                {t('testRuns.executionSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">{t('testRuns.browser')}</p>
                  <div className="flex items-center space-x-4">
                    <Badge variant="default">Chrome</Badge>
                    <span className="text-xs text-gray-500">
                      {language === 'ja' ? '※' : '*'}{t('testRuns.chromeOnly')}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">{t('testRuns.screenshotMode')}</p>
                  <Badge variant="secondary">{t('testRuns.alwaysTakeScreenshots')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 実行ボタン */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              asChild
            >
              <Link href="/test-suites">
                {t('common.cancel')}
              </Link>
            </Button>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || (!selectAll && selectedCases.length === 0)}
              className="min-w-[150px]"
              variant="success"
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('testRuns.running')}...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {t('testRuns.runTest')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}