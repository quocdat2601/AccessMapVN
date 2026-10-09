"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WorkflowSlice } from "@/entities/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function WorkflowChart({ data }: { data: WorkflowSlice[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card>
      <CardHeader><div><CardTitle>Trạng thái quy trình</CardTitle><CardDescription>Phân bổ {total} mục tồn đọng hiện tại</CardDescription></div></CardHeader>
      <CardContent className="flex items-center gap-2 pt-2">
        <div className="relative h-40 min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={66} paddingAngle={3} stroke="none">
                {data.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><span className="text-2xl font-extrabold text-slate-950">{total}</span><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">mục</span></div>
        </div>
        <div className="w-[142px] space-y-3">
          {data.map((item) => <div key={item.name} className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2 text-slate-500"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.name}</span></span><strong className="text-slate-900">{item.value}</strong></div>)}
        </div>
      </CardContent>
    </Card>
  );
}
