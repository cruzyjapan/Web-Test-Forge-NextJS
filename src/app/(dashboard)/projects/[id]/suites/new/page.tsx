"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

export default function NewTestSuitePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const projectId = params.id as string;

  const [name, setName] = useState("");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
  });

  const createSuiteMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch(`/api/projects/${projectId}/suites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || (language === 'ja' ? 'テストスイートの作成に失敗しました' : 'Failed to create test suite'));
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: language === 'ja' ? '成功' : 'Success',
        description: language === 'ja' ? 'テストスイートを作成しました' : 'Test suite created successfully',
      });
      router.push(`/projects/${projectId}/suites`);
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ja' ? 'エラー' : 'Error',
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: language === 'ja' ? 'エラー' : 'Error',
        description: language === 'ja' ? 'テストスイート名を入力してください' : 'Please enter a test suite name',
        variant: "destructive",
      });
      return;
    }
    createSuiteMutation.mutate({ name: name.trim() });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button asChild variant="ghost" className="mr-4">
            <Link href={`/projects/${projectId}/suites`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{language === 'ja' ? '新しいテストスイート' : 'New Test Suite'}</h1>
            <p className="text-gray-600 mt-1">{project?.name}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ja' ? 'テストスイート情報' : 'Test Suite Information'}</CardTitle>
            <CardDescription>
              {language === 'ja' 
                ? 'テストケースをグループ化するためのテストスイートを作成します'
                : 'Create a test suite to group test cases'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{language === 'ja' ? 'テストスイート名 *' : 'Test Suite Name *'}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={language === 'ja' ? '例: ユーザー認証テスト' : 'e.g. User Authentication Tests'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={createSuiteMutation.isPending}
                  required
                />
                <p className="text-sm text-gray-500">
                  {language === 'ja' 
                    ? 'テストスイートの目的がわかりやすい名前を付けてください'
                    : 'Please give a descriptive name that clearly indicates the purpose of the test suite'
                  }
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createSuiteMutation.isPending} className="flex-1">
                  {createSuiteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'ja' ? '作成中...' : 'Creating...'}
                    </>
                  ) : (
                    language === 'ja' ? '作成' : 'Create'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}/suites`)}
                  disabled={createSuiteMutation.isPending}
                >
                  {language === 'ja' ? 'キャンセル' : 'Cancel'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
