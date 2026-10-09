import { Clock3 } from "lucide-react";
import type { DistributionItem } from "@/entities/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

const tones = { teal: "bg-teal-600", blue: "bg-sky-500", slate: "bg-slate-500", amber: "bg-amber-500", red: "bg-red-500" };

export function BacklogAging({ data }: { data: DistributionItem[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card className="h-full">
      <CardHeader className="p-4 pb-3"><div><CardTitle className="flex items-center gap-2"><Clock3 className="size-4 text-slate-400" />Tuổi tồn đọng</CardTitle><CardDescription>{total} mục đang chờ xử lý</CardDescription></div><Badge variant="red">5 quá hạn</Badge></CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-label="Phân bố tuổi tồn đọng">
          {data.map((item) => <span key={item.label} className={tones[item.tone]} style={{ width: `${item.percentage}%` }} title={`${item.label}: ${item.value} mục`} />)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {data.map((item) => <div key={item.label} className="flex items-center gap-1.5 text-[11px]"><span className={`size-2 rounded-full ${tones[item.tone]}`} /><span className="min-w-0 flex-1 truncate text-slate-500">{item.label}</span><strong className="text-slate-800">{item.value}</strong></div>)}
        </div>
      </CardContent>
    </Card>
  );
}
