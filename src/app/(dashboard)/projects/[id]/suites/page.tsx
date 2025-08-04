"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

export default function ProjectSuitesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suiteToDelete, setSuiteToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
  });

  const { data: suites, isLoading: suitesLoading } = useQuery({
    queryKey: ["suites", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/suites`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch suites");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (suiteId: string) => {
      const res = await fetch(`/api/suites/${suiteId}`, {
        method: "DELETE",
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete suite");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suites", projectId] });
      toast.success(language === 'ja' ? "テストスイートを削除しました" : "Test suite deleted successfully");
      setDeleteDialogOpen(false);
      setSuiteToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Delete error:", error);
      toast.error(error.message || (language === 'ja' ? "削除に失敗しました" : "Failed to delete"));
    },
  });

  if (projectLoading || suitesLoading) {
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
              <Link href={`/projects/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{language === 'ja' ? 'テストスイート' : 'Test Suites'}</h1>
              <p className="text-gray-600 mt-1">{project?.name}</p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/projects/${projectId}/suites/new`}>
              <Plus className="mr-2 h-4 w-4" />
              {language === 'ja' ? '新規作成' : 'Create New'}
            </Link>
          </Button>
        </div>

        {suites && suites.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suites.map((suite: any) => (
              <Card key={suite.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      {suite.name}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {language === 'ja' 
                      ? `${suite.testCases?.length || 0} 個のテストケース`
                      : `${suite.testCases?.length || 0} test cases`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">
                      {language === 'ja' ? '作成日: ' : 'Created: '}{new Date(suite.createdAt).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/projects/${projectId}/suites/${suite.id}`}>
                          <Edit className="mr-1 h-3 w-3" />
                          {language === 'ja' ? '編集' : 'Edit'}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSuiteToDelete({ id: suite.id, name: suite.name });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {language === 'ja' ? '削除' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">{language === 'ja' ? 'テストスイートがありません' : 'No Test Suites'}</h3>
              <p className="text-gray-500 mb-4">
                {language === 'ja' 
                  ? '最初のテストスイートを作成してテストケースを管理しましょう'
                  : 'Create your first test suite to manage test cases'
                }
              </p>
              <Button asChild>
                <Link href={`/projects/${projectId}/suites/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  {language === 'ja' ? 'テストスイートを作成' : 'Create Test Suite'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{language === 'ja' ? 'テストスイートを削除しますか？' : 'Delete Test Suite?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {language === 'ja' 
                  ? `「${suiteToDelete?.name}」を削除します。この操作は取り消せません。関連するすべてのテストケースも削除されます。`
                  : `Delete "${suiteToDelete?.name}". This action cannot be undone. All related test cases will also be deleted.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{language === 'ja' ? 'キャンセル' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (suiteToDelete) {
                    deleteMutation.mutate(suiteToDelete.id);
                  }
                }}
              >
                {language === 'ja' ? '削除' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
