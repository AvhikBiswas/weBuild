import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FileText } from "lucide-react";
import type { ReactElement } from "react";
import React from "react";

// Utility to merge Tailwind class names
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

// Utility to generate a random ID
export const generateId = (): string =>
  Math.random().toString(36).substr(2, 9);

// Format timestamp into a readable format
export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return date.toLocaleDateString();
};

// Utility to detect language based on file extension
export const getFileLanguage = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    tsx: "typescript",
    ts: "typescript",
    jsx: "javascript",
    js: "javascript",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    md: "markdown",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
  };
  return languageMap[ext ?? ""] || "text";
};

// Return JSX icon for a file based on its type and extension
export const getFileIcon = (
  fileName: string,
  type: string
): ReactElement | null => {
  if (type === "folder") return null;

  const ext = fileName.split(".").pop()?.toLowerCase();
  const iconStyle =
    "w-4 h-4 rounded-sm flex items-center justify-center text-white text-xs font-bold";

  if (ext === "tsx" || ext === "ts") {
    return <div className={`${iconStyle} bg-blue-500`}>TS</div>;
  }
  if (ext === "jsx" || ext === "js") {
    return <div className={`${iconStyle} bg-yellow-500`}>JS</div>;
  }
  if (ext === "css" || ext === "scss") {
    return <div className={`${iconStyle} bg-purple-500`}>CSS</div>;
  }
  if (ext === "json") {
    return <div className={`${iconStyle} bg-green-500`}>JSON</div>;
  }

  return <FileText className="w-4 h-4 text-gray-500" />;
};
