import * as React from "react";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({ isOpen, onClose, title, description, children, maxWidth = "md" }: DialogProps) {
  if (!isOpen) return null;

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={twMerge(
          "bg-white rounded-3xl w-full p-6 space-y-5 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150",
          widthClasses[maxWidth]
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h3>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
