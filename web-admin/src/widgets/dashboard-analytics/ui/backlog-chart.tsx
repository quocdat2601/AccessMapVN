"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/entities/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function BacklogChart({ data }: { data: TrendPoint[] }) {
  const start = data[0]?.backlog ?? 0;
  const end = data.at(-1)?.backlog ?? 0;
  const change = end - start;
  return (
    <Card>
      <CardHeader className="pb-1"><div><CardTitle>Xu hướng tồn đọng</CardTitle><CardDescription><span className={change <= 0 ? "font-semibold text-teal-700" : "font-semibold text-amber-700"}>{change > 0 ? `+${change}` : change} mục</span> so với đầu kỳ</CardDescription></div></CardHeader>
      <CardContent className="h-[190px] pb-3 pl-0 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
            <defs><linearGradient id="backlogFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.28} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 12 }} />
            <Area type="monotone" dataKey="backlog" name="Tồn đọng" stroke="#0f766e" fill="url(#backlogFill)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
