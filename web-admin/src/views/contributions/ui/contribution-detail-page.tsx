"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowLeft, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Fingerprint, Link2, ShieldCheck, UserRound } from "lucide-react";
import type { ContributionDetail } from "@/entities/contribution";
import { contributionStatusMeta, contributionTypeLabels, formatDateTime } from "@/entities/contribution/lib/presentation";
import { useContributionDetail } from "@/features/contribution-moderation/model/use-contribution-detail";
import { ModerationPanel } from "@/features/contribution-moderation/ui/moderation-panel";
import { ClaimsTable, ContributorCard, EvidenceViewer, LocationIntegrityCard, TimelineCard } from "@/widgets/contribution-detail";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";

export function ContributionDetailPage({ id }: { id: string }) {
  const moderation = useContributionDetail(id);

  if (moderation.isLoading) return <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-6"><Skeleton className="h-28" /><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-[520px]" /><Skeleton className="h-80" /></div><Skeleton className="h-[460px]" /></div></div>;
  if (!moderation.data) return <div className="p-6"><EmptyState title="Không tìm thấy hồ sơ" description={moderation.error ?? "Hồ sơ này không tồn tại trong dữ liệu hiện tại."} /></div>;

  return <DetailContent detail={moderation.data} moderation={moderation} />;
}

function DetailContent({ detail, moderation }: { detail: ContributionDetail; moderation: ReturnType<typeof useContributionDetail> }) {
  const [selectedClaimIds, setSelectedClaimIds] = useState(() => detail.claims.filter((claim) => claim.eligibleForApproval).map((claim) => claim.id));
  const status = contributionStatusMeta[detail.status];

  return <div className="mx-auto w-full max-w-[1500px] space-y-4 p-4 sm:p-5 xl:p-6">
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div><p className="text-xs font-medium text-slate-400">Admin <span className="mx-1">›</span> Kiểm duyệt <span className="mx-1">›</span> <Link href="/admin/ho-so-dong-gop" className="hover:text-teal-700">Hồ sơ đóng góp</Link> <span className="mx-1">›</span> <strong className="text-slate-600">{detail.id}</strong></p></div><div className="flex items-center gap-2"><Link href="/admin/ho-so-dong-gop" className={buttonVariants({ variant: "outline", size: "sm" })}><ArrowLeft className="size-3.5" />Quay lại danh sách</Link><div className="flex items-center rounded-lg border border-slate-200 bg-white"><Link href={moderation.navigation?.previousId ? `/admin/ho-so-dong-gop/${moderation.navigation.previousId}` : "#"} aria-disabled={!moderation.navigation?.previousId} className={`grid size-8 place-items-center ${!moderation.navigation?.previousId ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-50"}`}><ChevronLeft className="size-4" /></Link><span className="border-x border-slate-200 px-2 text-[10px] font-semibold text-slate-500">{moderation.navigation?.current ?? "—"}/{moderation.navigation?.total ?? "—"}</span><Link href={moderation.navigation?.nextId ? `/admin/ho-so-dong-gop/${moderation.navigation.nextId}` : "#"} aria-disabled={!moderation.navigation?.nextId} className={`grid size-8 place-items-center ${!moderation.navigation?.nextId ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-50"}`}><ChevronRight className="size-4" /></Link></div></div></div>

    <Card className="p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{detail.status === "pending" ? `Kiểm duyệt hồ sơ ${detail.id}` : detail.place.name}</h1><Badge variant={status.badge} className="gap-1.5"><span className="size-1.5 rounded-full bg-current" />{status.label}</Badge><Badge variant="neutral">{contributionTypeLabels[detail.type]}</Badge></div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><UserRound className="size-3.5" />Người gửi: <strong className="text-slate-700">{detail.contributor.name}</strong> ({detail.contributor.reputationScore} điểm uy tín)</span><span>Gửi: {formatDateTime(detail.submittedAt)}</span><span>{detail.attemptLabel}</span></div></div>{detail.status === "published" && <Badge variant="teal" className="gap-1"><ShieldCheck className="size-3" />Bản ghi lịch sử chỉ đọc</Badge>}</div></Card>

    {moderation.error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="size-4" />{moderation.error}</div>}

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="min-w-0 space-y-4"><LocationIntegrityCard detail={detail} /><EvidenceViewer evidence={detail.evidence} /><ClaimsTable claims={detail.claims} status={detail.status} selectedIds={selectedClaimIds} onSelectionChange={setSelectedClaimIds} /><SecondaryDetails detail={detail} /></main>
      <aside className="space-y-4 xl:sticky xl:top-[89px]"><ModerationPanel detail={detail} selectedClaimIds={selectedClaimIds} isMutating={moderation.isMutating} onApprove={moderation.approve} onRequestMoreInfo={moderation.requestMoreInfo} onReject={moderation.reject} onSendReminder={moderation.sendReminder} /><ContributorCard detail={detail} /><TimelineCard events={detail.timeline} /></aside>
    </div>
  </div>;
}

function SecondaryDetails({ detail }: { detail: ContributionDetail }) {
  const sections = [
    { icon: Fingerprint, title: "Chi tiết kiểm định kỹ thuật & dữ liệu EXIF", content: detail.technicalNotes },
    { icon: BookOpen, title: "Tiêu chuẩn kỹ thuật áp dụng", content: detail.applicableStandards },
    { icon: Link2, title: `Liên kết & tham chiếu cơ sở dữ liệu ${detail.locationIntegrity.poiCode}`, content: [`Hồ sơ nguồn: ${detail.id}`, `Mã địa điểm: ${detail.place.id}`, "Bản ghi mock chưa kết nối API backend."] },
  ];
  return <div className="space-y-2">{sections.map((section) => { const Icon = section.icon; return <details key={section.title} className="group rounded-xl border border-slate-200 bg-white"><summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-bold text-slate-800"><Icon className="size-4 text-teal-700" /><span className="flex-1">{section.title}</span><ChevronDown className="size-4 text-slate-400 transition group-open:rotate-180" /></summary><div className="border-t border-slate-100 px-4 py-3"><ul className="space-y-2">{section.content.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-500" />{item}</li>)}</ul></div></details>; })}</div>;
}
