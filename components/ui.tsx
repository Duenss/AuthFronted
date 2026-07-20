"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    loading?: boolean;
  }
>(
  (
    {
      className,
      variant = "primary",
      loading,
      children,
      ...props
    },
    ref
  ) => {
  const styles = {
    primary: "bg-primary hover:bg-primary-hover text-white shadow-blue-glow-sm hover:shadow-blue-glow",
    secondary: "bg-surface-2 hover:bg-surface-3 text-white border border-border",
    ghost: "hover:bg-surface-2 text-muted-foreground hover:text-white",
    danger: "bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30"
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
});

export function Field({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className={cn("input", className)} {...props} />
    </label>
  );
}

export function Textarea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className={cn("input min-h-[96px] resize-none", className)} {...props} />
    </label>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const tones = {
    default: "bg-surface-3 text-muted-foreground",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20"
  };
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function StatCard({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail: string; icon: React.ElementType }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted">{detail}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-primary-light">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
