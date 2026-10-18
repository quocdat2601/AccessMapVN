"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import {
  disputeDecisionLabels,
  disputeStatusLabels,
  featureLabels,
  formatAdminDate,
  type DisputeDecisionType,
} from "@/entities/wf02";
import { useDisputeDetail } from "@/features/wf02-moderation/model/use-dispute-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";

const decisions = Object.keys(disputeDecisionLabels) as DisputeDecisionType[];
const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export function DisputeDetailPage({ id }: { id: string }) {
  const detail = useDisputeDetail(id);
  const [decision, setDecision] = useState<DisputeDecisionType>("RequestEvidence");
  const [reason, setReason] = useState("");
  const [correctionSubmissionId, setCorrectionSubmissionId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await detail.decide({
      decision,
      reason: reason.trim(),
      correctionSubmissionId: correctionSubmissionId.trim() || undefined,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      advisoryReason: decision === "CreateAdvisory" ? reason.trim() : undefined,
    });
  }

  if (detail.isLoading) return <div className="space-y-4 p-6"><Skeleton className="h-10" /><Skeleton className="h-72" /></div>;
  if (!detail.data) return <div className="p-6"><EmptyState title="Khong tai duoc tranh chap" description={detail.error ?? "Khong tim thay tranh chap."} /></div>;

  const data = detail.data;
  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-4 p-4 sm:p-6">
      <Link href="/admin/tranh-chap-tiep-can" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"><ArrowLeft className="size-4" /> Quay lai hang doi</Link>
      <header>
        <p className="text-xs font-semibold text-teal-700">WF-02 · v{data.version}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-950">{data.locationName || data.locationId}</h1>
        <div className="mt-2 flex flex-wrap gap-2"><Badge variant="amber">{featureLabels[data.featureType]}</Badge><Badge variant="blue">{disputeStatusLabels[data.status]}</Badge></div>
      </header>

      {detail.error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detail.error}</div>}
      {detail.conflict && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">ETag da cu; bieu mau da tai lai ban moi nhat.</div>}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>Thong tin tranh chap</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{data.openReason}</p><p className="text-slate-500">Feature v{data.featureVersion} · mo luc {formatAdminDate(data.openedAt)}</p><p className="font-mono text-xs text-slate-500">{data.id}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Quan sat lien quan</CardTitle></CardHeader><CardContent className="space-y-3">{data.votes.length ? data.votes.map((vote) => <div key={vote.id} className="rounded-lg border border-slate-100 p-3 text-sm"><div className="flex justify-between gap-3"><strong>{vote.voteType}</strong><span className="text-xs text-slate-500">{formatAdminDate(vote.createdAt)}</span></div><p className="mt-1 text-slate-600">{vote.proposedStatus ?? "Baseline"}{vote.comment ? ` · ${vote.comment}` : ""}</p></div>) : <p className="text-sm text-slate-500">Khong co quan sat duoc phep hien thi.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Lich su quyet dinh</CardTitle></CardHeader><CardContent className="space-y-3">{data.decisions.length ? data.decisions.map((item) => <div key={item.id} className="border-l-2 border-teal-200 pl-3 text-sm"><strong>{disputeDecisionLabels[item.decisionType]}</strong><p className="text-slate-600">{item.reason}</p><span className="text-xs text-slate-400">{formatAdminDate(item.decidedAt)} · v{item.caseVersion}</span></div>) : <p className="text-sm text-slate-500">Chua co quyet dinh.</p>}</CardContent></Card>
        </div>

        <Card className="h-fit"><CardHeader><CardTitle>Ghi quyet dinh</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={submit}><select className={inputClass} value={decision} onChange={(event) => setDecision(event.target.value as DisputeDecisionType)}>{decisions.map((value) => <option key={value} value={value}>{disputeDecisionLabels[value]}</option>)}</select><textarea required minLength={3} className="min-h-28 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-500" placeholder="Ly do bat buoc" value={reason} onChange={(event) => setReason(event.target.value)} />{(decision === "LinkCorrection" || decision === "RecordPublication") && <input className={inputClass} placeholder="Correction submission UUID" value={correctionSubmissionId} onChange={(event) => setCorrectionSubmissionId(event.target.value)} />}{decision === "CreateAdvisory" && <div className="grid gap-2 sm:grid-cols-2"><input required type="datetime-local" className={inputClass} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /><input required type="datetime-local" className={inputClass} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div>}<Button className="w-full" disabled={detail.isMutating || !reason.trim()} type="submit"><ShieldAlert className="size-4" />{detail.isMutating ? "Dang luu..." : "Xac nhan quyet dinh"}</Button><p className="text-xs leading-5 text-slate-500">Quyet dinh nay khong sua truc tiep feature da cong bo. RecordPublication chi hop le voi publication WF-01 cung feature.</p></form></CardContent></Card>
      </div>
    </div>
  );
}
