"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import {
  featureLabels,
  formatAdminDate,
  reportReasonLabels,
  reportStatusLabels,
  type ReportDecision,
  type ReportResolution,
  wf02AdminRepository,
} from "@/entities/wf02";
import { useReportDetail } from "@/features/wf02-moderation/model/use-report-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";

const decisions: ReportDecision[] = ["StartReview", "RequestEvidence", "LinkDispute", "Resolve", "Reject"];
const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export function ReportDetailPage({ id }: { id: string }) {
  const detail = useReportDetail(id);
  const [decision, setDecision] = useState<ReportDecision>("StartReview");
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState<ReportResolution>("BaselineRetained");
  const [linkedId, setLinkedId] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);

  async function openEvidence(evidenceId: string) {
    setOpeningEvidenceId(evidenceId);
    try {
      const response = await wf02AdminRepository.getEvidenceAccess(id, evidenceId);
      window.open(response.data.accessUrl, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningEvidenceId(null);
    }
  }

  async function transition(event: FormEvent) {
    event.preventDefault();
    if (!detail.data) return;
    await detail.transition({
      decision,
      note: note.trim(),
      expectedVersion: detail.data.version,
      resolution: decision === "Resolve" ? resolution : undefined,
      linkedDisputeCaseId: decision === "LinkDispute" ? linkedId.trim() || undefined : undefined,
      linkedSubmissionId: resolution === "CorrectionPublished" ? linkedId.trim() || undefined : undefined,
    });
  }

  async function correctMetadata(event: FormEvent) {
    event.preventDefault();
    if (!detail.data?.locationMetadataVersion) return;
    await detail.correctMetadata({ expectedMetadataVersion: detail.data.locationMetadataVersion, sourceReportId: detail.data.id, reason: note.trim(), proposedAddress: address.trim() || undefined, proposedPosition: latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : undefined });
  }

  if (detail.isLoading) return <div className="space-y-4 p-6"><Skeleton className="h-10" /><Skeleton className="h-72" /></div>;
  if (!detail.data) return <div className="p-6"><EmptyState title="Khong tai duoc bao cao" description={detail.error ?? "Khong tim thay bao cao."} /></div>;
  const data = detail.data;

  return <div className="mx-auto w-full max-w-[1300px] space-y-4 p-4 sm:p-6">
    <Link href="/admin/bao-cao-sai-lech" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"><ArrowLeft className="size-4" /> Quay lai hang doi</Link>
    <header><p className="text-xs font-semibold text-teal-700">WF-02 Report · v{data.version}</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">{data.locationName || data.locationId}</h1><div className="mt-2 flex flex-wrap gap-2"><Badge variant="red">{reportReasonLabels[data.reason]}</Badge><Badge variant="blue">{reportStatusLabels[data.status]}</Badge>{data.featureType && <Badge>{featureLabels[data.featureType]}{data.observedFeatureVersion ? ` · v${data.observedFeatureVersion}` : ""}</Badge>}</div></header>
    {detail.error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detail.error}</div>}
    {detail.conflict && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Version da thay doi; trang dang tai lai du lieu moi.</div>}
    <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>Noi dung nguoi dung gui</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p className="whitespace-pre-wrap text-slate-800">{data.description}</p><p className="text-xs text-slate-500">Gui luc {formatAdminDate(data.createdAt)} · {data.reporterDisplayName ?? "Nguoi bao cao"}</p>{data.proposedAddress && <p className="rounded-lg bg-amber-50 p-2 text-amber-900">Dia chi de xuat: {data.proposedAddress}</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Minh chung rieng tu</CardTitle></CardHeader><CardContent className="space-y-2">{data.evidence.length ? data.evidence.map((item) => <div key={item.id} className="rounded-lg border border-slate-100 p-3 text-sm"><p>{item.description || "Tep minh chung da duoc xac thuc quyen truy cap."}</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{formatAdminDate(item.createdAt)}</span>{item.mediaContentType && <Button size="sm" variant="outline" disabled={openingEvidenceId === item.id} onClick={() => void openEvidence(item.id)}><ExternalLink className="size-3.5" /> Mo tep 5 phut</Button>}</div></div>) : <p className="text-sm text-slate-500">Chua co minh chung bo sung.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Lich su trang thai</CardTitle></CardHeader><CardContent className="space-y-3">{data.history.map((item) => <div key={item.id} className="border-l-2 border-teal-200 pl-3 text-sm"><strong>{reportStatusLabels[item.toStatus]}</strong><p className="text-slate-600">{item.reason}</p><span className="text-xs text-slate-400">{formatAdminDate(item.occurredAt)}</span></div>)}</CardContent></Card>
      </div>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>Chuyen trang thai</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={transition}><select className={inputClass} value={decision} onChange={(event) => setDecision(event.target.value as ReportDecision)}>{decisions.map((value) => <option key={value}>{value}</option>)}</select><textarea required className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Ghi chu/ly do bat buoc" value={note} onChange={(event) => setNote(event.target.value)} />{decision === "Resolve" && <select className={inputClass} value={resolution} onChange={(event) => setResolution(event.target.value as ReportResolution)}><option>BaselineRetained</option><option>AdvisoryCreated</option><option>CorrectionPublished</option></select>}{(decision === "LinkDispute" || resolution === "CorrectionPublished") && <input className={inputClass} placeholder="Dispute/Submission UUID" value={linkedId} onChange={(event) => setLinkedId(event.target.value)} />}<Button className="w-full" disabled={detail.isMutating || !note.trim()} type="submit"><ShieldCheck className="size-4" /> Luu trang thai</Button></form></CardContent></Card>
        {data.reason === "WrongAddressOrPin" && <Card><CardHeader><CardTitle>Sua metadata co version</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={correctMetadata}><input className={inputClass} placeholder={data.currentAddress || "Dia chi moi"} value={address} onChange={(event) => setAddress(event.target.value)} /><div className="grid grid-cols-2 gap-2"><input className={inputClass} inputMode="decimal" placeholder="Latitude" value={latitude} onChange={(event) => setLatitude(event.target.value)} /><input className={inputClass} inputMode="decimal" placeholder="Longitude" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></div><Button variant="outline" className="w-full" disabled={!data.locationMetadataVersion || !note.trim()} type="submit"><MapPin className="size-4" /> Ap dung metadata</Button><p className="text-xs text-slate-500">expectedMetadataVersion: {data.locationMetadataVersion ?? "khong co"}</p></form></CardContent></Card>}
      </div>
    </div>
  </div>;
}
