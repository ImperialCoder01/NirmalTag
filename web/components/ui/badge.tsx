import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral" | "purple" | "demo";
}

export function Badge({ className, variant = "neutral", children, ...props }: BadgeProps) {
  const variants = {
    success: "bg-emerald-100 text-emerald-900 border-emerald-300",
    warning: "bg-amber-100 text-amber-900 border-amber-300",
    error: "bg-red-100 text-red-900 border-red-300",
    info: "bg-sky-100 text-sky-900 border-sky-300",
    neutral: "bg-slate-100 text-slate-800 border-slate-300",
    purple: "bg-purple-100 text-purple-900 border-purple-300",
    demo: "bg-amber-500 text-slate-950 border-amber-600 font-black tracking-wider uppercase",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs leading-tight",
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
