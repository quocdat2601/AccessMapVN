"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import type { DateRangeKey } from "@/entities/dashboard";

export function DateRangeFilter({ value, onChange }: { value: DateRangeKey; onChange: (value: DateRangeKey) => void }) {
  return (
    <label className="relative flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300">
      <CalendarDays className="size-4 text-slate-500" />
      <span className="sr-only">Khoảng thời gian</span>
      <select value={value} onChange={(event) => onChange(event.target.value as DateRangeKey)} className="appearance-none bg-transparent pr-5 outline-none">
        <option value="7d">7 ngày qua</option>
        <option value="30d">30 ngày qua</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-slate-400" />
    </label>
  );
}
