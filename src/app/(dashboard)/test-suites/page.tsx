"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TestTube, FolderOpen, Clock, CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/utils/date"
import { useLanguage } from "@/contexts/language-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function TestSuitesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { language, t } = useLanguage()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const { data: suites, isLoading } = useQuery({
    queryKey: ["all-test-suites"],
    queryFn: async () => {
      const res = await fetch("/api/test-suites")
      if (!res.ok) throw new Error("Failed to fetch test suites")
      return res.json()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (suiteId: string) => {
      const res = await fetch(`/api/test-suites/${suiteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete test suite")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-test-suites"] })
      toast({
        title: language === 'ja' ? '削除完了' : 'Deleted Successfully',
        description: language === 'ja' ? 'テストスイートを削除しました' : 'Test suite has been deleted',
      })
      setDeleteConfirmId(null)
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: language === 'ja' ? 'テストスイートの削除に失敗しました' : 'Failed to delete test suite',
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('common.loading')}...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('common.testSuites')}</h1>
        <p className="text-gray-600 mt-2">{language === 'ja' ? 'すべてのプロジェクトのテストスイート一覧' : 'All test suites across projects'}</p>
      </div>

      {!suites || suites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TestTube className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">{language === 'ja' ? 'テストスイートがまだありません' : 'No test suites yet'}</p>
            <Button asChild variant="success">
              <Link href="/projects">
                {language === 'ja' ? 'プロジェクトを作成' : 'Create Project'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suites.map((suite: any) => (
            <Card key={suite.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <TestTube className="h-5 w-5 text-blue-500 mt-1" />
                    <div>
                      <CardTitle className="text-lg">{suite.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <span className="font-medium text-blue-600">{suite.project?.name}</span>
                        {suite.description && ` - ${suite.description}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {suite._count?.testCases || 0} {language === 'ja' ? 'テストケース' : 'test cases'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <FolderOpen className="h-4 w-4 mr-1" />
                      {suite.project?.name || (language === 'ja' ? '不明なプロジェクト' : 'Unknown project')}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDateTime(suite.createdAt)}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/projects/${suite.projectId}/suites/${suite.id}`}>
                        {language === 'ja' ? '詳細を見る' : 'View Details'}
                      </Link>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => setDeleteConfirmId(suite.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ja' ? 'テストスイートを削除しますか？' : 'Delete Test Suite?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ja' 
                ? 'この操作により、テストスイートとそれに含まれるすべてのテストケースが削除されます。この操作は取り消すことができません。'
                : 'This will delete the test suite and all test cases it contains. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate(deleteConfirmId)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'ja' ? '削除中...' : 'Deleting...'}
                </>
              ) : (
                language === 'ja' ? '削除する' : 'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}