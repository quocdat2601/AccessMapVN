"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardSummary, TrendPoint } from "@/entities/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { formatNumber } from "@/shared/lib/format";

export function VolumeTrendChart({ data, summary, rangeLabel }: { data: TrendPoint[]; summary: DashboardSummary; rangeLabel: string }) {
  return (
    <Card className="h-full min-w-0">
      <CardHeader className="flex-col border-b border-slate-100 p-4 pb-3 sm:flex-row sm:items-center">
        <div><CardTitle>Khối lượng tiếp nhận & xử lý</CardTitle><CardDescription>So sánh hồ sơ, tranh chấp và tổng mục đã hoàn tất</CardDescription></div>
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
          <span><strong className="text-slate-900">{formatNumber(summary.received)}</strong> tiếp nhận</span>
          <span className="h-4 w-px bg-slate-200" />
          <span><strong className="text-teal-700">{formatNumber(summary.resolved)}</strong> đã xử lý</span>
        </div>
      </CardHeader>
      <CardContent className="h-[270px] pb-3 pl-1 pt-3 sm:pl-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
            <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,.08)", fontSize: 12 }} labelStyle={{ color: "#0f172a", fontWeight: 700, marginBottom: 5 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconSize={8} />
            <Bar dataKey="submissions" name="Hồ sơ đóng góp" stackId="received" fill="#0f766e" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="disputes" name="Tranh chấp" stackId="received" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Line dataKey="resolved" name="Đã xử lý" type="monotone" stroke="#334155" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="sr-only">Dữ liệu cho {rangeLabel}</p>
      </CardContent>
    </Card>
  );
}
