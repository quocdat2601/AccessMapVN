import { Bot, CheckCircle2 } from "lucide-react";
import type { AiOutcome } from "@/entities/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { formatNumber } from "@/shared/lib/format";

export function AiOutcomes({ data }: { data: AiOutcome[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card className="h-full">
      <CardHeader className="p-4 pb-2"><div><CardTitle className="flex items-center gap-2"><Bot className="size-4 text-slate-400" />Xác minh AI</CardTitle><CardDescription>{formatNumber(total)} tác vụ trong kỳ</CardDescription></div><Badge variant="teal" className="gap-1"><CheckCircle2 className="size-3" />Ổn định</Badge></CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className="mb-2 flex items-baseline gap-2"><strong className="text-2xl font-extrabold text-teal-700">{data[0]?.percentage}%</strong><span className="text-[11px] text-slate-500">xác minh tự động</span></div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-label="Phân bổ kết quả xác minh AI">
          {data.map((item) => <div key={item.label} title={`${item.label}: ${item.percentage}%`} style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />)}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.slice(1).map((item) => <span key={item.label} className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-600"><strong className="text-slate-900">{item.value}</strong> {item.label.toLowerCase()}</span>)}
        </div>
      </CardContent>
    </Card>
  );
}
