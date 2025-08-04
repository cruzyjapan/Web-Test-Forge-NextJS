"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, FileText, FileUp, Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

interface SpecImportModalProps {
  suiteId: string;
  projectBaseUrl: string;
  projectName: string;
  onSuccess?: () => void;
}

export function SpecImportModal({
  suiteId,
  projectBaseUrl,
  projectName,
  onSuccess,
}: SpecImportModalProps) {
  const [open, setOpen] = useState(false);
  const [specContent, setSpecContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      if (specContent) {
        formData.append("specContent", specContent);
        console.log("Spec content:", specContent);
      }

      selectedFiles.forEach((file) => {
        formData.append("specFiles", file);
        console.log("Selected file:", file.name, file.size, file.type);
      });

      formData.append("baseUrl", projectBaseUrl);
      formData.append("projectName", projectName);
      
      console.log("Sending request to:", `/api/suites/${suiteId}/generate`);

      const res = await fetch(`/api/suites/${suiteId}/generate`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("API Error Response:", error);
        throw new Error(error.details || error.error || (language === 'ja' ? "テストケースの生成に失敗しました" : "Failed to generate test cases"));
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ja' ? "成功" : "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["suite", suiteId] });
      setOpen(false);
      setSpecContent("");
      setSelectedFiles([]);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ja' ? "エラー" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type === "text/plain" ||
          file.type === "text/markdown" ||
          file.type === "text/html" ||
          file.name.endsWith(".md") ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".html"),
      );
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (!specContent && selectedFiles.length === 0) {
      toast({
        title: language === 'ja' ? "エラー" : "Error",
        description: language === 'ja' ? "仕様書の内容またはファイルを指定してください" : "Please specify specification content or files",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          {language === 'ja' ? '仕様書からインポート' : 'Import from Specification'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{language === 'ja' ? '仕様書からテストケースを自動生成' : 'Auto-generate Test Cases from Specification'}</DialogTitle>
          <DialogDescription>
            {language === 'ja' 
              ? '仕様書やドキュメントを解析して、テストケースを自動的に生成します。\nマークダウン、テキスト、HTMLファイルに対応しています。'
              : 'Analyze specifications and documents to automatically generate test cases.\nSupports Markdown, text, and HTML files.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* テキスト入力エリア */}
          <div className="space-y-2">
            <Label htmlFor="spec-content">{language === 'ja' ? '仕様書の内容を直接入力' : 'Enter Specification Content Directly'}</Label>
            <Textarea
              id="spec-content"
              placeholder={language === 'ja' 
                ? '仕様書の内容をペーストしてください。機能要件、ユースケース、画面仕様などを記載すると、より具体的なテストケースが生成されます。'
                : 'Paste the specification content. Including functional requirements, use cases, and screen specifications will generate more specific test cases.'
              }
              value={specContent}
              onChange={(e) => setSpecContent(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{language === 'ja' ? 'または' : 'OR'}</span>
            </div>
          </div>

          {/* ファイルアップロードエリア */}
          <div className="space-y-2">
            <Label>{language === 'ja' ? '仕様書ファイルをアップロード' : 'Upload Specification Files'}</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragActive ? "border-primary bg-primary/5" : "border-gray-300"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-2">{language === 'ja' ? 'ファイルをドラッグ＆ドロップ、または' : 'Drag & drop files, or'}</p>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    {language === 'ja' ? 'ファイルを選択' : 'Select Files'}
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      multiple
                      accept=".txt,.md,.html,.htm"
                      onChange={handleFileChange}
                    />
                  </span>
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-2">{language === 'ja' ? '対応形式' : 'Supported formats'}: .txt, .md, .html</p>
            </div>
          </div>

          {/* 選択されたファイル一覧 */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>{language === 'ja' ? '選択されたファイル' : 'Selected Files'}</Label>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 生成プレビュー */}
          <Card className="bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{language === 'ja' ? '生成される内容の例' : 'Examples of Generated Content'}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                <span>{language === 'ja' ? 'ログイン/認証機能のテスト' : 'Login/Authentication Tests'}</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                <span>{language === 'ja' ? 'データの作成・編集・削除テスト' : 'Create/Edit/Delete Data Tests'}</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                <span>{language === 'ja' ? '検索・フィルタリング機能のテスト' : 'Search/Filtering Tests'}</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                <span>{language === 'ja' ? 'フォームバリデーションのテスト' : 'Form Validation Tests'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={generateMutation.isPending}
          >
            {language === 'ja' ? 'キャンセル' : 'Cancel'}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || (!specContent && selectedFiles.length === 0)}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'ja' ? '生成中...' : 'Generating...'}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {language === 'ja' ? 'テストケースを生成' : 'Generate Test Cases'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
