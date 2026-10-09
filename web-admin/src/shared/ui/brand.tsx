import Image from "next/image";
import { cn } from "@/shared/lib/cn";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image src="/accessmapvn-logo.png" width={44} height={44} alt="Biểu trưng AccessMapVN" className="size-10 rounded-xl object-cover shadow-sm" priority />
      {!compact && (
        <div className="min-w-0">
          <div className="truncate text-[17px] font-extrabold tracking-tight text-slate-950">AccessMapVN</div>
          <div className="truncate text-xs font-medium text-slate-500">Quản trị vận hành</div>
        </div>
      )}
    </div>
  );
}
