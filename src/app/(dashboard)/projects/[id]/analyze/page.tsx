"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ArrowLeft, 
  Code, 
  FileSearch, 
  Loader2, 
  Download, 
  CheckCircle,
  FileText,
  Globe,
  FormInput,
  Link as LinkIcon,
  Play,
  Rocket
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/contexts/language-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface AnalysisResult {
  routes: Array<{
    path: string
    method: string[]
    file: string
    params?: string[]
  }>
  pages: Array<{
    route: string
    title?: string
    forms: any[]
    links: string[]
    file: string
  }>
  forms: Array<{
    name: string
    action?: string
    method?: string
    elements: any[]
    file: string
  }>
  navigation: string[]
  baseUrl: string
}

export default function AnalyzePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { language } = useLanguage()
  const projectId = params.id as string
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [generatedTests, setGeneratedTests] = useState<Record<string, string>>({})
  const [selectedTabs, setSelectedTabs] = useState<Record<string, boolean>>({
    'page-tests': true,
    'form-tests': true,
    'navigation-tests': true,
    'api-tests': false
  })
  const [screenshotSize, setScreenshotSize] = useState<string>('desktop-1920')

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch project")
      return res.json()
    },
  })

  // Set screenshot size from project settings when project data loads
  useEffect(() => {
    if (project?.screenshotSize) {
      setScreenshotSize(project.screenshotSize)
    }
  }, [project])

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: language,
        }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "解析に失敗しました")
      }
      
      return res.json()
    },
    onSuccess: (data) => {
      setAnalysisResult(data.analysis)
      setGeneratedTests(data.tests)
      toast({
        title: language === 'ja' ? '解析完了' : 'Analysis Complete',
        description: language === 'ja' 
          ? `${data.analysis.routes.length}個のルート、${data.analysis.forms.length}個のフォームを検出しました`
          : `Detected ${data.analysis.routes.length} routes and ${data.analysis.forms.length} forms`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ja' ? 'エラー' : 'Error',
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const registerTestsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/register-complete-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisResult,
          selectedTabs,
          language,
          screenshotSize,
        }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || (language === 'ja' ? 'テストケースの登録に失敗しました' : 'Failed to register test cases'))
      }
      
      return res.json()
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ja' ? '登録完了' : 'Registration Complete',
        description: data.message || (language === 'ja' 
          ? `${data.totalTestCases}個のテストケースを登録しました`
          : `Registered ${data.totalTestCases} test cases`),
      })
      router.push(`/projects/${projectId}/suites/${data.suiteId}`)
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ja' ? 'エラー' : 'Error',
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleAnalyze = () => {
    analyzeMutation.mutate()
  }

  const handleRegisterTests = () => {
    const selectedCount = Object.values(selectedTabs).filter(Boolean).length
    if (selectedCount === 0) {
      toast({
        title: language === 'ja' ? 'エラー' : 'Error',
        description: language === 'ja' ? '少なくとも1つのテストタイプを選択してください' : 'Please select at least one test type',
        variant: "destructive",
      })
      return
    }
    registerTestsMutation.mutate()
  }

  const handleTabSelection = (tabId: string, checked: boolean) => {
    if (tabId === 'api-tests' && checked) {
      // API tabs cannot be selected due to no snapshots
      toast({
        title: language === 'ja' ? '選択不可' : 'Cannot Select',
        description: language === 'ja' 
          ? 'APIテストはスナップショットが取得できないため選択できません'
          : 'API tests cannot be selected as snapshots are not available',
        variant: "destructive",
      })
      return
    }
    
    setSelectedTabs(prev => ({
      ...prev,
      [tabId]: checked
    }))
  }

  const downloadTestCase = (testType: string) => {
    const content = generatedTests[testType]
    if (!content) return

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testType}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Button asChild variant="ghost" className="mr-4">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{language === 'ja' ? 'ソースコード解析' : 'Source Code Analysis'}</h1>
            <p className="text-gray-600">{project?.name}</p>
          </div>
        </div>

        {!analysisResult ? (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? 'プロジェクト解析' : 'Project Analysis'}</CardTitle>
              <CardDescription>
                {language === 'ja' 
                  ? 'Next.jsプロジェクトの構造を解析して、自動的にテストケースを生成します'
                  : 'Analyze Next.js project structure and automatically generate test cases'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center text-yellow-900">
                    <Code className="mr-2 h-5 w-5" />
                    {language === 'ja' ? '対応フレームワーク' : 'Supported Framework'}
                  </h3>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">{language === 'ja' ? 'Next.js (App Router) 専用' : 'Dedicated for Next.js (App Router)'}</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <FileSearch className="mr-2 h-5 w-5" />
                    {language === 'ja' ? '解析対象' : 'Analysis Target'}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <p className="font-medium text-sm mb-1">{language === 'ja' ? '解析するディレクトリ:' : 'Directories to analyze:'}</p>
                      <ul className="space-y-1 text-xs text-gray-600">
                        <li>• <code className="bg-gray-100 px-1 rounded">src/app/</code> - App Router</li>
                        <li>• <code className="bg-gray-100 px-1 rounded">app/</code> - App Router ({language === 'ja' ? 'srcなし' : 'without src'})</li>
                        <li>• <code className="bg-gray-100 px-1 rounded">src/components/</code> - {language === 'ja' ? 'コンポーネント' : 'Components'}</li>
                        <li>• <code className="bg-gray-100 px-1 rounded">components/</code> - {language === 'ja' ? 'コンポーネント' : 'Components'}</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-1">{language === 'ja' ? '解析するファイル形式:' : 'File formats to analyze:'}</p>
                      <ul className="space-y-1 text-xs text-gray-600">
                        <li>• <code className="bg-gray-100 px-1 rounded">.tsx</code> - TypeScript + JSX</li>
                        <li>• <code className="bg-gray-100 px-1 rounded">.ts</code> - TypeScript</li>
                        <li>• <code className="bg-gray-100 px-1 rounded">.jsx</code> - JavaScript + JSX</li>
                        <li>• <code className="bg-gray-100 px-1 rounded">.js</code> - JavaScript</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <FileSearch className="mr-2 h-5 w-5" />
                    {language === 'ja' ? '解析内容' : 'Analysis Content'}
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• <span className="font-medium">page.tsx/layout.tsx</span> - {language === 'ja' ? 'ページルーティング' : 'Page routing'}</li>
                    <li>• <span className="font-medium">route.ts</span> - {language === 'ja' ? 'APIエンドポイント' : 'API endpoints'}</li>
                    <li>• <span className="font-medium">&lt;form&gt;{language === 'ja' ? '要素' : ' elements'}</span> - {language === 'ja' ? 'フォームの検出' : 'Form detection'}</li>
                    <li>• <span className="font-medium">&lt;Link&gt;/&lt;a&gt;{language === 'ja' ? '要素' : ' elements'}</span> - {language === 'ja' ? 'ナビゲーションリンク' : 'Navigation links'}</li>
                    <li>• <span className="font-medium">{language === 'ja' ? '動的ルート' : 'Dynamic routes'}</span> - {language === 'ja' ? '[id], [...slug]などのパラメータ' : 'Parameters like [id], [...slug]'}</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    {language === 'ja' ? '生成されるテストケース' : 'Generated Test Cases'}
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• {language === 'ja' ? 'ページ表示テスト (各ルートの200応答確認)' : 'Page display tests (200 response check for each route)'}</li>
                    <li>• {language === 'ja' ? 'フォーム入力・送信テスト' : 'Form input and submission tests'}</li>
                    <li>• {language === 'ja' ? 'ナビゲーションテスト (リンククリック)' : 'Navigation tests (link clicks)'}</li>
                    <li>• {language === 'ja' ? 'APIエンドポイントテスト (GET/POST)' : 'API endpoint tests (GET/POST)'}</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="w-full"
                  size="lg"
                  variant="info"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {language === 'ja' ? '解析中...' : 'Analyzing...'}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      {language === 'ja' ? '解析を開始' : 'Start Analysis'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{language === 'ja' ? '解析結果' : 'Analysis Results'}</span>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {language === 'ja' ? '完了' : 'Complete'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {language === 'ja' ? 'ソースコードの解析が完了しました' : 'Source code analysis completed'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Globe className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{analysisResult.routes.length}</div>
                    <div className="text-sm text-gray-600">{language === 'ja' ? 'ルート' : 'Routes'}</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <FileText className="mx-auto h-8 w-8 text-green-500 mb-2" />
                    <div className="text-2xl font-bold">{analysisResult.pages.length}</div>
                    <div className="text-sm text-gray-600">{language === 'ja' ? 'ページ' : 'Pages'}</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <FormInput className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                    <div className="text-2xl font-bold">{analysisResult.forms.length}</div>
                    <div className="text-sm text-gray-600">{language === 'ja' ? 'フォーム' : 'Forms'}</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <LinkIcon className="mx-auto h-8 w-8 text-orange-500 mb-2" />
                    <div className="text-2xl font-bold">{analysisResult.navigation.length}</div>
                    <div className="text-sm text-gray-600">{language === 'ja' ? 'リンク' : 'Links'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{language === 'ja' ? 'テストケース登録' : 'Test Case Registration'}</CardTitle>
                    <CardDescription>
                      {language === 'ja' 
                        ? '解析結果からテストケースを生成して登録します'
                        : 'Generate and register test cases from analysis results'
                      }
                    </CardDescription>
                  </div>
                  <Button
                    size="lg"
                    variant="success"
                    onClick={handleRegisterTests}
                    disabled={registerTestsMutation.isPending}
                  >
                    {registerTestsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {language === 'ja' ? '登録中...' : 'Registering...'}
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-5 w-5" />
                        {language === 'ja' ? 'テストケースとして登録' : 'Register as Test Cases'}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{language === 'ja' ? '登録されるテストケース（詳細）' : 'Test Cases to be Registered (Details)'}</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• {language === 'ja' ? 'ホームページ表示テスト（1件）' : 'Homepage display test (1 case)'}</li>
                      <li>• {language === 'ja' ? `各ページ表示テスト（${analysisResult.pages.length} ページ）` : `Page display tests (${analysisResult.pages.length} pages)`}</li>
                      <li>• {language === 'ja' ? `フォームテスト正常系（${analysisResult.forms.length} フォーム）` : `Form tests - normal flow (${analysisResult.forms.length} forms)`}</li>
                      <li>• {language === 'ja' ? `フォームバリデーションテスト（${analysisResult.forms.length} フォーム）` : `Form validation tests (${analysisResult.forms.length} forms)`}</li>
                      <li>• {language === 'ja' ? 'ナビゲーションテスト（全リンク統合: 1件）' : 'Navigation test (all links integrated: 1 case)'}</li>
                      <li>• {language === 'ja' ? 'ボタン要素テスト（1件）' : 'Button element test (1 case)'}</li>
                      <li>• {language === 'ja' ? 'レスポンシブテスト（3種類: Mobile/Tablet/Desktop）' : 'Responsive tests (3 types: Mobile/Tablet/Desktop)'}</li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="font-semibold text-blue-900">
                        {language === 'ja' 
                          ? `選択されたテスト: ${Object.values(selectedTabs).filter(Boolean).length} タイプ`
                          : `Selected tests: ${Object.values(selectedTabs).filter(Boolean).length} types`}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        {language === 'ja' 
                          ? `合計: 約${(() => {
                            let total = 0
                            if (selectedTabs['page-tests']) total += 1 + analysisResult.pages.length
                            if (selectedTabs['form-tests']) total += analysisResult.forms.length * 2
                            if (selectedTabs['navigation-tests']) total += 1
                            return total + 4 // base tests (button + responsive)
                          })()}件のテストケースが生成されます`
                          : `Total: Approximately ${(() => {
                            let total = 0
                            if (selectedTabs['page-tests']) total += 1 + analysisResult.pages.length
                            if (selectedTabs['form-tests']) total += analysisResult.forms.length * 2
                            if (selectedTabs['navigation-tests']) total += 1
                            return total + 4 // base tests (button + responsive)
                          })()} test cases will be generated`
                        }
                      </p>
                    </div>
                  </div>
                </div>
                {generatedTests && Object.keys(generatedTests).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">{language === 'ja' ? 'テストケースプレビュー' : 'Test Case Preview'}</h4>
                    
                    <div className="mb-4 space-y-3">
                      <p className="text-sm text-gray-600">
                        {language === 'ja' 
                          ? '生成するテストケースのタイプを選択してください:'
                          : 'Select test case types to generate:'}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="page-tests"
                            checked={selectedTabs['page-tests']}
                            onCheckedChange={(checked) => handleTabSelection('page-tests', checked as boolean)}
                          />
                          <label htmlFor="page-tests" className="text-sm font-medium cursor-pointer">
                            {language === 'ja' ? 'ページ' : 'Pages'}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="form-tests"
                            checked={selectedTabs['form-tests']}
                            onCheckedChange={(checked) => handleTabSelection('form-tests', checked as boolean)}
                          />
                          <label htmlFor="form-tests" className="text-sm font-medium cursor-pointer">
                            {language === 'ja' ? 'フォーム' : 'Forms'}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="navigation-tests"
                            checked={selectedTabs['navigation-tests']}
                            onCheckedChange={(checked) => handleTabSelection('navigation-tests', checked as boolean)}
                          />
                          <label htmlFor="navigation-tests" className="text-sm font-medium cursor-pointer">
                            {language === 'ja' ? 'ナビゲーション' : 'Navigation'}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2 opacity-50">
                          <Checkbox
                            id="api-tests"
                            checked={false}
                            disabled={true}
                          />
                          <label htmlFor="api-tests" className="text-sm font-medium text-gray-400 cursor-not-allowed">
                            API
                          </label>
                          <span className="text-xs text-red-500">
                            ({language === 'ja' ? 'スナップショット不可' : 'No snapshots'})
                          </span>
                        </div>
                      </div>
                      
                      {/* Screenshot Size Selection */}
                      <div className="mt-4">
                        <Label className="text-sm text-gray-600 mb-2 block">
                          {language === 'ja' ? 'スクリーンショットサイズ' : 'Screenshot Size'}
                        </Label>
                        <Select value={screenshotSize} onValueChange={setScreenshotSize}>
                          <SelectTrigger className="w-full md:w-64">
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
                      </div>
                    </div>
                    
                    <Tabs defaultValue="page-tests">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="page-tests" disabled={!selectedTabs['page-tests']}>
                          {language === 'ja' ? 'ページ' : 'Pages'}
                        </TabsTrigger>
                        <TabsTrigger value="form-tests" disabled={!selectedTabs['form-tests']}>
                          {language === 'ja' ? 'フォーム' : 'Forms'}
                        </TabsTrigger>
                        <TabsTrigger value="navigation-tests" disabled={!selectedTabs['navigation-tests']}>
                          {language === 'ja' ? 'ナビゲーション' : 'Navigation'}
                        </TabsTrigger>
                        <TabsTrigger value="api-tests" disabled={true}>
                          API
                        </TabsTrigger>
                      </TabsList>
                      
                      {Object.entries(generatedTests)
                        .filter(([testType]) => selectedTabs[testType] || testType === 'api-tests')
                        .sort(([aType], [bType]) => {
                          // Custom sorting: Pages (desc), Forms (asc), Navigation (asc)
                          const order = ['page-tests', 'form-tests', 'navigation-tests', 'api-tests']
                          const aIndex = order.indexOf(aType)
                          const bIndex = order.indexOf(bType)
                          
                          if (aType === 'page-tests') {
                            return -1 // Pages first
                          }
                          if (bType === 'page-tests') {
                            return 1
                          }
                          
                          return aIndex - bIndex
                        })
                        .map(([testType, content], index) => {
                          const testNumber = index + 1
                          return (
                            <TabsContent key={testType} value={testType}>
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <Badge variant="outline" className="text-sm">
                                    {language === 'ja' ? `テストケース ${testNumber}` : `Test Case ${testNumber}`}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadTestCase(testType)}
                                    disabled={testType === 'api-tests'}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    {language === 'ja' ? 'ダウンロード' : 'Download'}
                                  </Button>
                                </div>
                                {testType === 'api-tests' ? (
                                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-700 text-sm">
                                      {language === 'ja' 
                                        ? 'APIテストはスナップショットが取得できないため、同バージョンでの比較ができません。'
                                        : 'API tests cannot capture snapshots, so same-version comparison is not available.'}
                                    </p>
                                  </div>
                                ) : (
                                  <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-gray-50">
                                    <pre className="text-xs whitespace-pre-wrap font-mono">
                                      {content}
                                    </pre>
                                  </ScrollArea>
                                )}
                              </div>
                            </TabsContent>
                          )
                        })}
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setAnalysisResult(null)
                  setGeneratedTests({})
                }}
              >
                {language === 'ja' ? '再解析' : 'Re-analyze'}
              </Button>
              <Button asChild>
                <Link href={`/projects/${projectId}/suites`}>
                  {language === 'ja' ? 'テストスイートへ' : 'To Test Suites'}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}