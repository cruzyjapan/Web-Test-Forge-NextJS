"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Play, Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight, TestTube, FileText } from "lucide-react"
import Link from "next/link"
import { playTestCompletionSound } from "@/lib/utils/sound"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { language } = useLanguage()
  const projectId = params.id as string
  const suiteId = searchParams.get('suiteId')
  const caseId = searchParams.get('caseId')
  
  const [testConfig, setTestConfig] = useState({
    browsers: ["chromium"] as ("chromium")[],  // Only chromium
    timeout: 30000,
    screenshot: "always" as "always",  // Always take screenshots
    screenshotSize: "desktop-1920",  // Default screenshot size (will be updated from project)
  })
  const [expandedSteps, setExpandedSteps] = useState<{ [key: string]: boolean }>({})

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch project")
      return res.json()
    },
  })

  const { data: testRuns } = useQuery({
    queryKey: ["testRuns", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/runs`)
      if (!res.ok) throw new Error("Failed to fetch test runs")
      return res.json()
    },
  })

  // Fetch test suite if suiteId is provided
  const { data: testSuite } = useQuery({
    queryKey: ["testSuite", suiteId],
    queryFn: async () => {
      if (!suiteId) return null
      const res = await fetch(`/api/test-suites/${suiteId}`)
      if (!res.ok) throw new Error("Failed to fetch test suite")
      return res.json()
    },
    enabled: !!suiteId,
  })

  // Fetch test case if caseId is provided
  const { data: testCase } = useQuery({
    queryKey: ["testCase", caseId],
    queryFn: async () => {
      if (!caseId) return null
      const res = await fetch(`/api/test-cases/${caseId}`)
      if (!res.ok) throw new Error("Failed to fetch test case")
      return res.json()
    },
    enabled: !!caseId,
  })

  // Set screenshot size from project settings when project data loads
  useEffect(() => {
    if (project?.screenshotSize) {
      setTestConfig(prev => ({ ...prev, screenshotSize: project.screenshotSize }))
    }
  }, [project])

  const runTestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testSuiteId: suiteId,
          testCaseIds: caseId ? [caseId] : undefined,
          browsers: testConfig.browsers,
          config: {
            timeout: testConfig.timeout,
            screenshot: testConfig.screenshot,
            screenshotSize: testConfig.screenshotSize,
          },
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || (language === 'ja' ? 'テストの実行に失敗しました' : 'Failed to execute test'))
      }
      return res.json()
    },
    onSuccess: (data) => {
      // テスト成功時に音を鳴らす
      playTestCompletionSound(true)
      toast({
        title: language === 'ja' ? 'テスト完了' : 'Test Completed',
        description: language === 'ja' ? 'テストが正常に完了しました' : 'Test completed successfully',
      })
      router.push(`/projects/${projectId}/results`)
    },
    onError: (error: Error) => {
      // テスト失敗時に音を鳴らす
      playTestCompletionSound(false)
      toast({
        title: language === 'ja' ? 'テスト失敗' : 'Test Failed',
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Toggle step expansion
  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button asChild variant="ghost" className="mr-4">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{language === 'ja' ? 'テスト実行' : 'Test Execution'}</h1>
            <p className="text-gray-600">{project?.name}</p>
          </div>
        </div>

        {/* Display test case details if available */}
        {testCase && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    {testCase.name}
                  </CardTitle>
                  {testCase.description && (
                    <CardDescription className="mt-2">
                      {testCase.description}
                    </CardDescription>
                  )}
                  {testSuite && (
                    <p className="text-sm text-gray-600">
                      {language === 'ja' ? 'テストスイート: ' : 'Test Suite: '}{testSuite.name}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {testCase.steps && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{language === 'ja' ? '実行予定のテストステップ' : 'Test Steps to Execute'}</h4>
                    <span className="text-xs text-gray-500">
                      {JSON.parse(testCase.steps).length}{language === 'ja' ? 'ステップ' : ' steps'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {JSON.parse(testCase.steps).map((step: any, index: number) => {
                      const stepId = `step-${index}`
                      const isExpanded = expandedSteps[stepId]
                      return (
                        <div
                          key={index}
                          className="border rounded-lg overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleStepExpansion(stepId)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-start justify-between text-left"
                          >
                            <div className="flex items-start space-x-3 flex-1">
                              <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {step.action === 'navigate' || step.action === 'goto' ? (language === 'ja' ? '📍 ページ遷移' : '📍 Navigate') :
                                   step.action === 'click' ? (language === 'ja' ? '🖱️ クリック' : '🖱️ Click') :
                                   step.action === 'fill' || step.action === 'type' || step.action === 'input' ? (language === 'ja' ? '⌨️ 入力' : '⌨️ Input') :
                                   step.action === 'select' ? (language === 'ja' ? '📝 選択' : '📝 Select') :
                                   step.action === 'wait' ? (language === 'ja' ? '⏱️ 待機' : '⏱️ Wait') :
                                   step.action === 'assert' || step.action === 'verify' ? (language === 'ja' ? '✅ 検証' : '✅ Verify') :
                                   step.action === 'screenshot' ? (language === 'ja' ? '📸 スクリーンショット' : '📸 Screenshot') :
                                   step.action}
                                </p>
                                {step.value && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {step.action === 'navigate' || step.action === 'goto' ? 
                                      `URL: ${step.value}` : 
                                      step.action === 'wait' ? 
                                      `${step.value}ms` :
                                      step.value
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-4 py-3 bg-white border-t">
                              <dl className="space-y-2 text-sm">
                                <div>
                                  <dt className="font-medium text-gray-700">{language === 'ja' ? 'アクション:' : 'Action:'}</dt>
                                  <dd className="text-gray-900 mt-0.5">{step.action}</dd>
                                </div>
                                {step.selector && (
                                  <div>
                                    <dt className="font-medium text-gray-700">{language === 'ja' ? 'セレクタ:' : 'Selector:'}</dt>
                                    <dd className="text-gray-900 mt-0.5">
                                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                        {step.selector}
                                      </code>
                                    </dd>
                                  </div>
                                )}
                                {step.value && (
                                  <div>
                                    <dt className="font-medium text-gray-700">
                                      {step.action === 'navigate' || step.action === 'goto' ? 'URL' :
                                       step.action === 'wait' ? (language === 'ja' ? '待機時間' : 'Wait time') :
                                       (language === 'ja' ? '値' : 'Value')}:
                                    </dt>
                                    <dd className="text-gray-900 mt-0.5">
                                      <code className="bg-blue-50 px-2 py-1 rounded text-xs text-blue-700">
                                        {step.value}{step.action === 'wait' ? 'ms' : ''}
                                      </code>
                                    </dd>
                                  </div>
                                )}
                                {step.expectedResult && (
                                  <div>
                                    <dt className="font-medium text-gray-700">{language === 'ja' ? '期待結果:' : 'Expected Result:'}</dt>
                                    <dd className="text-gray-900 mt-0.5">{step.expectedResult}</dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? 'テスト設定' : 'Test Configuration'}</CardTitle>
              <CardDescription>
                {testCase ? (language === 'ja' ? `「${testCase.name}」のテスト実行設定` : `Test execution settings for "${testCase.name}"`) : (language === 'ja' ? 'テスト実行時の設定を行います' : 'Configure test execution settings')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ja' ? '対象URL' : 'Target URL'}</Label>
                <Input
                  value={project?.baseUrl}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ja' ? 'テストブラウザ' : 'Test Browser'}</Label>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    <span className="font-medium">Google Chrome</span>
                    <span className="text-sm text-gray-500">(Chromium)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">{language === 'ja' ? 'タイムアウト (ミリ秒)' : 'Timeout (milliseconds)'}</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={testConfig.timeout}
                  onChange={(e) =>
                    setTestConfig({
                      ...testConfig,
                      timeout: parseInt(e.target.value) || 30000,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ja' ? 'スクリーンショット' : 'Screenshots'}</Label>
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-900">
                      {language === 'ja' ? 'テスト実行時に自動でスクリーンショットを撮影します' : 'Automatically captures screenshots during test execution'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="screenshotSize">{language === 'ja' ? 'スクリーンショットサイズ' : 'Screenshot Size'}</Label>
                <Select value={testConfig.screenshotSize} onValueChange={(value) => setTestConfig({ ...testConfig, screenshotSize: value })}>
                  <SelectTrigger id="screenshotSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* iPhone Series */}
                    <SelectItem value="mobile-iphone12-mini">
                      iPhone 12 mini (375×812)
                    </SelectItem>
                    <SelectItem value="mobile-iphone12">
                      iPhone 12/13 (390×844)
                    </SelectItem>
                    <SelectItem value="mobile-iphone14">
                      iPhone 14 (390×844)
                    </SelectItem>
                    <SelectItem value="mobile-iphone14pro">
                      iPhone 14 Pro (393×852)
                    </SelectItem>
                    <SelectItem value="mobile-iphone14plus">
                      iPhone 14 Plus (428×926)
                    </SelectItem>
                    <SelectItem value="mobile-iphone15">
                      iPhone 15 (393×852)
                    </SelectItem>
                    <SelectItem value="mobile-iphone15pro">
                      iPhone 15 Pro (393×852)
                    </SelectItem>
                    <SelectItem value="mobile-iphone15promax">
                      iPhone 15 Pro Max (430×932)
                    </SelectItem>
                    <SelectItem value="mobile-iphone16">
                      iPhone 16 (402×874)
                    </SelectItem>
                    <SelectItem value="mobile-iphone16pro">
                      iPhone 16 Pro (402×874)
                    </SelectItem>
                    <SelectItem value="mobile-iphone16promax">
                      iPhone 16 Pro Max (440×956)
                    </SelectItem>
                    {/* Android Series */}
                    <SelectItem value="mobile-galaxys20">
                      Galaxy S20 (360×800)
                    </SelectItem>
                    <SelectItem value="mobile-galaxys21">
                      Galaxy S21 (384×854)
                    </SelectItem>
                    <SelectItem value="mobile-galaxys22">
                      Galaxy S22 (360×780)
                    </SelectItem>
                    <SelectItem value="mobile-galaxys23">
                      Galaxy S23 (360×780)
                    </SelectItem>
                    <SelectItem value="mobile-galaxys24">
                      Galaxy S24 (384×832)
                    </SelectItem>
                    <SelectItem value="mobile-pixel6">
                      Pixel 6 (412×915)
                    </SelectItem>
                    <SelectItem value="mobile-pixel7">
                      Pixel 7 (412×915)
                    </SelectItem>
                    <SelectItem value="mobile-pixel8">
                      Pixel 8 (412×915)
                    </SelectItem>
                    <SelectItem value="mobile-pixel8pro">
                      Pixel 8 Pro (448×992)
                    </SelectItem>
                    {/* iPad Series */}
                    <SelectItem value="tablet-ipad-mini">
                      iPad mini 6 (744×1133)
                    </SelectItem>
                    <SelectItem value="tablet-ipad">
                      iPad 10th (820×1180)
                    </SelectItem>
                    <SelectItem value="tablet-ipad-air">
                      iPad Air 5 (820×1180)
                    </SelectItem>
                    <SelectItem value="tablet-ipadpro11">
                      iPad Pro 11" (834×1194)
                    </SelectItem>
                    <SelectItem value="tablet-ipadpro12">
                      iPad Pro 12.9" (1024×1366)
                    </SelectItem>
                    {/* Android Tablets */}
                    <SelectItem value="tablet-galaxy-tab-s8">
                      Galaxy Tab S8 (753×1205)
                    </SelectItem>
                    <SelectItem value="tablet-galaxy-tab-s9">
                      Galaxy Tab S9 (753×1205)
                    </SelectItem>
                    {/* Desktop Sizes */}
                    <SelectItem value="desktop-1280">
                      Desktop HD Ready (1280×720)
                    </SelectItem>
                    <SelectItem value="desktop-1366">
                      Desktop HD (1366×768)
                    </SelectItem>
                    <SelectItem value="desktop-1440">
                      Desktop HD+ (1440×900)
                    </SelectItem>
                    <SelectItem value="desktop-1920">
                      Desktop Full HD (1920×1080)
                    </SelectItem>
                    <SelectItem value="desktop-2560">
                      Desktop 2K (2560×1440)
                    </SelectItem>
                    <SelectItem value="desktop-3840">
                      Desktop 4K (3840×2160)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {language === 'ja' 
                    ? 'テスト実行時のブラウザのビューポートサイズを設定します' 
                    : 'Sets the browser viewport size during test execution'}
                </p>
              </div>

              <Button
                onClick={() => runTestMutation.mutate()}
                disabled={runTestMutation.isPending}
                className="w-full"
              >
                {runTestMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === 'ja' ? 'テスト実行中...' : 'Running test...'}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {testCase ? (language === 'ja' ? `「${testCase.name}」を実行` : `Run "${testCase.name}"`) : (language === 'ja' ? 'テストを実行' : 'Run Test')}
                  </>
                )}
              </Button>

              {runTestMutation.isError && (
                <div className="text-red-500 text-sm">
                  {runTestMutation.error.message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? '最近のテスト実行' : 'Recent Test Runs'}</CardTitle>
              <CardDescription>
                {language === 'ja' ? '過去のテスト実行履歴' : 'Past test execution history'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testRuns && testRuns.length > 0 ? (
                <div className="space-y-3">
                  {testRuns.slice(0, 5).map((run: any) => {
                    // Parse test results to get test case names
                    let testCaseNames: string[] = [];
                    try {
                      if (run.testCaseInfo && run.testCaseInfo.testCases) {
                        testCaseNames = run.testCaseInfo.testCases;
                      } else if (run.results) {
                        const results = typeof run.results === 'string' ? JSON.parse(run.results) : run.results;
                        if (Array.isArray(results)) {
                          testCaseNames = results
                            .filter((r: any) => r.testCaseName)
                            .map((r: any) => r.testCaseName);
                        }
                      }
                    } catch (e) {
                      // Failed to parse results
                    }

                    return (
                      <div
                        key={run.id}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-start space-x-3 flex-1">
                          {run.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : run.status === "failed" ? (
                            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                          ) : (
                            <Loader2 className="h-5 w-5 animate-spin text-blue-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {run.status === "completed"
                                  ? (language === 'ja' ? '成功' : 'Success')
                                  : run.status === "failed"
                                  ? (language === 'ja' ? '失敗' : 'Failed')
                                  : (language === 'ja' ? '実行中' : 'Running')}
                              </p>
                              {run.suite && (
                                <span className="text-xs text-gray-600">
                                  {run.suite.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(run.createdAt).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {testCaseNames.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700">{language === 'ja' ? '実行テストケース:' : 'Executed Test Cases:'}</p>
                                <div className="mt-1 space-y-1">
                                  {testCaseNames.slice(0, 2).map((name, idx) => (
                                    <p key={idx} className="text-xs text-gray-600 pl-2 border-l-2 border-gray-200">
                                      • {name}
                                    </p>
                                  ))}
                                  {testCaseNames.length > 2 && (
                                    <p className="text-xs text-gray-500 pl-2">
                                      {language === 'ja' ? `他${testCaseNames.length - 2}件` : `+${testCaseNames.length - 2} more`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/projects/${projectId}/results/${run.id}`}>
                            {language === 'ja' ? '詳細' : 'Details'}
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {language === 'ja' ? 'まだテストが実行されていません' : 'No tests have been executed yet'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}