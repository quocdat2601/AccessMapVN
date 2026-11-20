"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, RefreshCw } from "lucide-react";
import { apiRequest } from "@/shared/api/api-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";

interface AdvisoryItem {
  id: string;
  locationFeatureId: string;
  locationId?: string | null;
  locationName: string;
  featureType: string;
  status: string;
  reason: string;
  startsAt: string;
  endsAt: string;
  revocationReason?: string | null;
}

function statusVariant(status: string): "amber" | "teal" | "neutral" | "red" {
  switch (status) {
    case "Active":
      return "amber";
    case "Revoked":
      return "teal";
    case "Expired":
      return "neutral";
    default:
      return "red";
  }
}

export default function AdvisoriesPage() {
  const [items, setItems] = useState<AdvisoryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchAdvisories() {
      try {
        const query = statusFilter === "ALL" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
        const res = await apiRequest<AdvisoryItem[]>(`/api/v1/admin/advisories${query}`);
        if (!cancelled) {
          setItems(res.data);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Không thể tải danh sách cảnh báo tạm thời.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchAdvisories();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, reloadToken]);

  async function handleDeactivate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await apiRequest<AdvisoryItem>(`/api/v1/admin/advisories/${id}/deactivate`, {
        method: "POST",
        body: { reason: "Quản trị viên đã xác nhận sự cố tiếp cận được khắc phục." },
      });
      setItems((prev) => prev.map((item) => (item.id === id ? res.data : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đóng cảnh báo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-teal-700">Hệ thống · Giám sát thay đổi hiện trường</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-slate-950">
            <BellRing className="size-6 text-teal-700" />
            Cảnh báo & Sự cố tiếp cận tạm thời
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Theo dõi các cảnh báo hỏng hóc hoặc thay đổi lối đi tạm thời tại địa điểm và đóng cảnh báo khi đã khắc phục.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Active">Đang hiệu lực (Active)</option>
            <option value="Scheduled">Đã lên lịch (Scheduled)</option>
            <option value="Revoked">Đã đóng (Revoked)</option>
            <option value="Expired">Hết hạn (Expired)</option>
          </select>
          <Button variant="outline" onClick={triggerReload} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách cảnh báo tạm thời ({items.length})</CardTitle>
          <CardDescription>Quản trị viên có thể thu hồi cảnh báo ngay khi hiện trường hoạt động bình thường trở lại</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : error ? (
            <EmptyState title="Không tải được cảnh báo" description={error} />
          ) : items.length === 0 ? (
            <EmptyState
              title="Không có cảnh báo sự cố nào"
              description="Hiện chưa ghi nhận cảnh báo tiếp cận tạm thời nào trong bộ lọc đã chọn."
            />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{item.locationName}</span>
                      <Badge variant="blue">{item.featureType}</Badge>
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-700">{item.reason}</p>
                    <p className="text-xs text-slate-400">
                      Hiệu lực: {new Date(item.startsAt).toLocaleDateString("vi-VN")} → {new Date(item.endsAt).toLocaleDateString("vi-VN")}
                      {item.revocationReason ? ` · Ghi chú đóng: ${item.revocationReason}` : ""}
                    </p>
                  </div>
                  {(item.status === "Active" || item.status === "Scheduled") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => void handleDeactivate(item.id)}
                    >
                      <CheckCircle2 className="size-4 text-teal-700" />
                      {busyId === item.id ? "Đang xử lý..." : "Đánh dấu đã khắc phục"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
