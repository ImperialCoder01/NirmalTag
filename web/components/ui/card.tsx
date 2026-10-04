import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted" | "highlight";
}

export function Card({ className, variant = "default", children, ...props }: CardProps) {
  const variants = {
    default: "bg-white border-slate-200/90 shadow-sm",
    muted: "bg-slate-50 border-slate-200 shadow-none",
    highlight: "bg-emerald-50/60 border-emerald-200/90 shadow-xs",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "rounded-3xl border p-5 sm:p-6 transition-all space-y-4",
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("flex items-center justify-between border-b border-slate-100 pb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={twMerge("text-sm sm:text-base font-extrabold text-slate-900 tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={twMerge("text-xs text-slate-500 leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge("space-y-3", className)} {...props}>{children}</div>;
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("pt-3 border-t border-slate-100 flex items-center justify-end gap-3", className)} {...props}>
      {children}
    </div>
  );
}
