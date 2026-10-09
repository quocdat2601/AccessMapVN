import { cn } from "@/shared/lib/cn";

export function Progress({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}>
      <div className={cn("h-full rounded-full bg-teal-600 transition-[width]", indicatorClassName)} style={{ width: `${safeValue}%` }} />
    </div>
  );
}
