import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function cnJoin(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "cyan" | "violet" | "warn" | "ok" | "danger" }) {
  return <span className={cnJoin("badge", tone !== "default" && `badge-${tone}`)}>{children}</span>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cn("panel", className)}>{children}</section>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel p-6">
      <p className="font-display text-lg">{title}</p>
      <p className="mt-2 max-w-xl text-sm text-paper-dim">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export { cn };
