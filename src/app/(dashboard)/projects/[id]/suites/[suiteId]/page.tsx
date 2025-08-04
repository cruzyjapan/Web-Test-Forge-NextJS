"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Code, Edit, Loader2, Play, Plus, Save, Trash2, CheckSquare, CheckCircle, XCircle, Clock, AlertCircle, SkipForward } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SpecImportModal } from "@/components/features/spec-import-modal";
import { TestCaseDetailModal } from "@/components/features/test-case-detail-modal";
import { TestCaseEditModal } from "@/components/features/test-case-edit-modal";
import { useLanguage } from "@/contexts/language-context";

interface TestStep {
  action: string;
  selector?: string;
  value?: string;
  expectedResult?: string;
}

interface TestCase {
  id: string;
  name: string;
  description?: string;
  steps: TestStep[];
  config?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SuiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const projectId = params.id as string;
  const suiteId = params.suiteId as string;

  const [editMode, setEditMode] = useState(false);
  const [suiteName, setSuiteName] = useState("");
  const [showNewTestCase, setShowNewTestCase] = useState(false);
  const [newTestCase, setNewTestCase] = useState({
    name: "",
    description: "",
    steps: [{ action: "navigate", selector: "", value: "", expectedResult: "" }],
  });
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [testCaseStatuses, setTestCaseStatuses] = useState<Record<string, any>>({});

  const { data: suite, isLoading } = useQuery({
    queryKey: ["suite", suiteId],
    queryFn: async () => {
      const res = await fetch(`/api/suites/${suiteId}`);
      if (!res.ok) throw new Error("Failed to fetch suite");
      return res.json();
    },
  });

