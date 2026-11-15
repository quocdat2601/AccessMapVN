"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Award, RefreshCw, Search, ShieldAlert, Trophy, UsersRound } from "lucide-react";
import { ApiError, apiRequest } from "@/shared/api/api-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";

interface AdminUserItem {
  id: string;
  displayName: string;
  role: string;
  isActive: boolean;
  reputationScore: number;
  reputationTier: string;
  expPoints: number;
  contributionsCount: number;
  reportsCount: number;
}

interface AdminUserListResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface LeaderboardEntry {
  rank: number;
  rankBadge?: string | null;
  userId: string;
  displayName: string;
  reputationScore: number;
  reputationTier: string;
  expPoints: number;
  contributionsCount: number;
}

interface LeaderboardResponse {
  items: LeaderboardEntry[];
  totalContributors: number;
}

function tierBadgeVariant(tier: string): "amber" | "teal" | "blue" | "neutral" {
  const lower = tier.toLowerCase();
  if (lower.includes("vàng")) return "amber";
  if (lower.includes("trusted")) return "teal";
  if (lower.includes("đồng")) return "blue";
  return "neutral";
}

export default function AdminUsersReputationPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [delta, setDelta] = useState("5");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchUsersAndLeaderboard() {
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "50" });
        if (search.trim()) params.set("search", search.trim());
        if (tierFilter !== "ALL") params.set("tier", tierFilter);

        const [usersRes, lbRes] = await Promise.all([
          apiRequest<AdminUserListResponse>(`/api/v1/admin/users?${params.toString()}`),
          apiRequest<LeaderboardResponse>("/api/v1/leaderboard?limit=10"),
        ]);
        if (!cancelled) {
          setUsers(usersRes.data.items);
          setTotal(usersRes.data.total);
          setLeaderboard(lbRes.data.items);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Không thể tải danh sách người dùng.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchUsersAndLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [search, tierFilter, reloadToken]);

  async function handleAdjustSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser) return;

    setActionError(null);
    setActionSuccess(null);
    const parsedDelta = Number(delta);
    if (!Number.isFinite(parsedDelta) || parsedDelta === 0) {
      setActionError("Vui lòng nhập mức điểm điều chỉnh khác 0 (trong khoảng ±100).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest<AdminUserItem>(
        `/api/v1/admin/users/${selectedUser.id}/reputation-adjustments`,
        {
          method: "POST",
          body: { delta: parsedDelta, reason: reason.trim() },
        },
      );
      setUsers((prev) => prev.map((item) => (item.id === res.data.id ? res.data : item)));
      setActionSuccess(
        `Đã cập nhật điểm uy tín của ${res.data.displayName} thành ${res.data.reputationScore} (${res.data.reputationTier}).`,
      );
      setSelectedUser(null);
      setReason("");
      triggerReload();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) {
        setActionError("Bị từ chối (403): Quản trị viên không được tự điều chỉnh điểm uy tín của chính mình.");
      } else {
        setActionError(cause instanceof Error ? cause.message : "Không thể điều chỉnh điểm uy tín.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-teal-700">Nền tảng · Quản trị thành viên</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-slate-950">
            <UsersRound className="size-6 text-teal-700" />
            Người dùng & Uy tín đóng góp
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Theo dõi điểm uy tín (+5 địa điểm mới / +2 bổ sung sau 30 ngày), bảng xếp hạng và điều chỉnh thủ công có kiểm soát.
          </p>
        </div>
        <Button variant="outline" onClick={triggerReload} disabled={isLoading}>
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </header>

      {actionError && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {actionSuccess}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Danh sách tài khoản ({total})</CardTitle>
              <CardDescription>Lọc theo tên hiển thị hoặc hạng uy tín hiện tại</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên hoặc ID..."
                  className="h-9 w-52 rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
                />
              </div>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="ALL">Tất cả hạng</option>
                <option value="Hạng Vàng">Hạng Vàng</option>
                <option value="Trusted">Trusted (1.5x)</option>
                <option value="Hạng Đồng">Hạng Đồng</option>
                <option value="Baseline">Mặc định (Baseline)</option>
              </select>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : error ? (
              <EmptyState title="Không tải được danh sách" description={error} />
            ) : users.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu phù hợp" description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc hạng uy tín." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2.5 pr-3">Thành viên</th>
                      <th className="py-2.5 px-3">Vai trò</th>
                      <th className="py-2.5 px-3">Hạng uy tín</th>
                      <th className="py-2.5 px-3 text-right">Điểm uy tín</th>
                      <th className="py-2.5 px-3 text-right">EXP</th>
                      <th className="py-2.5 px-3 text-right">Đóng góp / Báo cáo</th>
                      <th className="py-2.5 pl-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-900">{u.displayName}</div>
                          <div className="font-mono text-[11px] text-slate-400">{u.id}</div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={u.role === "Admin" ? "red" : "neutral"}>{u.role}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={tierBadgeVariant(u.reputationTier)}>{u.reputationTier}</Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">{u.reputationScore}</td>
                        <td className="py-3 px-3 text-right text-slate-600">{u.expPoints}</td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {u.contributionsCount} / {u.reportsCount}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setActionError(null);
                              setActionSuccess(null);
                            }}
                          >
                            Điều chỉnh điểm
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedUser && (
              <form onSubmit={handleAdjustSubmit} className="mt-5 rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Điều chỉnh điểm uy tín: {selectedUser.displayName} (Hiện tại: {selectedUser.reputationScore})
                  </h3>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>
                    Đóng
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Mức cộng/trừ (±100)</label>
                    <input
                      type="number"
                      step="1"
                      min="-100"
                      max="100"
                      value={delta}
                      onChange={(e) => setDelta(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Lý do bắt buộc</label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="VD: Thẩm định bổ sung ảnh chính xác hoặc xử lý vi phạm..."
                      required
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedUser(null)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Đang lưu..." : "Xác nhận điều chỉnh"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              Top 10 Bảng xếp hạng
            </CardTitle>
            <CardDescription>Cập nhật từ dữ liệu đóng góp đã công bố</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có thành viên đủ điều kiện xếp hạng.</p>
            ) : (
              leaderboard.map((entry) => (
                <div key={entry.userId} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                      {entry.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{entry.displayName}</p>
                      <p className="text-[11px] text-slate-500">{entry.reputationTier} · {entry.contributionsCount} đóng góp</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-amber-700 text-sm shrink-0">
                    <Award className="size-3.5" />
                    {entry.reputationScore}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
