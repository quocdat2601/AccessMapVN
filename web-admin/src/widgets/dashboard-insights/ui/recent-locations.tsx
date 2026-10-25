import Link from "next/link";
import { ArrowUpRight, MapPin, MapPinned } from "lucide-react";
import type { DashboardSummary, PublishedLocation } from "@/entities/dashboard";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";

export function RecentLocations({ data, summary }: { data: PublishedLocation[]; summary: DashboardSummary }) {
  const coverage = Math.round((summary.coverageDistricts / summary.coverageDistrictsTotal) * 100);
  return (
    <Card className="h-full">
      <CardHeader className="p-4 pb-2">
        <div><CardTitle className="flex items-center gap-2"><MapPinned className="size-4 text-slate-400" />Độ phủ dữ liệu</CardTitle><CardDescription>{summary.locationsPublished} địa điểm mới trong kỳ</CardDescription></div>
        <Badge variant="teal">{coverage}% khu vực</Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className="mb-2"><div className="mb-1.5 flex justify-between text-[11px]"><span className="text-slate-500">Quận/huyện đạt chuẩn</span><strong>{summary.coverageDistricts}/{summary.coverageDistrictsTotal}</strong></div><Progress value={coverage} className="h-1.5" /></div>
        {data.length === 0 ? (
          <p className="py-3 text-xs text-slate-400">Chưa có địa điểm nào xuất bản gần đây.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.slice(0, 2).map((location) => (
              <div key={location.id} className="flex items-center gap-2.5 py-2">
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"><MapPin className="size-3.5" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{location.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-400">{location.district} · {location.category}</p></div>
                <div className="text-right"><p className="text-xs font-bold text-teal-700">{location.accessibilityScore}/100</p><p className="text-[10px] text-slate-400">{location.publishedAt}</p></div>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/bao-cao-du-lieu-do-phu" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800">Mở báo cáo <ArrowUpRight className="size-3" /></Link>
      </CardContent>
    </Card>
  );
}
