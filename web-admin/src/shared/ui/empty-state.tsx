import { Inbox } from "lucide-react";

export function EmptyState({ title = "Chưa có dữ liệu", description = "Dữ liệu sẽ xuất hiện tại đây khi có hoạt động mới." }: { title?: string; description?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-white text-slate-400 shadow-sm"><Inbox className="size-5" /></div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}
