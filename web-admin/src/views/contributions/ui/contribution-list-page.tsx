"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Clock3, FilterX, MapPinned, RefreshCw, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import type { AccessibilityCategory, ContributionDateFilter, ContributionQueueView, ContributionSort, ContributionStatus, ContributionType, ContributionWarningFilter } from "@/entities/contribution";
import { accessibilityCategories } from "@/entities/contribution/lib/presentation";
import { useContributionQueue } from "@/features/contribution-queue/model/use-contribution-queue";
import { ContributionTable } from "@/widgets/contribution-list";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";

type StatusTab = ContributionStatus | "all";
const selectClass = "h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export function ContributionListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusTab>("all");
  const [type, setType] = useState<ContributionType | "all">("all");
  const [category, setCategory] = useState<AccessibilityCategory | "all">("all");
  const [warning, setWarning] = useState<ContributionWarningFilter>("all");
  const [date, setDate] = useState<ContributionDateFilter>("all");
  const [view, setView] = useState<ContributionQueueView>("all");
  const [sort, setSort] = useState<ContributionSort>("oldest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const query = useMemo(() => ({ search, status, type, category, warning, date, view, sort, page, pageSize }), [search, status, type, category, warning, date, view, sort, page, pageSize]);
  const { data, error, isLoading } = useContributionQueue(query);
  const hasFilters = search || status !== "all" || type !== "all" || category !== "all" || warning !== "all" || date !== "all" || view !== "all";

  const resetPage = () => setPage(1);
  const resetFilters = () => { setSearch(""); setStatus("all"); setType("all"); setCategory("all"); setWarning("all"); setDate("all"); setView("all"); setSort("oldest"); setPage(1); };

  const tabs: Array<{ value: StatusTab; label: string; count: number }> = [
    { value: "all", label: "Tất cả", count: data?.summary.total ?? 0 },
    { value: "pending", label: "Chờ kiểm duyệt", count: data?.summary.awaitingDecision ?? 0 },
    { value: "needs_supplement", label: "Chờ bổ sung", count: data?.summary.needsSupplement ?? 0 },
    { value: "published", label: "Đã công bố", count: data?.summary.published ?? 0 },
    { value: "rejected", label: "Đã từ chối", count: data?.summary.rejected ?? 0 },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-5 xl:p-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-medium text-slate-400">Admin <span className="mx-1">›</span> Kiểm duyệt <span className="mx-1">›</span> Hồ sơ đóng góp</p><h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-950">Hồ sơ đóng góp</h1><p className="mt-1 text-sm text-slate-500">Kiểm duyệt các đóng góp dữ liệu tiếp cận cần xác minh thủ công.</p></div>
        <div className="flex items-center gap-2"><Badge variant="teal" className="gap-1.5 px-3 py-1.5"><span className="size-2 rounded-full bg-teal-600" />{data?.summary.active ?? "—"} hồ sơ cần hành động</Badge><span className="hidden items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs text-slate-400 sm:flex"><RefreshCw className="size-3.5" />Cập nhật 1 phút trước</span></div>
      </header>

      <Card className="overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 px-3 sm:px-4" role="tablist" aria-label="Lọc theo trạng thái">
          {tabs.map((tab) => <button key={tab.value} role="tab" aria-selected={status === tab.value} onClick={() => { setStatus(tab.value); resetPage(); }} className={cn("relative flex h-12 shrink-0 items-center gap-2 px-3 text-sm font-semibold text-slate-500 transition hover:text-slate-900", status === tab.value && "text-teal-800 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-teal-700")}><span>{tab.label}</span><span className={cn("rounded-full bg-slate-100 px-2 py-0.5 text-[10px]", status === tab.value && "bg-teal-100 text-teal-800")}>{tab.count}</span></button>)}
          <div className="ml-auto hidden items-center gap-1.5 pl-4 text-[11px] font-medium text-slate-400 xl:flex"><ShieldCheck className="size-4 text-teal-600" />AI hỗ trợ · quyết định bởi kiểm duyệt viên</div>
        </div>

        <div className="space-y-3 border-b border-slate-200 bg-slate-50/50 p-3 sm:p-4">
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(130px,auto))]">
            <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="Tìm mã hồ sơ, địa điểm, người gửi..." /></label>
            <select className={selectClass} value={type} onChange={(event) => { setType(event.target.value as ContributionType | "all"); resetPage(); }} aria-label="Loại đóng góp"><option value="all">Loại: Tất cả</option><option value="new_place">Địa điểm mới</option><option value="place_update">Cập nhật địa điểm</option></select>
            <select className={selectClass} value={category} onChange={(event) => { setCategory(event.target.value as AccessibilityCategory | "all"); resetPage(); }} aria-label="Hạng mục"><option value="all">Hạng mục: Tất cả</option>{accessibilityCategories.map((item) => <option key={item}>{item}</option>)}</select>
            <select className={selectClass} value={warning} onChange={(event) => { setWarning(event.target.value as ContributionWarningFilter); resetPage(); }} aria-label="Cảnh báo"><option value="all">Cảnh báo: Tất cả</option><option value="warning">Có cảnh báo</option><option value="over_sla">Vượt SLA 2 giờ</option></select>
            <select className={selectClass} value={date} onChange={(event) => { setDate(event.target.value as ContributionDateFilter); resetPage(); }} aria-label="Ngày gửi"><option value="all">Ngày gửi: Tất cả</option><option value="today">Hôm nay</option><option value="7d">7 ngày qua</option><option value="30d">30 ngày qua</option></select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chế độ xem</span>
            {[{ value: "all", label: "Tất cả", icon: Check }, { value: "waiting_long", label: "Chờ lâu >2 giờ", icon: Clock3 }, { value: "warning", label: "Có cảnh báo", icon: TriangleAlert }, { value: "new_place", label: "Địa điểm mới", icon: MapPinned }].map((option) => { const Icon = option.icon; return <button key={option.value} onClick={() => { setView(option.value as ContributionQueueView); resetPage(); }} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300", view === option.value && "border-teal-700 bg-teal-700 text-white")}><Icon className="size-3" />{option.label}</button>; })}
            <select className={cn(selectClass, "ml-auto")} value={sort} onChange={(event) => { setSort(event.target.value as ContributionSort); resetPage(); }} aria-label="Sắp xếp"><option value="oldest">Sắp xếp: Chờ lâu nhất</option><option value="newest">Mới nhất</option><option value="lowest_confidence">AI tin cậy thấp nhất</option><option value="highest_reputation">Uy tín cao nhất</option></select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters}><FilterX className="size-3.5" />Xóa lọc</Button>}
          </div>
        </div>

        {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-16" />)}</div> : error ? <div className="p-6"><EmptyState title="Không tải được danh sách" description={error} /></div> : data && data.items.length > 0 ? <ContributionTable items={data.items} /> : <div className="p-6"><EmptyState title="Không có hồ sơ phù hợp" description="Hãy thử thay đổi từ khóa hoặc bộ lọc hiện tại." /></div>}

        {data && data.items.length > 0 && <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:flex-row"><div className="flex items-center gap-2 text-slate-500"><span>Hiển thị {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} trong {data.total} hồ sơ</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1"><option value={8}>8 / trang</option><option value={12}>12 / trang</option><option value={20}>20 / trang</option></select><span className="hidden items-center gap-1 sm:flex"><Clock3 className="size-3.5 text-teal-600" />SLA mục tiêu: dưới {data.slaTargetMinutes / 60} giờ</span></div><div className="flex items-center gap-1"><Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="size-3.5" />Trước</Button><span className="px-2 font-semibold text-slate-700">{data.page}/{data.totalPages}</span><Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => setPage((current) => current + 1)}>Tiếp<ChevronRight className="size-3.5" /></Button></div></footer>}
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-800"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p><strong>Nguyên tắc vận hành:</strong> AI chỉ cung cấp đánh giá tham khảo. Hồ sơ có cảnh báo hoặc dữ liệu mâu thuẫn cần được đối chiếu từng bằng chứng trước khi ra quyết định.</p></div>
    </div>
  );
}
