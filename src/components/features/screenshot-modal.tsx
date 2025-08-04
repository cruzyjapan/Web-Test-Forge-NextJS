"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScreenshotModalProps {
  screenshot: {
    filePath: string;
    browser: string;
    pageName: string;
    url: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScreenshotModal({ screenshot, open, onOpenChange }: ScreenshotModalProps) {
  if (!screenshot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {screenshot.browser} - {screenshot.pageName}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <img
            src={screenshot.filePath}
            alt={`${screenshot.browser} - ${screenshot.pageName}`}
            className="w-full h-auto rounded border"
          />
          <p className="text-sm text-gray-500 mt-2">{screenshot.url}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}