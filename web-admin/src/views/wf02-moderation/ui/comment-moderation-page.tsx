"use client";

import { useMemo, useState } from "react";
import { MessageSquareWarning, RefreshCw } from "lucide-react";
import { formatEtagFromVersion, wf02AdminRepository, type AdminQueueQuery } from "@/entities/wf02";
import { useModerationQueue } from "@/features/wf02-moderation/model/use-moderation-queue";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

export function CommentModerationPage() {
  const query = useMemo<AdminQueueQuery>(() => ({ status: "PendingReview", page: 1, pageSize: 50 }), []);
  const queue = useModerationQueue("comments", query);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function moderate(locationId: string, id: string, version: number, decision: "Approve" | "Hide", etag?: string) {
    try {
      setError(null);
      await wf02AdminRepository.moderateComment(locationId, id, { decision, reason: reason[id]?.trim() || "Reviewed under WF-02 moderation policy.", expectedVersion: version }, etag || formatEtagFromVersion(version)!);
      queue.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Khong the kiem duyet binh luan.");
    }
  }

  return <div className="mx-auto w-full max-w-[1200px] space-y-4 p-4 sm:p-6"><header className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-teal-700">WF-02 · Comments</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold"><MessageSquareWarning className="size-6 text-teal-700" /> Kiem duyet binh luan cong dong</h1></div><Button variant="outline" onClick={queue.reload}><RefreshCw className="size-4" /> Lam moi</Button></header>{(queue.error || error) && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{queue.error || error}</div>}<div className="space-y-3">{queue.data?.items.map((item) => <Card key={item.id} className="p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start"><div className="flex-1"><p className="text-sm text-slate-800">{item.body}</p><p className="mt-1 text-xs text-slate-500">{item.locationName || item.locationId} · v{item.version ?? 1}</p><input className="mt-3 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs" placeholder="Ly do kiem duyet" value={reason[item.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [item.id]: event.target.value }))} /></div><div className="flex gap-2"><Button size="sm" onClick={() => moderate(item.locationId, item.id, item.version ?? 1, "Approve", item.etag)}>Duyet</Button><Button size="sm" variant="danger" onClick={() => moderate(item.locationId, item.id, item.version ?? 1, "Hide", item.etag)}>An</Button></div></div></Card>)}</div>{queue.data && !queue.data.items.length && <Card className="p-8 text-center text-sm text-slate-500">Khong co binh luan cho duyet.</Card>}</div>;
}