  // Fetch test case execution statuses
  useEffect(() => {
    if (suite?.testCases && suite.testCases.length > 0) {
      const fetchStatuses = async () => {
        try {
          const res = await fetch("/api/test-cases/status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              testCaseIds: suite.testCases.map((tc: TestCase) => tc.id),
            }),
          });
          if (res.ok) {
            const statuses = await res.json();
            setTestCaseStatuses(statuses);
          }
        } catch (error) {
          console.error("Failed to fetch test case statuses:", error);
        }
      };
      fetchStatuses();
      // Refresh statuses every 30 seconds
      const interval = setInterval(fetchStatuses, 30000);
      return () => clearInterval(interval);
    }
  }, [suite?.testCases]);

  // スイート名を初期化
  useState(() => {
    if (suite) {
      setSuiteName(suite.name || "");
    }
  });

  const updateSuiteMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch(`/api/suites/${suiteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "テストスイートの更新に失敗しました");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suite", suiteId] });
      toast({
        title: language === 'ja' ? "成功" : "Success",
        description: language === 'ja' ? "テストスイートを更新しました" : "Test suite updated successfully",
      });
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const createTestCaseMutation = useMutation({
    mutationFn: async (data: typeof newTestCase) => {
      const res = await fetch(`/api/suites/${suiteId}/cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "テストケースの作成に失敗しました");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suite", suiteId] });
      toast({
        title: language === 'ja' ? "成功" : "Success",
        description: language === 'ja' ? "テストケースを作成しました" : "Test case created successfully",
      });
      setShowNewTestCase(false);
      setNewTestCase({
        name: "",
        description: "",
        steps: [{ action: "navigate", selector: "", value: "", expectedResult: "" }],
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTestCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "テストケースの削除に失敗しました");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suite", suiteId] });
      toast({
        title: language === 'ja' ? "成功" : "Success",
        description: language === 'ja' ? "テストケースを削除しました" : "Test case deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveEdit = () => {
    updateSuiteMutation.mutate({ name: suiteName });
  };

  const handleAddStep = () => {
    setNewTestCase({
      ...newTestCase,
      steps: [
        ...newTestCase.steps,
        { action: "click", selector: "", value: "", expectedResult: "" },
      ],
    });
  };

  const handleRemoveStep = (index: number) => {
    setNewTestCase({
      ...newTestCase,
      steps: newTestCase.steps.filter((_, i) => i !== index),
    });
  };

  const handleStepChange = (index: number, field: keyof TestStep, value: string) => {
    const newSteps = [...newTestCase.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setNewTestCase({ ...newTestCase, steps: newSteps });
  };

  const handleCreateTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestCase.name.trim()) {
      toast({
        title: t('common.error'),
        description: language === 'ja' ? "テストケース名を入力してください" : "Please enter a test case name",
        variant: "destructive",
      });
      return;
    }
    createTestCaseMutation.mutate(newTestCase);
  };

  const getStatusIcon = (caseId: string, testCase: TestCase) => {
    // Check if test case is skipped
    let config = {};
    try {
      if (testCase.config) {
        config = typeof testCase.config === 'string' ? JSON.parse(testCase.config) : testCase.config;
      }
    } catch (error) {
      console.error('Error parsing testCase.config:', error, testCase.config);
      config = {};
    }
    
    if (config.skipped) {
      return <SkipForward className="h-4 w-4 text-yellow-500" title={config.skipReason || (language === 'ja' ? 'スキップ' : 'Skipped')} />;
    }
    
    const status = testCaseStatuses[caseId];
    if (!status) {
      return <Clock className="h-4 w-4 text-gray-400" title={language === 'ja' ? "未実行" : "Not executed"} />;
    }
    
    switch (status.status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" title={language === 'ja' ? "成功" : "Success"} />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" title={language === 'ja' ? "失敗" : "Failed"} />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" title={language === 'ja' ? "実行中" : "Running"} />;
      case 'not_executed':
      default:
        return <Clock className="h-4 w-4 text-gray-400" title={language === 'ja' ? "未実行" : "Not executed"} />;
    }
  };

  const getStatusBadge = (caseId: string, testCase: TestCase) => {
    // Check if test case is skipped
    let config = {};
    try {
      if (testCase.config) {
        config = typeof testCase.config === 'string' ? JSON.parse(testCase.config) : testCase.config;
      }
    } catch (error) {
      console.error('Error parsing testCase.config:', error, testCase.config);
      config = {};
    }
    
    if (config.skipped) {
      return (
        <div className="flex items-center gap-1 text-xs text-yellow-600">
          <SkipForward className="h-3 w-3" />
          <span>{language === 'ja' ? 'スキップ' : 'Skipped'}</span>
          {config.skipReason && (
            <span className="text-gray-400 ml-1" title={config.skipReason}>
              ({language === 'ja' ? '理由あり' : 'Reason'})
            </span>
          )}
        </div>
      );
    }
    
    const status = testCaseStatuses[caseId];
    if (!status || status.status === 'not_executed') {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{language === 'ja' ? '未実行' : 'Not Executed'}</span>
        </div>
      );
    }
    
    const statusConfig = {
      success: { icon: CheckCircle, text: language === 'ja' ? '成功' : 'Success', className: 'text-green-600' },
      failed: { icon: XCircle, text: language === 'ja' ? '失敗' : 'Failed', className: 'text-red-600' },
      running: { icon: Loader2, text: language === 'ja' ? '実行中' : 'Running', className: 'text-blue-600 animate-spin' },
    };
    
    const config2 = statusConfig[status.status as keyof typeof statusConfig] || statusConfig.failed;
    const Icon = config2.icon;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${config2.className}`}>
        <Icon className="h-3 w-3" />
        <span>{config2.text}</span>
        {status.lastRunAt && (
          <span className="text-gray-400 ml-1">
            ({new Date(status.lastRunAt).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })})
          </span>
        )}
      </div>
    );
  };

  const handleDeleteTestCase = (caseId: string) => {
    if (confirm(language === 'ja' ? "このテストケースを削除しますか？" : "Are you sure you want to delete this test case?")) {
      deleteTestCaseMutation.mutate(caseId);
    }
  };

  const handleSelectAll = () => {
    if (suite?.testCases) {
      if (selectedCases.size === suite.testCases.length) {
        setSelectedCases(new Set());
      } else {
        setSelectedCases(new Set(suite.testCases.map((tc: TestCase) => tc.id)));
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCases.size === 0) return;
    
    if (confirm(`${selectedCases.size}件のテストケースを削除しますか？`)) {
      selectedCases.forEach(caseId => {
        deleteTestCaseMutation.mutate(caseId);
      });
      setSelectedCases(new Set());
    }
  };

  const toggleCaseSelection = (caseId: string) => {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId);
    } else {
      newSelected.add(caseId);
    }
    setSelectedCases(newSelected);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button asChild variant="ghost" className="mr-4">
              <Link href={`/projects/${projectId}/suites`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center space-x-4">
              {editMode ? (
                <Input
                  value={suiteName}
                  onChange={(e) => setSuiteName(e.target.value)}
                  className="text-3xl font-bold"
                />
              ) : (
                <h1 className="text-3xl font-bold">{suite?.name}</h1>
              )}
              {!editMode && (
                <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {editMode && (
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} disabled={updateSuiteMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {language === 'ja' ? '保存' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  setSuiteName(suite?.name || "");
                }}
              >
                {language === 'ja' ? 'キャンセル' : 'Cancel'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{language === 'ja' ? 'テストケース' : 'Test Cases'}</CardTitle>
                  <CardDescription>{language === 'ja' ? 'このスイートに含まれるテストケース' : 'Test cases included in this suite'}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <SpecImportModal
                    suiteId={suiteId}
                    projectBaseUrl={suite?.project?.baseUrl || ""}
                    projectName={suite?.project?.name || ""}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ["suite", suiteId] })
                    }}
                  />
                  <Button
                    onClick={() => setShowNewTestCase(!showNewTestCase)}
                    variant={showNewTestCase ? "outline" : "default"}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {language === 'ja' ? '新規作成' : 'Create New'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showNewTestCase && (
                <form
                  onSubmit={handleCreateTestCase}
                  className="mb-6 p-4 border rounded-lg bg-gray-50"
                >
                  <h3 className="text-lg font-semibold mb-4">{language === 'ja' ? '新しいテストケース' : 'New Test Case'}</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="testName">{language === 'ja' ? 'テストケース名 *' : 'Test Case Name *'}</Label>
                      <Input
                        id="testName"
                        value={newTestCase.name}
                        onChange={(e) => setNewTestCase({ ...newTestCase, name: e.target.value })}
                        placeholder={language === 'ja' ? '例: ログイン機能のテスト' : 'e.g., Login functionality test'}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="testDescription">{language === 'ja' ? '説明' : 'Description'}</Label>
                      <Textarea
                        id="testDescription"
                        value={newTestCase.description}
                        onChange={(e) =>
                          setNewTestCase({ ...newTestCase, description: e.target.value })
                        }
                        placeholder={language === 'ja' ? 'テストケースの詳細説明' : 'Detailed description of the test case'}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>{language === 'ja' ? 'テストステップ' : 'Test Steps'}</Label>
                      <div className="space-y-2">
                        {newTestCase.steps.map((step, index) => (
                          <div key={index} className="p-3 border rounded bg-white">
                            <div className="grid grid-cols-4 gap-2">
                              <select
                                value={step.action}
                                onChange={(e) => handleStepChange(index, "action", e.target.value)}
                                className="px-2 py-1 border rounded"
                              >
                                <option value="navigate">{language === 'ja' ? 'ページ遷移' : 'Navigate'}</option>
                                <option value="click">{language === 'ja' ? 'クリック' : 'Click'}</option>
                                <option value="type">{language === 'ja' ? '入力' : 'Type'}</option>
                                <option value="wait">{language === 'ja' ? '待機' : 'Wait'}</option>
                                <option value="assert">{language === 'ja' ? '検証' : 'Assert'}</option>
                              </select>
                              <Input
                                placeholder={language === 'ja' ? 'セレクタ' : 'Selector'}
                                value={step.selector}
                                onChange={(e) =>
                                  handleStepChange(index, "selector", e.target.value)
                                }
                              />
                              <Input
                                placeholder={language === 'ja' ? '値' : 'Value'}
                                value={step.value}
                                onChange={(e) => handleStepChange(index, "value", e.target.value)}
                              />
                              <div className="flex gap-1">
                                <Input
                                  placeholder={language === 'ja' ? '期待結果' : 'Expected Result'}
                                  value={step.expectedResult}
                                  onChange={(e) =>
                                    handleStepChange(index, "expectedResult", e.target.value)
                                  }
                                />
                                {newTestCase.steps.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveStep(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddStep}
                        className="mt-2"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {language === 'ja' ? 'ステップを追加' : 'Add Step'}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={createTestCaseMutation.isPending}>
                        {language === 'ja' ? '作成' : 'Create'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewTestCase(false)}
                      >
                        {language === 'ja' ? 'キャンセル' : 'Cancel'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {suite?.testCases && suite.testCases.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedCases.size === suite.testCases.length && suite.testCases.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium">{language === 'ja' ? 'すべて選択' : 'Select All'}</span>
                    </div>
                    {selectedCases.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {language === 'ja' ? `選択した項目を削除 (${selectedCases.size})` : `Delete Selected (${selectedCases.size})`}
                      </Button>
                    )}
                  </div>
                  {suite.testCases.map((testCase: TestCase) => {
                    const status = testCaseStatuses[testCase.id];
                    return (
                      <Card key={testCase.id} className={selectedCases.has(testCase.id) ? 'ring-2 ring-blue-500' : ''}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <Checkbox
                                checked={selectedCases.has(testCase.id)}
                                onCheckedChange={() => toggleCaseSelection(testCase.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex items-center gap-2">
                                {getStatusIcon(testCase.id, testCase)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-base">{testCase.name}</CardTitle>
                                  {getStatusBadge(testCase.id, testCase)}
                                </div>
                                {testCase.description && (
                                  <CardDescription className="mt-1 line-clamp-2">
                                    {testCase.description}
                                  </CardDescription>
                                )}
                                {(() => {
                                  let config = {};
                                  try {
                                    if (testCase.config) {
                                      config = typeof testCase.config === 'string' ? JSON.parse(testCase.config) : testCase.config;
                                    }
                                  } catch (error) {
                                    console.error('Error parsing testCase.config:', error, testCase.config);
                                    config = {};
                                  }
                                  
                                  if (config.skipped && config.skipReason) {
                                    return (
                                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                        <strong>{language === 'ja' ? 'スキップ理由: ' : 'Skip Reason: '}</strong>
                                        {config.skipReason}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const caseWithSuiteId = { ...testCase, suiteId };
                                setEditingTestCase(caseWithSuiteId);
                              }}
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              {language === 'ja' ? '編集' : 'Edit'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedTestCase(testCase);
                              }}
                            >
                              <Code className="mr-1 h-3 w-3" />
                              {language === 'ja' ? '詳細' : 'Details'}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-600">
                                {testCase.steps?.length || 0} {language === 'ja' ? 'ステップ' : 'steps'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {language === 'ja' ? '作成日' : 'Created'}: {new Date(testCase.createdAt).toLocaleString(language === 'ja' ? "ja-JP" : "en-US", {
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
                            {status && status.runId && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <Link href={`/projects/${status.projectId}/results/${status.runId}`}>
                                  最終実行結果
                                </Link>
                              </Button>
                            )}
                            {(() => {
                              let config = {};
                              try {
                                if (testCase.config) {
                                  config = typeof testCase.config === 'string' ? JSON.parse(testCase.config) : testCase.config;
                                }
                              } catch (error) {
                                console.error('Error parsing testCase.config:', error, testCase.config);
                                config = {};
                              }
                              
                              if (config.skipped) {
                                return (
                                  <Button
                                    size="sm"
                                    disabled
                                    variant="outline"
                                  >
                                    <SkipForward className="mr-2 h-4 w-4" />
                                    {language === 'ja' ? 'スキップ済み' : 'Skipped'}
                                  </Button>
                                );
                              }
                              return (
                                <Button
                                  size="sm"
                                  asChild
                                >
                                  <Link href={`/projects/${projectId}/test?suiteId=${suiteId}&caseId=${testCase.id}`}>
                                    <Play className="mr-2 h-4 w-4" />
                                    {language === 'ja' ? 'テストを実行' : 'Run Test'}
                                  </Link>
                                </Button>
                              );
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Code className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">まだテストケースがありません</p>
                  {!showNewTestCase && (
                    <Button onClick={() => setShowNewTestCase(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      最初のテストケースを作成
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* テストケース詳細モーダル */}
      <TestCaseDetailModal
        testCase={selectedTestCase}
        open={!!selectedTestCase}
        onOpenChange={(open) => {
          if (!open) setSelectedTestCase(null);
        }}
      />

      {/* テストケース編集モーダル */}
      <TestCaseEditModal
        testCase={editingTestCase}
        open={!!editingTestCase}
        onOpenChange={(open) => {
          if (!open) setEditingTestCase(null);
        }}
        onSuccess={() => {
          setEditingTestCase(null);
        }}
      />
    </div>
  );
}
