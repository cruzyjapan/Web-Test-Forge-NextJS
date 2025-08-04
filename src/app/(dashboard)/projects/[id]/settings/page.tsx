"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, Trash2, Lock, Eye, EyeOff, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { fetchWithAuth, putWithAuth, deleteWithAuth } from "@/lib/utils/fetch";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const projectId = params.id as string;

  const { data: project, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(language === 'ja' ? "プロジェクトが見つかりません" : "Project not found");
        }
        throw new Error(language === 'ja' ? "プロジェクトの取得に失敗しました" : "Failed to fetch project");
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    baseUrl: "",
    sourcePath: "",
    requiresAuth: false,
    authEmail: "",
    authPassword: "",
    loginUrl: "",
    screenshotSize: "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // フォームデータを更新
  useEffect(() => {
    if (project && project.id) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        baseUrl: project.baseUrl || "",
        sourcePath: project.sourcePath || "",
        requiresAuth: project.requiresAuth === true || project.requiresAuth === 1,
        authEmail: project.authEmail || "",
        authPassword: project.authPassword || "",
        loginUrl: project.loginUrl || "",
        screenshotSize: project.screenshotSize || "desktop-1920",
      });
    }
  }, [project?.id]); // projectのIDが変わった時だけ更新

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      const res = await putWithAuth(`/api/projects/${projectId}`, data);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "プロジェクトの更新に失敗しました");
      }

      return res.json();
    },
    onSuccess: async () => {
      // Refetch the project data to ensure consistency
      await refetch();
      
      toast({
        title: language === 'ja' ? "成功" : "Success",
        description: language === 'ja' ? "プロジェクトを更新しました" : "Project updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Update mutation error:", error);
      toast({
        title: language === 'ja' ? "エラー" : "Error",
        description: error.message || (language === 'ja' ? "プロジェクトの更新に失敗しました" : "Failed to update project"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteWithAuth(`/api/projects/${projectId}`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "プロジェクトの削除に失敗しました");
      }

      return res.json();
    },
    onSuccess: () => {
      // プロジェクト一覧のキャッシュをクリア
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: language === 'ja' ? "成功" : "Success",
        description: language === 'ja' ? "プロジェクトを削除しました" : "Project deleted successfully",
      });
      router.push("/projects");
    },
    onError: (error: Error) => {
      console.error("Update mutation error:", error);
      toast({
        title: language === 'ja' ? "エラー" : "Error",
        description: error.message || (language === 'ja' ? "プロジェクトの更新に失敗しました" : "Failed to update project"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.baseUrl) {
      toast({
        title: language === 'ja' ? "エラー" : "Error",
        description: language === 'ja' ? "必須項目を入力してください" : "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Only include fields that have values or have been explicitly set
    const updateData: any = {
      name: formData.name,
      baseUrl: formData.baseUrl,
      screenshotSize: formData.screenshotSize || "desktop-1920",
      requiresAuth: formData.requiresAuth,
    };
    
    // Add optional fields (empty strings should be sent as empty)
    updateData.description = formData.description || "";
    updateData.sourcePath = formData.sourcePath || "";
    
    // Always send auth fields, but as empty strings if not enabled
    if (formData.requiresAuth) {
      updateData.authEmail = formData.authEmail || "";
      updateData.authPassword = formData.authPassword || "";
      updateData.loginUrl = formData.loginUrl || "";
    } else {
      updateData.authEmail = "";
      updateData.authPassword = "";
      updateData.loginUrl = "";
    }
    
    // 基本情報と認証設定を一緒に保存
    updateMutation.mutate(updateData);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (queryError) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">
                {language === 'ja' ? 'エラー' : 'Error'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{queryError.message}</p>
              <Button asChild variant="outline">
                <Link href="/projects">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {language === 'ja' ? 'プロジェクト一覧に戻る' : 'Back to Projects'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-yellow-600">
                {language === 'ja' ? '注意' : 'Warning'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                {language === 'ja' 
                  ? 'プロジェクトが見つかりません。URLを確認してください。' 
                  : 'Project not found. Please check the URL.'}
              </p>
              <Button asChild variant="outline">
                <Link href="/projects">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {language === 'ja' ? 'プロジェクト一覧に戻る' : 'Back to Projects'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
            <h1 className="text-3xl font-bold">プロジェクト設定</h1>
            <p className="text-gray-600">{project?.name}</p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>プロジェクトの基本的な情報を管理します</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">プロジェクト名 *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="プロジェクトの概要を入力してください"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseUrl">ベースURL *</Label>
                  <Input
                    id="baseUrl"
                    type="url"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="https://example.com"
                    required
                  />
                  <p className="text-sm text-gray-500">テスト実行時のベースとなるURLを設定します</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourcePath">
                    <FolderOpen className="inline h-4 w-4 mr-1" />
                    {language === 'ja' ? 'ソースコードディレクトリ' : 'Source Code Directory'}
                  </Label>
                  <Input
                    id="sourcePath"
                    type="text"
                    value={formData.sourcePath}
                    onChange={(e) => setFormData({ ...formData, sourcePath: e.target.value })}
                    placeholder="/path/to/your/project"
                  />
                  <p className="text-sm text-gray-500">
                    {language === 'ja' ? 'ソースコード解析時に使用するディレクトリパス' : 'Directory path used for source code analysis'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screenshotSize">
                    {language === 'ja' ? 'デフォルトスクリーンショットサイズ' : 'Default Screenshot Size'}
                  </Label>
                  <Select 
                    key={`screenshot-select-${formData.screenshotSize}`}
                    value={formData.screenshotSize} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, screenshotSize: value }));
                    }}
                  >
                    <SelectTrigger id="screenshotSize">
                      <SelectValue placeholder="Select a size" />
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
                  <p className="text-sm text-gray-500">
                    {language === 'ja' 
                      ? 'テスト生成・実行時のデフォルトのビューポートサイズ' 
                      : 'Default viewport size for test generation and execution'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {language === 'ja' ? '保存中...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {language === 'ja' ? '変更を保存' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                認証設定
              </CardTitle>
              <CardDescription>
                テスト対象サイトがログイン認証を必要とする場合の設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">ログイン認証が必要</Label>
                  <p className="text-sm text-gray-600">
                    テスト実行時に自動的にログイン処理を行います
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={cn(
                    "text-sm font-semibold transition-colors",
                    formData.requiresAuth !== true ? "text-red-600" : "text-gray-300"
                  )}>OFF</span>
                  <Switch
                    checked={formData.requiresAuth === true}
                    onCheckedChange={(checked) => {
                      console.log("Toggle changed:", checked); // デバッグ用
                      setFormData({ ...formData, requiresAuth: checked });
                    }}
                    className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
                  />
                  <span className={cn(
                    "text-sm font-semibold transition-colors",
                    formData.requiresAuth === true ? "text-green-600" : "text-gray-300"
                  )}>ON</span>
                </div>
              </div>
              
              {formData.requiresAuth === true && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="loginUrl">ログインページURL</Label>
                    <Input
                      id="loginUrl"
                      type="url"
                      value={formData.loginUrl || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, loginUrl: e.target.value })
                      }
                      placeholder={`${formData.baseUrl}/login`}
                    />
                    <p className="text-sm text-gray-500">
                      ログインフォームがあるページのURL
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="authEmail">メールアドレス / ユーザー名</Label>
                    <Input
                      id="authEmail"
                      type="text"
                      value={formData.authEmail || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, authEmail: e.target.value })
                      }
                      placeholder="test@example.com"
                    />
                    <p className="text-sm text-gray-500">
                      ログインに使用するメールアドレスまたはユーザー名
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="authPassword">パスワード</Label>
                    <div className="relative">
                      <Input
                        id="authPassword"
                        type={showPassword ? "text" : "password"}
                        value={formData.authPassword || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, authPassword: e.target.value })
                        }
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      ログインに使用するパスワード（暗号化して保存されます）
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>注意:</strong> これらの認証情報は、テスト実行時に自動的にログイン処理を行うために使用されます。
                      各テストケースの実行前にログイン状態を確認し、必要に応じて自動ログインを実行します。
                    </p>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>保存方法:</strong> 認証設定を変更した後は、上部の「変更を保存」ボタンをクリックして保存してください。
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">危険な操作</CardTitle>
              <CardDescription>以下の操作は取り消すことができません</CardDescription>
            </CardHeader>
            <CardContent>
              {showDeleteConfirm ? (
                <div className="space-y-4">
                  <p className="text-sm">
                    本当にこのプロジェクトを削除しますか？
                    この操作により、すべてのテストスイート、テストケース、実行結果が削除されます。
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="flex-1"
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          削除中...
                        </>
                      ) : (
                        "削除する"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleteMutation.isPending}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  プロジェクトを削除
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
