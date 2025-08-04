"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  steps: TestStep[] | string;
  suiteId: string;
}

interface TestCaseEditModalProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TestCaseEditModal({ 
  testCase, 
  open, 
  onOpenChange,
  onSuccess 
}: TestCaseEditModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    steps: [{ action: "navigate", selector: "", value: "", expectedResult: "" }] as TestStep[],
  });

  useEffect(() => {
    if (testCase) {
      const steps = typeof testCase.steps === 'string' 
        ? JSON.parse(testCase.steps) 
        : testCase.steps;
      
      setFormData({
        name: testCase.name,
        description: testCase.description || "",
        steps: steps.length > 0 ? steps : [{ action: "navigate", selector: "", value: "", expectedResult: "" }],
      });
    }
  }, [testCase]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!testCase) return;
      
      const res = await fetch(`/api/suites/${testCase.suiteId}/cases/${testCase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || (language === 'ja' ? "テストケースの更新に失敗しました" : "Failed to update test case"));
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suite", testCase?.suiteId] });
      toast({
        title: language === 'ja' ? "成功" : "Success",
        description: language === 'ja' ? "テストケースを更新しました" : "Test case updated successfully",
      });
      onOpenChange(false);
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!testCase) return;
      
      const res = await fetch(`/api/suites/${testCase.suiteId}/cases/${testCase.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || (language === 'ja' ? "テストケースの削除に失敗しました" : "Failed to delete test case"));
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suite", testCase?.suiteId] });
      toast({
        title: language === 'ja' ? "成功" : "Success",
        description: language === 'ja' ? "テストケースを削除しました" : "Test case deleted successfully",
      });
      onOpenChange(false);
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

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        { action: "click", selector: "", value: "", expectedResult: "" },
      ],
    });
  };

  const handleRemoveStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const handleStepChange = (index: number, field: keyof TestStep, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: language === 'ja' ? "エラー" : "Error",
        description: language === 'ja' ? "テストケース名を入力してください" : "Please enter a test case name",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(formData);
  };

  if (!testCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{language === 'ja' ? 'テストケースを編集' : 'Edit Test Case'}</DialogTitle>
            <DialogDescription>
              {language === 'ja' ? 'テストケースの内容を編集します' : 'Edit the contents of the test case'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">{language === 'ja' ? 'テストケース名 *' : 'Test Case Name *'}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ja' ? '例: ログイン機能のテスト' : 'e.g., Login functionality test'}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-description">{language === 'ja' ? '説明' : 'Description'}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ja' ? 'テストケースの詳細説明' : 'Detailed description of the test case'}
                rows={3}
              />
            </div>

            <div>
              <Label>{language === 'ja' ? 'テストステップ' : 'Test Steps'}</Label>
              <div className="space-y-2 mt-2">
                {formData.steps.map((step, index) => (
                  <div key={index} className="p-3 border rounded bg-gray-50">
                    <div className="grid grid-cols-4 gap-2">
                      <select
                        value={step.action}
                        onChange={(e) => handleStepChange(index, "action", e.target.value)}
                        className="px-2 py-1 border rounded bg-white"
                      >
                        <option value="navigate">{language === 'ja' ? 'ページ遷移' : 'Navigate'}</option>
                        <option value="click">{language === 'ja' ? 'クリック' : 'Click'}</option>
                        <option value="type">{language === 'ja' ? '入力' : 'Type'}</option>
                        <option value="wait">{language === 'ja' ? '待機' : 'Wait'}</option>
                        <option value="assert">{language === 'ja' ? '検証' : 'Assert'}</option>
                        <option value="scroll">{language === 'ja' ? 'スクロール' : 'Scroll'}</option>
                        <option value="select">{language === 'ja' ? '選択' : 'Select'}</option>
                        <option value="hover">{language === 'ja' ? 'ホバー' : 'Hover'}</option>
                      </select>
                      <Input
                        placeholder={language === 'ja' ? 'セレクタ' : 'Selector'}
                        value={step.selector || ""}
                        onChange={(e) => handleStepChange(index, "selector", e.target.value)}
                      />
                      <Input
                        placeholder={language === 'ja' ? '値' : 'Value'}
                        value={step.value || ""}
                        onChange={(e) => handleStepChange(index, "value", e.target.value)}
                      />
                      <div className="flex gap-1">
                        <Input
                          placeholder={language === 'ja' ? '期待結果' : 'Expected Result'}
                          value={step.expectedResult || ""}
                          onChange={(e) => handleStepChange(index, "expectedResult", e.target.value)}
                        />
                        {formData.steps.length > 1 && (
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
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm(language === 'ja' ? "このテストケースを削除してもよろしいですか？" : "Are you sure you want to delete this test case?")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {language === 'ja' ? '削除' : 'Delete'}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {language === 'ja' ? 'キャンセル' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {language === 'ja' ? '保存' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}