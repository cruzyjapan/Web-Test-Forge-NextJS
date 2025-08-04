"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  createdAt: string;
  updatedAt: string;
}

interface TestCaseDetailModalProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestCaseDetailModal({ testCase, open, onOpenChange }: TestCaseDetailModalProps) {
  const { language } = useLanguage();
  if (!testCase) return null;

  // stepsがstring型の場合はパースする
  const steps: TestStep[] = typeof testCase.steps === 'string' 
    ? JSON.parse(testCase.steps) 
    : testCase.steps;

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = language === 'ja' ? {
      navigate: "ページ遷移",
      click: "クリック",
      type: "入力",
      wait: "待機",
      assert: "検証",
      scroll: "スクロール",
      select: "選択",
      hover: "ホバー",
    } : {
      navigate: "Navigate",
      click: "Click",
      type: "Type",
      wait: "Wait",
      assert: "Assert",
      scroll: "Scroll",
      select: "Select",
      hover: "Hover",
    };
    return labels[action] || action;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{testCase.name}</DialogTitle>
          {testCase.description && (
            <DialogDescription>{testCase.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">{language === 'ja' ? '基本情報' : 'Basic Information'}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">ID: </span>
                <span className="font-mono">{testCase.id}</span>
              </div>
              <div>
                <span className="text-gray-500">{language === 'ja' ? 'ステップ数' : 'Steps'}: </span>
                <span>{steps.length}</span>
              </div>
              <div>
                <span className="text-gray-500">{language === 'ja' ? '作成日' : 'Created'}: </span>
                <span>{new Date(testCase.createdAt).toLocaleString(language === 'ja' ? "ja-JP" : "en-US")}</span>
              </div>
              <div>
                <span className="text-gray-500">{language === 'ja' ? '更新日' : 'Updated'}: </span>
                <span>{new Date(testCase.updatedAt).toLocaleString(language === 'ja' ? "ja-JP" : "en-US")}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">{language === 'ja' ? 'テストステップ' : 'Test Steps'}</h3>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <Card key={index} className="bg-gray-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>
                        {language === 'ja' ? 'ステップ' : 'Step'} {index + 1}: {getActionLabel(step.action)}
                      </span>
                      <span className="text-xs text-gray-500 font-normal">
                        {step.action}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid gap-1 text-sm">
                      {step.selector && (
                        <div>
                          <span className="text-gray-500">{language === 'ja' ? 'セレクタ' : 'Selector'}: </span>
                          <code className="bg-white px-1 py-0.5 rounded text-xs">
                            {step.selector}
                          </code>
                        </div>
                      )}
                      {step.value && (
                        <div>
                          <span className="text-gray-500">{language === 'ja' ? '値' : 'Value'}: </span>
                          <span className="font-mono">{step.value}</span>
                        </div>
                      )}
                      {step.expectedResult && (
                        <div>
                          <span className="text-gray-500">{language === 'ja' ? '期待結果' : 'Expected Result'}: </span>
                          <span>{step.expectedResult}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">{language === 'ja' ? 'エクスポート' : 'Export'}</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const json = JSON.stringify(testCase, null, 2);
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `test-case-${testCase.id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                {language === 'ja' ? 'JSONでエクスポート' : 'Export as JSON'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const playwright = steps.map((step, i) => {
                    let code = `  // Step ${i + 1}: ${step.expectedResult || getActionLabel(step.action)}\n`;
                    switch (step.action) {
                      case "navigate":
                        code += `  await page.goto('${step.value || ""}');\n`;
                        break;
                      case "click":
                        code += `  await page.click('${step.selector || ""}');\n`;
                        break;
                      case "type":
                        code += `  await page.fill('${step.selector || ""}', '${step.value || ""}');\n`;
                        break;
                      case "wait":
                        code += `  await page.waitForTimeout(${step.value || 1000});\n`;
                        break;
                      case "assert":
                        code += `  await expect(page.locator('${step.selector || ""}')).toBeVisible();\n`;
                        break;
                      default:
                        code += `  // TODO: ${step.action}\n`;
                    }
                    return code;
                  }).join("\n");

                  const testCode = `import { test, expect } from '@playwright/test';

test('${testCase.name}', async ({ page }) => {
${playwright}
});`;

                  const blob = new Blob([testCode], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `test-${testCase.id}.spec.ts`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                {language === 'ja' ? 'Playwrightコードでエクスポート' : 'Export as Playwright Code'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}