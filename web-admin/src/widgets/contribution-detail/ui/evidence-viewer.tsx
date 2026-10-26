"use client";

import Image from "next/image";
import { useState } from "react";
import { Bot, Camera, CheckCircle2, Expand, MapPinCheck, Play, ScanSearch, ShieldCheck, ZoomIn, ZoomOut } from "lucide-react";
import type { ContributionEvidence, UserClaim } from "@/entities/contribution";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/cn";

function getSafeEvidenceUrl(url?: string): string {
  if (!url) return "/evidence/ramp-entrance.png";
  if (url.startsWith("/uploads/")) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5256";
    return `${apiBaseUrl.replace(/\/$/, "")}${url}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }
  // Mobile local device paths (e.g. file:///data/...) cannot be directly fetched by a browser
  return "/evidence/ramp-entrance.png";
}

export function EvidenceViewer({ evidence, userClaims }: { evidence: ContributionEvidence[]; userClaims?: UserClaim[] }) {
  const [activeId, setActiveId] = useState(evidence[0]?.id);
  const [zoomed, setZoomed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [imgDims, setImgDims] = useState<Record<string, { w: number; h: number }>>({});

  const active = evidence.find((item) => item.id === activeId) ?? evidence[0];
  if (!active) return null;

  const isLocalDeviceFile = active.url?.startsWith("file:") || active.url?.startsWith("content:");
  const activeImageUrl = failedImages[active.id]
    ? "/evidence/ramp-entrance.png"
    : getSafeEvidenceUrl(active.url);

  const activeBBoxes = (active.visualSuggestions ?? []).filter(
    (s) => s.bboxNormalized && s.bboxNormalized.length === 4,
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
            <Camera className="size-4 text-teal-700" />
            Thẩm định bằng chứng thực địa
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {evidence.length} tệp đính kèm · Phân biệt bằng chứng gốc và phân tích AI hỗ trợ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={active.exifStatus === "valid" ? "teal" : "amber"}>
            <ShieldCheck className="mr-1 size-3" />
            EXIF {active.exifStatus === "valid" ? "hợp lệ" : "cần kiểm tra"}
          </Badge>
          <Button
            variant={showBBoxes && activeBBoxes.length > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setShowBBoxes((v) => !v)}
            className={cn(
              "h-8 text-xs gap-1.5",
              showBBoxes && activeBBoxes.length > 0
                ? "bg-teal-700 hover:bg-teal-800 text-white"
                : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
            )}
            title={activeBBoxes.length > 0 ? "Bật/tắt hiển thị Bounding Box AI" : "AI không phát hiện đối tượng nào có khung nhận diện trong ảnh này"}
          >
            <ScanSearch className="size-3.5" />
            <span>AI Bounding Box</span>
            <span
              className={cn(
                "ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold",
                activeBBoxes.length > 0
                  ? (showBBoxes ? "bg-teal-900 text-teal-100" : "bg-slate-200 text-slate-700")
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {activeBBoxes.length}
            </span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoomed((value) => !value)} aria-label={zoomed ? "Thu nhỏ" : "Phóng to"}>
            {zoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setFullscreen(true)} aria-label="Xem toàn màn hình">
            <Expand className="size-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* Main image viewer with responsive aspect ratio container */}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950">
          <div
            className={cn(
              "relative flex h-full max-h-full max-w-full items-center justify-center transition-transform duration-300",
              zoomed && "scale-125",
            )}
            style={{
              aspectRatio: imgDims[active.id] ? `${imgDims[active.id].w} / ${imgDims[active.id].h}` : "16/9",
            }}
          >
            <Image
              src={activeImageUrl}
              alt={active.title}
              fill
              sizes="(max-width: 1280px) 100vw, 900px"
              className="object-contain"
              unoptimized
              priority
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setImgDims((prev) => ({ ...prev, [active.id]: { w: img.naturalWidth, h: img.naturalHeight } }));
                }
              }}
              onError={() => setFailedImages((prev) => ({ ...prev, [active.id]: true }))}
            />

            {active.type === "video" && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-950/20">
                <span className="grid size-14 place-items-center rounded-full bg-white/90 text-teal-700 shadow-lg">
                  <Play className="ml-1 size-6 fill-current" />
                </span>
              </div>
            )}

            {/* AI Bounding Box Overlays */}
            {showBBoxes && activeBBoxes.map((item, idx) => {
              const [xmin, ymin, xmax, ymax] = item.bboxNormalized!;
              const isRamp = item.feature.includes("ramp");
              const isStairs = item.feature.includes("stair") || item.feature.includes("step");
              const label = isRamp ? "Ram dốc" : isStairs ? "Bậc thang" : item.feature;
              const borderClass = isRamp
                ? "border-emerald-400 bg-emerald-500/15 ring-emerald-500/30"
                : isStairs
                ? "border-amber-400 bg-amber-500/15 ring-amber-500/30"
                : "border-cyan-400 bg-cyan-500/15 ring-cyan-500/30";
              const badgeClass = isRamp ? "bg-emerald-600 text-white" : isStairs ? "bg-amber-600 text-white" : "bg-cyan-600 text-white";

              return (
                <div
                  key={idx}
                  className={cn("pointer-events-none absolute border-2 ring-1 z-10 rounded-lg shadow-sm", borderClass)}
                  style={{
                    left: `${xmin * 100}%`,
                    top: `${ymin * 100}%`,
                    width: `${(xmax - xmin) * 100}%`,
                    height: `${(ymax - ymin) * 100}%`,
                  }}
                >
                  <span className={cn("absolute -top-5 left-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold shadow-md whitespace-nowrap", badgeClass)}>
                    {label} {item.detectorScore ? `${Math.round(item.detectorScore * 100)}%` : ""}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-slate-950/75 px-3 py-2 text-xs text-white backdrop-blur">
            <strong>{active.title}</strong>
            <span className="mt-1 block text-[10px] text-slate-200">
              {active.device} · {active.resolution}
            </span>
            {isLocalDeviceFile && (
              <span className="mt-1 inline-block rounded bg-amber-600/90 px-1.5 py-0.5 text-[9px] text-white">
                Ảnh lưu trên máy người dùng ({active.url.split("/").pop()})
              </span>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 max-w-[80%] rounded-lg bg-teal-800/90 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
            <span className="flex items-center gap-1.5">
              <Bot className="size-4" />
              Phân tích AI hỗ trợ
            </span>
            <span className="mt-1 block text-[10px] font-normal text-teal-50">
              {activeBBoxes.length > 0 ? `Đã nhận diện ${activeBBoxes.length} vùng đối tượng` : "0 đối tượng nhận diện · AI tham khảo"}
            </span>
          </div>
        </div>

        {/* Thumbnail gallery */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {evidence.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveId(item.id);
                setZoomed(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 text-left transition",
                item.id === active.id ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-slate-200 hover:border-slate-300",
              )}
            >
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-slate-950">
                <Image
                  src={failedImages[item.id] ? "/evidence/ramp-entrance.png" : getSafeEvidenceUrl(item.url)}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                  onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
                />
                {item.type === "video" && <Play className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 fill-white text-white" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {item.fileSize} · {item.type === "video" ? "Video" : "Ảnh gốc"}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Audit details: Evidence vs AI findings & User Claims */}
        <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bằng chứng gốc</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{active.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-teal-600" />
                {active.resolution}
              </span>
              <span className="flex items-center gap-1">
                <MapPinCheck className="size-3 text-teal-600" />
                Gắn thẻ địa lý {active.geotagStatus === "valid" ? "hợp lệ" : "cần đối soát"}
              </span>
            </div>

            {/* Contributor User Claims */}
            {userClaims && userClaims.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tuyên bố của người gửi</p>
                <div className="mt-1.5 space-y-1">
                  {userClaims.map((claim, cIdx) => (
                    <div key={cIdx} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">{claim.feature}:</span> {claim.snippet ?? claim.claim}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">
              <ScanSearch className="size-3" />
              Nhận định AI tham khảo (YOLOv8 + Pre-Scan)
            </p>
            <div className="mt-2 space-y-1.5">
              {active.aiFindings.map((finding) => (
                <div key={finding.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">{finding.label}</span>
                  {finding.confidence && (
                    <Badge variant={finding.tone === "critical" ? "red" : finding.tone === "warning" ? "amber" : "teal"}>
                      {finding.confidence}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Visual suggestions with coordinates indicator */}
            {active.visualSuggestions && active.visualSuggestions.some((vs) => vs.value === "suggested_present" || Boolean(vs.detectorScore) || Boolean(vs.bboxNormalized)) && (
              <div className="mt-3 border-t border-slate-200 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gợi ý thị giác AI</p>
                <div className="mt-1.5 space-y-1">
                  {active.visualSuggestions
                    .filter((vs) => vs.value === "suggested_present" || Boolean(vs.detectorScore) || Boolean(vs.bboxNormalized))
                    .map((vs, sIdx) => {
                      const isRamp = vs.feature.includes("ramp");
                      const isStairs = vs.feature.includes("stair") || vs.feature.includes("step");
                      const isDoor = vs.feature.includes("door");
                      const label = isRamp ? "Ram dốc (Ramp)" : isStairs ? "Bậc thang (Stairs)" : isDoor ? "Cửa ra vào (Door)" : vs.feature;
                      return (
                        <div key={sIdx} className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs border border-slate-100">
                          <span className="text-slate-700">{label}</span>
                          <div className="flex items-center gap-1">
                            {vs.bboxNormalized && (
                              <span className="text-[10px] text-slate-400">[{vs.bboxNormalized.map((n) => n.toFixed(2)).join(", ")}]</span>
                            )}
                            {vs.detectorScore && (
                              <Badge variant={isStairs ? "amber" : "teal"}>{Math.round(vs.detectorScore * 100)}%</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-6xl bg-slate-950 p-3 text-white">
          <DialogTitle className="text-white">{active.title}</DialogTitle>
          <DialogDescription className="text-slate-300">
            Bằng chứng gốc · {active.device} {activeBBoxes.length > 0 && `· ${activeBBoxes.length} Bounding Box`}
          </DialogDescription>
          <div className="relative mt-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950">
            <div
              className="relative flex h-full max-h-full max-w-full items-center justify-center"
              style={{
                aspectRatio: imgDims[active.id] ? `${imgDims[active.id].w} / ${imgDims[active.id].h}` : "16/9",
              }}
            >
              <Image src={activeImageUrl} alt={active.title} fill sizes="90vw" className="object-contain" unoptimized />
              {showBBoxes && activeBBoxes.map((item, idx) => {
                const [xmin, ymin, xmax, ymax] = item.bboxNormalized!;
                const isRamp = item.feature.includes("ramp");
                const isStairs = item.feature.includes("stair") || item.feature.includes("step");
                const label = isRamp ? "Ram dốc" : isStairs ? "Bậc thang" : item.feature;
                const borderClass = isRamp
                  ? "border-emerald-400 bg-emerald-500/15"
                  : isStairs
                  ? "border-amber-400 bg-amber-500/15"
                  : "border-cyan-400 bg-cyan-500/15";
                const badgeClass = isRamp ? "bg-emerald-600 text-white" : isStairs ? "bg-amber-600 text-white" : "bg-cyan-600 text-white";

                return (
                  <div
                    key={idx}
                    className={cn("pointer-events-none absolute border-2 z-10 rounded-lg shadow-sm", borderClass)}
                    style={{
                      left: `${xmin * 100}%`,
                      top: `${ymin * 100}%`,
                      width: `${(xmax - xmin) * 100}%`,
                      height: `${(ymax - ymin) * 100}%`,
                    }}
                  >
                    <span className={cn("absolute -top-5 left-0 rounded px-1.5 py-0.5 text-[10px] font-bold shadow whitespace-nowrap", badgeClass)}>
                      {label} {item.detectorScore ? `${Math.round(item.detectorScore * 100)}%` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
