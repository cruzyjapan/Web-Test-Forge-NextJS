"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, FolderOpen } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/hooks/use-toast"
import { postWithAuth } from "@/lib/utils/fetch"

export default function NewProjectPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    baseUrl: "",
    sourcePath: "",
  })

  const createProjectMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await postWithAuth("/api/projects", data)
      
      if (!res.ok) {
        let errorMessage = language === 'ja' ? 'プロジェクトの作成に失敗しました' : 'Failed to create project'
        try {
          const errorData = await res.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          // Ignore parse error
        }
        throw new Error(errorMessage)
      }
      
      return res.json()
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ja' ? '成功' : 'Success',
        description: language === 'ja' ? 'プロジェクトが正常に作成されました' : 'Project created successfully',
      })
      router.push(`/projects/${data.id}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createProjectMutation.mutate(formData)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button asChild variant="ghost" className="mr-4">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{language === 'ja' ? '新規プロジェクト作成' : 'Create New Project'}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ja' ? 'プロジェクト情報' : 'Project Information'}</CardTitle>
            <CardDescription>
              {language === 'ja' ? 'テスト対象のWebアプリケーションの情報を入力してください' : 'Enter information about the web application to test'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{language === 'ja' ? 'プロジェクト名' : 'Project Name'} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={language === 'ja' ? '例: ECサイトテスト' : 'e.g. E-commerce Site Test'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{language === 'ja' ? '説明' : 'Description'}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={language === 'ja' ? 'プロジェクトの説明を入力' : 'Enter project description'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">{language === 'ja' ? 'ベースURL' : 'Base URL'} *</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, baseUrl: e.target.value })
                  }
                  placeholder="https://example.com"
                  required
                />
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                  <p className="text-sm font-medium text-blue-900 mb-2">{language === 'ja' ? 'URLの形式について' : 'About URL Format'}</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• {language === 'ja' ? '必ず' : 'Must start with'}<span className="font-mono bg-blue-100 px-1 rounded">https://</span>{language === 'ja' ? 'または' : ' or '}<span className="font-mono bg-blue-100 px-1 rounded">http://</span>{language === 'ja' ? 'で始まる完全なURLを入力してください' : ''}</li>
                    <li>• {language === 'ja' ? '例: ' : 'Example: '}<span className="font-mono bg-blue-100 px-1 rounded">https://www.example.com</span></li>
                    <li>• {language === 'ja' ? '例: ' : 'Example: '}<span className="font-mono bg-blue-100 px-1 rounded">http://localhost:3000</span></li>
                    <li>• {language === 'ja' ? '例: ' : 'Example: '}<span className="font-mono bg-blue-100 px-1 rounded">https://staging.myapp.com</span></li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourcePath">
                  <FolderOpen className="inline h-4 w-4 mr-1" />
                  {language === 'ja' ? 'ソースコードディレクトリ（オプション）' : 'Source Code Directory (Optional)'}
                </Label>
                <Input
                  id="sourcePath"
                  value={formData.sourcePath}
                  onChange={(e) =>
                    setFormData({ ...formData, sourcePath: e.target.value })
                  }
                  placeholder={language === 'ja' ? "/path/to/your/project" : "/path/to/your/project"}
                />
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {language === 'ja' ? 'ソースコード解析について' : 'About Source Code Analysis'}
                  </p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>• {language === 'ja' ? 'テスト対象アプリケーションのソースコードがあるディレクトリを指定' : 'Specify the directory containing your application source code'}</li>
                    <li>• {language === 'ja' ? '例: ' : 'Example: '}<span className="font-mono bg-gray-100 px-1 rounded">/home/user/my-app</span></li>
                    <li>• {language === 'ja' ? '例: ' : 'Example: '}<span className="font-mono bg-gray-100 px-1 rounded">~/projects/website</span></li>
                    <li>• {language === 'ja' ? 'ソースコードから自動的にテストケースを生成できます' : 'Test cases can be automatically generated from source code'}</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/projects">{language === 'ja' ? 'キャンセル' : 'Cancel'}</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? (language === 'ja' ? '作成中...' : 'Creating...') : (language === 'ja' ? '作成' : 'Create')}
                </Button>
              </div>

              {createProjectMutation.isError && (
                <div className="text-red-500 text-sm mt-2">
                  <p>{createProjectMutation.error.message}</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}