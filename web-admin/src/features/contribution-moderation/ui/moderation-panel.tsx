"use client";

import { useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Clock3, ExternalLink, FileWarning, Gavel, Send, ShieldCheck, XCircle } from "lucide-react";
import type { ApproveContributionInput, ContributionDetail, RequestMoreInfoInput } from "@/entities/contribution";
import { formatDateTime } from "@/entities/contribution/lib/presentation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";

interface ModerationPanelProps {
  detail: ContributionDetail;
  selectedClaimIds: string[];
  isMutating: boolean;
  onApprove: (input: ApproveContributionInput) => Promise<ContributionDetail>;
  onRequestMoreInfo: (input: RequestMoreInfoInput) => Promise<ContributionDetail>;
  onReject: (reason: string) => Promise<ContributionDetail>;
  onSendReminder: () => Promise<ContributionDetail>;
}

export function ModerationPanel(props: ModerationPanelProps) {
  const { detail } = props;
  if (detail.status === "pending") return <PendingPanel {...props} />;
  if (detail.status === "needs_supplement") return <WaitingPanel detail={detail} isMutating={props.isMutating} onSendReminder={props.onSendReminder} />;
  return <ReadOnlyDecision detail={detail} />;
}

function PendingPanel({ detail, selectedClaimIds, isMutating, onApprove, onRequestMoreInfo, onReject }: ModerationPanelProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("Bằng chứng đủ rõ và được đối soát độc lập theo từng hạng mục.");
  const [requestClaims, setRequestClaims] = useState<string[]>(selectedClaimIds.length ? selectedClaimIds : detail.claims.map((claim) => claim.id));
  const [evidenceItems, setEvidenceItems] = useState<string[]>(["Ảnh toàn cảnh", "Ảnh góc bên"]);
  const [instructions, setInstructions] = useState("Vui lòng bổ sung ảnh thể hiện rõ điểm bắt đầu, điểm kết thúc và tay vịn của hạng mục cần xác minh.");
  const [rejectReason, setRejectReason] = useState("");

  const toggle = (values: string[], value: string, setter: (next: string[]) => void) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  return <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-bold text-slate-950"><Gavel className="size-4 text-teal-700" />Quyết định kiểm duyệt</h2><p className="mt-1 text-xs text-slate-500">Chọn riêng từng hạng mục đủ điều kiện.</p></div><Badge variant="teal">Sẵn sàng xem xét</Badge></div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs"><div className="flex justify-between"><span className="text-slate-500">Hạng mục được chọn</span><strong className="text-teal-700">{selectedClaimIds.length}/{detail.claims.length}</strong></div><p className="mt-2 text-[10px] leading-4 text-slate-500">AI chỉ đóng vai trò tư vấn hỗ trợ. Kiểm duyệt viên chịu trách nhiệm thẩm định và quyết định công bố.</p></div><div className="mt-4 space-y-2">
    <Dialog open={approveOpen} onOpenChange={setApproveOpen}><DialogTrigger asChild><Button className="w-full" disabled={selectedClaimIds.length === 0}><CheckCircle2 className="size-4" />Phê duyệt hạng mục đã chọn</Button></DialogTrigger><DialogContent><DialogTitle>Xác nhận công bố dữ liệu</DialogTitle><DialogDescription>{selectedClaimIds.length} hạng mục sẽ được phê duyệt và cập nhật vào dữ liệu địa điểm. Các hạng mục không chọn sẽ không được công bố.</DialogDescription><label className="mt-4 block text-sm font-semibold text-slate-700">Ghi chú kiểm duyệt<textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setApproveOpen(false)}>Hủy</Button><Button disabled={isMutating || !note.trim()} onClick={async () => { await onApprove({ claimIds: selectedClaimIds, note }); setApproveOpen(false); }}>{isMutating ? "Đang xử lý..." : "Xác nhận phê duyệt"}</Button></div></DialogContent></Dialog>
    <Dialog open={requestOpen} onOpenChange={setRequestOpen}><DialogTrigger asChild><Button variant="secondary" className="w-full"><FileWarning className="size-4" />Yêu cầu bổ sung minh chứng</Button></DialogTrigger><DialogContent className="max-w-xl"><DialogTitle>Yêu cầu bổ sung thông tin</DialogTitle><DialogDescription>Chọn hạng mục và loại minh chứng còn thiếu. Yêu cầu sẽ được lưu vào lịch sử hồ sơ.</DialogDescription><div className="mt-4 space-y-4"><fieldset><legend className="text-xs font-bold text-slate-700">Hạng mục cần hiệu chỉnh</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{detail.claims.map((claim) => <label key={claim.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-xs"><input type="checkbox" checked={requestClaims.includes(claim.id)} onChange={() => toggle(requestClaims, claim.id, setRequestClaims)} className="accent-teal-700" />{claim.feature}</label>)}</div></fieldset><fieldset><legend className="text-xs font-bold text-slate-700">Minh chứng cần bổ sung</legend><div className="mt-2 grid gap-2">{["Ảnh toàn cảnh", "Ảnh góc bên", "Video hành trình 5–10 giây", "Giải thích bằng văn bản"].map((item) => <label key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs"><input type="checkbox" checked={evidenceItems.includes(item)} onChange={() => toggle(evidenceItems, item, setEvidenceItems)} className="accent-teal-700" />{item}</label>)}</div></fieldset><label className="block text-xs font-bold text-slate-700">Hướng dẫn cụ thể<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setRequestOpen(false)}>Hủy</Button><Button disabled={isMutating || !requestClaims.length || !evidenceItems.length || !instructions.trim()} onClick={async () => { await onRequestMoreInfo({ claimIds: requestClaims, evidenceItems, instructions }); setRequestOpen(false); }}><Send className="size-4" />Gửi yêu cầu</Button></div></DialogContent></Dialog>
    <Dialog open={rejectOpen} onOpenChange={setRejectOpen}><DialogTrigger asChild><Button variant="danger" className="w-full"><XCircle className="size-4" />Từ chối hồ sơ</Button></DialogTrigger><DialogContent><DialogTitle>Từ chối hồ sơ này?</DialogTitle><DialogDescription>Quyết định và lý do sẽ được lưu trong lịch sử. Hồ sơ không bị xóa hoặc tự động khôi phục.</DialogDescription><label className="mt-4 block text-sm font-semibold text-slate-700">Lý do từ chối <span className="text-red-600">*</span><textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Nêu rõ bằng chứng hoặc hạng mục không đủ điều kiện..." className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" /></label><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setRejectOpen(false)}>Hủy</Button><Button variant="danger" disabled={isMutating || !rejectReason.trim()} onClick={async () => { await onReject(rejectReason); setRejectOpen(false); }}>Xác nhận từ chối</Button></div></DialogContent></Dialog>
  </div></Card>;
}

