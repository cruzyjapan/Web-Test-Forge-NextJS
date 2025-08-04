"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, User, Bell, Shield, Database, Globe, Save, RefreshCw, Volume2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { playSound } from "@/lib/utils/sound"
import { useLanguage } from "@/contexts/language-context"

export default function SettingsPage() {
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [settings, setSettings] = useState<any>({
    general: {
      name: "",
      email: "",
      organization: "",
      language: "ja",
    },
    notifications: {
      soundEnabled: true,
      notifyOnSuccess: false,
      notifyOnFailure: true,
    },
    test: {
      headless: true,
      autoScreenshot: true,
    },
  })

  // 現在のユーザー情報を取得
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me")
      if (!res.ok) return null
      return res.json()
    },
  })

  // 設定を取得
  const { data: loadedSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings", currentUser?.id],
    queryFn: async () => {
      const res = await fetch("/api/settings")
      if (!res.ok) {
        // 設定が存在しない場合はユーザー情報を使ったデフォルト値を返す
        return null
      }
      const data = await res.json()
      // ユーザー情報でデフォルト値を上書き
      if (!data.general?.name && currentUser?.name) {
        data.general = data.general || {}
        data.general.name = currentUser.name
      }
      if (!data.general?.email && currentUser?.email) {
        data.general = data.general || {}
        data.general.email = currentUser.email
      }
      return data
    },
    enabled: !!currentUser, // ユーザー情報が取得できてから設定を取得
  })
  
  const isLoading = userLoading || settingsLoading

  useEffect(() => {
    if (loadedSettings) {
      setSettings(loadedSettings)
    } else if (currentUser && !loadedSettings) {
      // 設定が存在しない場合、ユーザー情報でデフォルト値を設定
      setSettings({
        general: {
          name: currentUser.name || "",
          email: currentUser.email || "",
          organization: "",
          language: "ja",
        },
        notifications: {
          soundEnabled: true,
          notifyOnSuccess: false,
          notifyOnFailure: true,
        },
        test: {
          headless: true,
          autoScreenshot: true,
        },
      })
    }
  }, [loadedSettings, currentUser])

  // 設定を保存
  const saveMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSettings),
      })
      if (!res.ok) throw new Error("Failed to save settings")
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: language === 'ja' ? "設定を保存しました" : "Settings Saved",
        description: language === 'ja' ? "変更内容が正常に保存されました。" : "Your changes have been saved successfully.",
      })
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: language === 'ja' ? "設定の保存に失敗しました。" : "Failed to save settings.",
        variant: "destructive",
      })
    },
  })

  // パスワード変更用のミューテーション
  const passwordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || (language === 'ja' ? 'パスワードの変更に失敗しました' : 'Failed to change password'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: t('messages.updateSuccess'),
        description: language === 'ja' ? '新しいパスワードが設定されました。' : 'Your new password has been set.',
      })
      // パスワードフィールドをクリア
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSave = async () => {
    setIsSaving(true)
    
    // 通知設定をローカルストレージにも保存
    if (settings.notifications) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('notification-settings', JSON.stringify(settings.notifications))
      }
    }
    
    await saveMutation.mutateAsync(settings)
    setIsSaving(false)
  }

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
  }

  const handlePasswordChange = () => {
    // バリデーション
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('validation.required_field'),
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('validation.password_mismatch'),
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: t('common.error'),
        description: t('validation.password_too_short'),
        variant: "destructive",
      })
      return
    }

    passwordMutation.mutate(passwordData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-2">{language === 'ja' ? 'アプリケーションの設定を管理します' : 'Manage application settings'}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="general">{language === 'ja' ? '一般' : 'General'}</TabsTrigger>
          <TabsTrigger value="test">{language === 'ja' ? 'テスト' : 'Test'}</TabsTrigger>
          <TabsTrigger value="notifications">{language === 'ja' ? '通知' : 'Notifications'}</TabsTrigger>
          <TabsTrigger value="security">{language === 'ja' ? 'セキュリティ' : 'Security'}</TabsTrigger>
          <TabsTrigger value="advanced">{language === 'ja' ? '詳細' : 'Advanced'}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                {t('settings.profileSettings')}
              </CardTitle>
              <CardDescription>
                {language === 'ja' ? 'ユーザー情報とアカウント設定' : 'User information and account settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('settings.displayName')}</Label>
                <Input 
                  id="name" 
                  placeholder={language === 'ja' ? '山田太郎' : 'John Doe'} 
                  value={settings?.general?.name || ""}
                  onChange={(e) => updateSetting("general", "name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="user@example.com" 
                  value={settings?.general?.email || ""}
                  onChange={(e) => updateSetting("general", "email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org">{language === 'ja' ? '組織名' : 'Organization'}</Label>
                <Input 
                  id="org" 
                  placeholder={language === 'ja' ? '株式会社Example' : 'Example Corp'} 
                  value={settings?.general?.organization || ""}
                  onChange={(e) => updateSetting("general", "organization", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                {language === 'ja' ? '言語とタイムゾーン' : 'Language and Timezone'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">{language === 'ja' ? '言語' : 'Language'}</Label>
                <Select 
                  value={settings?.general?.language || "ja"}
                  onValueChange={(value) => updateSetting("general", "language", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">{language === 'ja' ? '日本語' : 'Japanese'}</SelectItem>
                    <SelectItem value="en">{language === 'ja' ? '英語' : 'English'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{language === 'ja' ? 'タイムゾーン' : 'Timezone'}</Label>
                <Select defaultValue="asia-tokyo">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asia-tokyo">Asia/Tokyo (JST)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="america-newyork">America/New_York (EST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? 'テスト実行設定' : 'Test Execution Settings'}</CardTitle>
              <CardDescription>
                {language === 'ja' ? 'デフォルトのテスト実行パラメータ' : 'Default test execution parameters'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="browser">{language === 'ja' ? 'デフォルトブラウザ' : 'Default Browser'}</Label>
                <Select defaultValue="chrome">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chrome">Chrome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">{language === 'ja' ? 'タイムアウト (秒)' : 'Timeout (seconds)'}</Label>
                <Input id="timeout" type="number" defaultValue="30" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ja' ? 'ヘッドレスモード' : 'Headless Mode'}</Label>
                  <p className="text-sm text-gray-500">{language === 'ja' ? 'バックグラウンドでテストを実行' : 'Run tests in background'}</p>
                </div>
                <Switch 
                  checked={settings?.test?.headless !== false}
                  onCheckedChange={(checked) => updateSetting("test", "headless", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ja' ? 'スクリーンショット自動保存' : 'Auto Screenshot'}</Label>
                  <p className="text-sm text-gray-500">{language === 'ja' ? '各ステップでスクリーンショットを保存' : 'Save screenshots at each step'}</p>
                </div>
                <Switch 
                  checked={settings?.test?.autoScreenshot !== false}
                  onCheckedChange={(checked) => updateSetting("test", "autoScreenshot", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? '並行実行設定' : 'Parallel Execution Settings'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workers">{language === 'ja' ? '最大ワーカー数' : 'Max Workers'}</Label>
                <Input id="workers" type="number" defaultValue="4" />
                <p className="text-sm text-gray-500">{language === 'ja' ? '同時に実行できるテストの最大数' : 'Maximum number of tests that can run simultaneously'}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ja' ? '失敗時の再試行' : 'Retry on Failure'}</Label>
                  <p className="text-sm text-gray-500">{language === 'ja' ? '失敗したテストを自動的に再実行' : 'Automatically retry failed tests'}</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                {language === 'ja' ? '通知設定' : 'Notification Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ja' ? 'テスト結果の音声通知を設定' : 'Configure audio notifications for test results'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ja' ? '音声通知' : 'Sound Notifications'}</Label>
                  <p className="text-sm text-gray-500">{language === 'ja' ? 'テスト完了時に音で通知' : 'Play sound when tests complete'}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm font-semibold transition-colors ${
                    settings?.notifications?.soundEnabled === false ? "text-red-600" : "text-gray-300"
                  }`}>OFF</span>
                  <Switch 
                    checked={settings?.notifications?.soundEnabled !== false}
                    onCheckedChange={(checked) => updateSetting("notifications", "soundEnabled", checked)}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <span className={`text-sm font-semibold transition-colors ${
                    settings?.notifications?.soundEnabled !== false ? "text-green-600" : "text-gray-300"
                  }`}>ON</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ja' ? '成功時に通知' : 'Notify on Success'}</Label>
                  <p className="text-sm text-gray-500">{language === 'ja' ? 'テストが成功した場合に音で通知' : 'Play sound when tests succeed'}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm font-semibold transition-colors ${
                    settings?.notifications?.notifyOnSuccess !== true ? "text-red-600" : "text-gray-300"
                  } ${settings?.notifications?.soundEnabled === false ? "opacity-50" : ""}`}>OFF</span>
                  <Switch 
                    checked={settings?.notifications?.notifyOnSuccess === true}
                    onCheckedChange={(checked) => updateSetting("notifications", "notifyOnSuccess", checked)}
                    disabled={settings?.notifications?.soundEnabled === false}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <span className={`text-sm font-semibold transition-colors ${
                    settings?.notifications?.notifyOnSuccess === true ? "text-green-600" : "text-gray-300"
                  } ${settings?.notifications?.soundEnabled === false ? "opacity-50" : ""}`}>ON</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ja' ? '失敗時に通知' : 'Notify on Failure'}</Label>
                  <p className="text-sm text-gray-500">{language === 'ja' ? 'テストが失敗した場合に音で通知' : 'Play sound when tests fail'}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm font-semibold transition-colors ${
                    settings?.notifications?.notifyOnFailure === false ? "text-red-600" : "text-gray-300"
                  } ${settings?.notifications?.soundEnabled === false ? "opacity-50" : ""}`}>OFF</span>
                  <Switch 
                    checked={settings?.notifications?.notifyOnFailure !== false}
                    onCheckedChange={(checked) => updateSetting("notifications", "notifyOnFailure", checked)}
                    disabled={settings?.notifications?.soundEnabled === false}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <span className={`text-sm font-semibold transition-colors ${
                    settings?.notifications?.notifyOnFailure !== false ? "text-green-600" : "text-gray-300"
                  } ${settings?.notifications?.soundEnabled === false ? "opacity-50" : ""}`}>ON</span>
                </div>
              </div>
              
              {/* 音声テストボタン */}
              <div className="pt-4 border-t space-y-2">
                <Label>{language === 'ja' ? '音声テスト' : 'Sound Test'}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      playSound('success')
                      toast({
                        title: language === 'ja' ? "成功音を再生しました" : "Success sound played",
                        description: language === 'ja' ? "成功時の通知音です" : "This is the success notification sound",
                      })
                    }}
                    disabled={settings?.notifications?.soundEnabled === false}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    {language === 'ja' ? '成功音' : 'Success'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      playSound('failure')
                      toast({
                        title: language === 'ja' ? "失敗音を再生しました" : "Failure sound played",
                        description: language === 'ja' ? "失敗時の通知音です" : "This is the failure notification sound",
                      })
                    }}
                    disabled={settings?.notifications?.soundEnabled === false}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    {language === 'ja' ? '失敗音' : 'Failure'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      playSound('notification')
                      toast({
                        title: language === 'ja' ? "通知音を再生しました" : "Notification sound played",
                        description: language === 'ja' ? "一般的な通知音です" : "This is the general notification sound",
                      })
                    }}
                    disabled={settings?.notifications?.soundEnabled === false}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    {language === 'ja' ? '通知音' : 'Notification'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {language === 'ja' ? '音声通知がONの場合のみテストできます' : 'Sound test is only available when sound notifications are enabled'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                {language === 'ja' ? 'セキュリティ設定' : 'Security Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{language === 'ja' ? '現在のパスワード' : 'Current Password'}</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder={language === 'ja' ? '現在のパスワードを入力' : 'Enter current password'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{language === 'ja' ? '新しいパスワード' : 'New Password'}</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder={language === 'ja' ? '新しいパスワードを入力（6文字以上）' : 'Enter new password (6+ characters)'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{language === 'ja' ? 'パスワードの確認' : 'Confirm Password'}</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder={language === 'ja' ? '新しいパスワードを再入力' : 'Re-enter new password'}
                />
              </div>
              <Button 
                variant="warning" 
                onClick={handlePasswordChange}
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === 'ja' ? '変更中...' : 'Changing...'}
                  </>
                ) : (
                  language === 'ja' ? 'パスワードを変更' : 'Change Password'
                )}
              </Button>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                {language === 'ja' ? 'データ管理' : 'Data Management'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ja' ? 'データ保持期間' : 'Data Retention Period'}</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{language === 'ja' ? '7日間' : '7 days'}</SelectItem>
                    <SelectItem value="30">{language === 'ja' ? '30日間' : '30 days'}</SelectItem>
                    <SelectItem value="90">{language === 'ja' ? '90日間' : '90 days'}</SelectItem>
                    <SelectItem value="365">{language === 'ja' ? '1年間' : '1 year'}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">{language === 'ja' ? '古いテスト結果を自動的に削除' : 'Automatically delete old test results'}</p>
              </div>
              <div className="pt-4 space-y-2">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={async () => {
                    if (confirm(language === 'ja' ? "本当にすべてのテストデータを削除しますか？この操作は取り消せません。" : "Are you sure you want to delete all test data? This action cannot be undone.")) {
                      try {
                        const res = await fetch("/api/data/clear", {
                          method: "DELETE",
                        })
                        if (res.ok) {
                          toast({
                            title: language === 'ja' ? "削除完了" : "Deletion Complete",
                            description: language === 'ja' ? "すべてのテストデータを削除しました" : "All test data has been deleted",
                          })
                        } else {
                          throw new Error(language === 'ja' ? "削除に失敗しました" : "Failed to delete")
                        }
                      } catch (error) {
                        toast({
                          title: t('common.error'),
                          description: language === 'ja' ? "データの削除に失敗しました" : "Failed to delete data",
                          variant: "destructive",
                        })
                      }
                    }
                  }}
                >
                  {language === 'ja' ? 'すべてのテストデータを削除' : 'Delete All Test Data'}
                </Button>
                <p className="text-xs text-gray-500 text-center">{language === 'ja' ? 'この操作は取り消せません' : 'This action cannot be undone'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ja' ? 'システム情報' : 'System Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'ja' ? 'バージョン' : 'Version'}</span>
                <span className="font-mono">v0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'ja' ? 'ビルド' : 'Build'}</span>
                <span className="font-mono">2025.1.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'ja' ? '環境' : 'Environment'}</span>
                <span className="font-mono">development</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          variant="success"
          size="lg"
        >
          {isSaving ? (
            <>{language === 'ja' ? '保存中...' : 'Saving...'}</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {language === 'ja' ? '設定を保存' : 'Save Settings'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}