function WaitingPanel({ detail, isMutating, onSendReminder }: Pick<ModerationPanelProps, "detail" | "isMutating" | "onSendReminder">) {
  const request = detail.informationRequest;
  return <Card className="p-4"><div className="flex items-start justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-bold text-amber-900"><FileWarning className="size-4" />Yêu cầu bổ sung</h2><Badge variant="amber">{detail.attemptLabel}</Badge></div>{request && <><div className="mt-4 rounded-lg bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Hướng dẫn đã gửi</p><p className="mt-1 text-xs leading-5 text-amber-950">{request.instructions}</p></div><div className="mt-3 space-y-2">{request.evidenceItems.map((item) => <div key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700"><AlertTriangle className="size-3.5 text-amber-600" />{item}</div>)}</div><div className="mt-3 flex items-center justify-between text-[11px] text-slate-500"><span>Hạn phản hồi: {formatDateTime(request.dueAt)}</span><Badge variant={request.responseStatus === "waiting" ? "amber" : "teal"}>{request.responseStatus === "waiting" ? "Chưa phản hồi" : "Đã nhận"}</Badge></div><Button variant="outline" className="mt-4 w-full" disabled={isMutating || Boolean(request.reminderSentAt)} onClick={() => void onSendReminder()}><BellRing className="size-4" />{request.reminderSentAt ? "Đã gửi nhắc nhở" : "Gửi thông báo nhắc nhở"}</Button></>}</Card>;
}

function ReadOnlyDecision({ detail }: { detail: ContributionDetail }) {
  const published = detail.status === "published";
  const decision = detail.moderationDecision;
  return <Card className="p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-slate-950">{published ? <ShieldCheck className="size-5 text-teal-700" /> : <XCircle className="size-5 text-red-600" />}Kết quả kiểm duyệt</h2><Badge variant={published ? "teal" : "red"}>Hoàn tất</Badge></div><div className={`mt-4 rounded-xl p-4 ${published ? "bg-teal-50 text-teal-900" : "bg-red-50 text-red-900"}`}><p className="text-lg font-extrabold">{published ? "Đã phê duyệt và công bố" : "Đã từ chối hồ sơ"}</p><p className="mt-1 text-xs">{published ? `${decision?.selectedClaimIds.length ?? 0}/${detail.claims.length} hạng mục được công bố` : "Không có hạng mục nào được công bố"}</p>{decision && <p className="mt-3 text-[10px] opacity-75">{formatDateTime(decision.decidedAt)} · {decision.decidedBy}</p>}</div>{decision && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ghi chú quyết định</p><p className="mt-2 text-xs italic leading-5 text-slate-600">“{decision.reason}”</p></div>}{published && detail.locationIntegrity.mapHref && <a href={detail.locationIntegrity.mapHref} target="_blank" rel="noreferrer" className="mt-4 flex h-9 items-center justify-center gap-2 rounded-lg bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800">Xem địa điểm trên bản đồ<ExternalLink className="size-3.5" /></a>}<div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[10px] leading-4 text-slate-500"><Clock3 className="mt-0.5 size-3.5 shrink-0" />Quyết định lịch sử ở chế độ chỉ đọc và không thể chỉnh sửa trực tiếp.</div></Card>;
}
