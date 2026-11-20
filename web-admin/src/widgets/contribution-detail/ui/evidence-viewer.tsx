"use client";

import Image from "next/image";
import { useState } from "react";
import { Bot, Camera, CheckCircle2, Expand, MapPinCheck, Play, ScanSearch, ShieldCheck, ZoomIn, ZoomOut } from "lucide-react";
import type { ContributionEvidence, UserClaim, VisualSuggestion } from "@/entities/contribution";
import { getApiBaseUrl } from "@/shared/config/runtime";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/cn";

function resolveMediaBaseUrl(): string {
  return getApiBaseUrl() || "http://localhost:5256";
}

function getSafeEvidenceUrl(url?: string): string {
  if (!url) return "/evidence/ramp-entrance.png";
  if (url.startsWith("/uploads/")) {
    return `${resolveMediaBaseUrl()}${url}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }
  // Mobile local device paths (e.g. file:///data/...) cannot be directly fetched by a browser
  return "/evidence/ramp-entrance.png";
}

function getVideoStreamUrl(url?: string): string {
  if (!url || url.startsWith("file:") || url.startsWith("content:")) {
    return "/evidence/ramp-entrance.png";
  }
  if (url.startsWith("/uploads/")) {
    return `${resolveMediaBaseUrl()}${url}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `${resolveMediaBaseUrl()}/api/v1/media/video-stream?url=${encodeURIComponent(url)}`;
  }
  return url.startsWith("/") ? url : "/evidence/ramp-entrance.png";
}

function getVideoPosterUrl(url?: string): string {
  if (!url || url.startsWith("file:") || url.startsWith("content:")) {
    return "";
  }
  if (url.startsWith("/uploads/") || url.startsWith("http://") || url.startsWith("https://")) {
    return `${resolveMediaBaseUrl()}/api/v1/media/video-poster?url=${encodeURIComponent(url)}`;
  }
  return "";
}

function getFeatureDisplayMeta(feature: string): {
  label: string;
  tone: "emerald" | "amber" | "cyan";
  borderClass: string;
  badgeClass: string;
} {
  const lower = feature.toLowerCase();
  if (lower.includes("ramp")) {
    return {
      label: "Ram dốc",
      tone: "emerald",
      borderClass: "border-emerald-400 bg-emerald-500/15 ring-emerald-500/30",
      badgeClass: "bg-emerald-600 text-white",
    };
  }
  if (lower.includes("stair") || lower.includes("step")) {
    return {
      label: "Bậc thang",
      tone: "amber",
      borderClass: "border-amber-400 bg-amber-500/15 ring-amber-500/30",
      badgeClass: "bg-amber-600 text-white",
    };
  }
  if (lower.includes("door")) {
    return {
      label: "Cửa ra vào",
      tone: "cyan",
      borderClass: "border-cyan-400 bg-cyan-500/15 ring-cyan-500/30",
      badgeClass: "bg-cyan-600 text-white",
    };
  }
  if (lower.includes("elevator")) {
    return {
      label: "Thang máy",
      tone: "cyan",
      borderClass: "border-cyan-400 bg-cyan-500/15 ring-cyan-500/30",
      badgeClass: "bg-cyan-600 text-white",
    };
  }
  if (lower.includes("restroom") || lower.includes("toilet") || lower.includes("sign")) {
    return {
      label: "WC tiếp cận",
      tone: "cyan",
      borderClass: "border-cyan-400 bg-cyan-500/15 ring-cyan-500/30",
      badgeClass: "bg-cyan-600 text-white",
    };
  }
  if (lower.includes("tactile")) {
    return {
      label: "Đường dẫn xúc giác",
      tone: "cyan",
      borderClass: "border-cyan-400 bg-cyan-500/15 ring-cyan-500/30",
      badgeClass: "bg-cyan-600 text-white",
    };
  }
  return {
    label: feature,
    tone: "cyan",
    borderClass: "border-cyan-400 bg-cyan-500/15 ring-cyan-500/30",
    badgeClass: "bg-cyan-600 text-white",
  };
}

function getClaimDisplayText(claim: UserClaim): string {
  if (claim.snippet) {
    return claim.snippet;
  }
  if (claim.claim === "reported_present") {
    return "Khai báo có";
  }
  if (claim.claim === "reported_absent") {
    return "Khai báo không có";
  }
  return claim.claim;
}

function BBoxOverlays({
  boxes,
  visible,
}: {
  boxes: VisualSuggestion[];
  visible: boolean;
}) {
  if (!visible || boxes.length === 0) return null;
  return (
    <>
      {boxes.map((item, idx) => {
        const [rawXmin, rawYmin, rawXmax, rawYmax] = item.bboxNormalized!;
        const xmin = Math.max(0, Math.min(1, rawXmin));
        const ymin = Math.max(0, Math.min(1, rawYmin));
        const xmax = Math.max(xmin, Math.min(1, rawXmax));
        const ymax = Math.max(ymin, Math.min(1, rawYmax));
        const meta = getFeatureDisplayMeta(item.feature);
        const insideTop = ymin < 0.08;

        return (
          <div
            key={idx}
            className={cn("pointer-events-none absolute z-10 rounded-lg border-2 shadow-sm ring-1", meta.borderClass)}
            style={{
              left: `${xmin * 100}%`,
              top: `${ymin * 100}%`,
              width: `${(xmax - xmin) * 100}%`,
              height: `${(ymax - ymin) * 100}%`,
            }}
          >
            <span
              className={cn(
                "absolute flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold shadow-md",
                insideTop ? "left-1.5 top-1.5" : "-top-6 left-0",
                meta.badgeClass,
              )}
            >
              {meta.label} {item.detectorScore ? `${Math.round(item.detectorScore * 100)}%` : ""}
            </span>
          </div>
        );
      })}
    </>
  );
}

function MediaStage({
  active,
  activeImageUrl,
  videoStreamUrl,
  posterUrl,
  isLocalDeviceFile,
  isFailed,
  dims,
  showBBoxes,
  activeBBoxes,
  maxHeightClass,
  zoomed,
  onMeasure,
  onMediaError,
}: {
  active: ContributionEvidence;
  activeImageUrl: string;
  videoStreamUrl: string;
  posterUrl: string;
  isLocalDeviceFile: boolean;
  isFailed: boolean;
  dims?: { w: number; h: number };
  showBBoxes: boolean;
  activeBBoxes: VisualSuggestion[];
  maxHeightClass: string;
  zoomed?: boolean;
  onMeasure: (w: number, h: number) => void;
  onMediaError: () => void;
}) {
  const showRealVideo =
    active.type === "video" &&
    !isLocalDeviceFile &&
    !isFailed &&
    videoStreamUrl !== "/evidence/ramp-entrance.png";

  return (
    <div
      className={cn(
        "relative inline-flex max-h-full max-w-full items-center justify-center transition-transform duration-300",
        zoomed && "scale-125",
      )}
    >
      {showRealVideo ? (
        <video
          key={videoStreamUrl}
          src={videoStreamUrl}
          poster={posterUrl || undefined}
          preload="auto"
          controls
          playsInline
          className={cn("block h-auto w-auto max-w-full", maxHeightClass)}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) onMeasure(v.videoWidth, v.videoHeight);
          }}
          onError={onMediaError}
        />
      ) : (
        <>
          <Image
            src={activeImageUrl}
            alt={active.title}
            width={dims?.w ?? 1280}
            height={dims?.h ?? 720}
            className={cn("block h-auto w-auto max-w-full", maxHeightClass)}
            unoptimized
            priority
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) onMeasure(img.naturalWidth, img.naturalHeight);
            }}
            onError={onMediaError}
          />
          {active.type === "video" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-950/25">
              <span className="grid size-14 place-items-center rounded-full bg-white/90 text-teal-700 shadow-lg">
                <Play className="ml-1 size-6 fill-current" />
              </span>
            </div>
          )}
        </>
      )}
      <BBoxOverlays boxes={activeBBoxes} visible={showBBoxes && Boolean(dims)} />
    </div>
  );
}

export function EvidenceViewer({ evidence, userClaims }: { evidence: ContributionEvidence[]; userClaims?: UserClaim[] }) {
  const [activeId, setActiveId] = useState(evidence[0]?.id);
  const [zoomed, setZoomed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [failedPosters, setFailedPosters] = useState<Record<string, boolean>>({});
  const [imgDims, setImgDims] = useState<Record<string, { w: number; h: number }>>({});

  const active = evidence.find((item) => item.id === activeId) ?? evidence[0];
  if (!active) return null;

  const isLocalDeviceFile = active.url?.startsWith("file:") || active.url?.startsWith("content:");
  const activeImageUrl = failedImages[active.id]
    ? "/evidence/ramp-entrance.png"
    : getSafeEvidenceUrl(active.url);
  const activeVideoStreamUrl = getVideoStreamUrl(active.url);
  const activePosterUrl = failedPosters[active.id] ? "" : getVideoPosterUrl(active.url);
  const activeDims = imgDims[active.id];
  const displayResolution = activeDims
    ? `${activeDims.w} × ${activeDims.h}`
    : active.resolution;

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
            title={activeBBoxes.length > 0 ? "Bật/tắt khung nhận diện đối tượng" : "Không có vùng đối tượng nhận diện trong ảnh này"}
          >
            <ScanSearch className="size-3.5" />
            <span>Khung nhận diện</span>
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
        {/* Main media stage with exact natural-aspect wrapper */}
        <div className="overflow-hidden rounded-xl bg-slate-950">
          <div className="relative flex h-[400px] sm:h-[440px] w-full items-center justify-center overflow-hidden">
            <MediaStage
              active={active}
              activeImageUrl={activeImageUrl}
              videoStreamUrl={activeVideoStreamUrl}
              posterUrl={activePosterUrl}
              isLocalDeviceFile={isLocalDeviceFile}
              isFailed={Boolean(failedImages[active.id])}
              dims={activeDims}
              showBBoxes={showBBoxes}
              activeBBoxes={activeBBoxes}
              maxHeightClass="max-h-[400px] sm:max-h-[440px]"
              zoomed={zoomed}
              onMeasure={(w, h) => setImgDims((prev) => ({ ...prev, [active.id]: { w, h } }))}
              onMediaError={() => setFailedImages((prev) => ({ ...prev, [active.id]: true }))}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-3.5 py-2 text-xs text-slate-200">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <strong className="text-white">{active.title}</strong>
              <span className="text-[11px] text-slate-400">
                {active.device}
                {displayResolution ? ` · ${displayResolution}` : ""}
              </span>
              {isLocalDeviceFile && (
                <span className="rounded bg-amber-600/90 px-1.5 py-0.5 text-[10px] text-white">
                  Lưu cục bộ ({active.url.split("/").pop()})
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-teal-900/70 px-2 py-1 text-[11px] font-medium text-teal-100">
              <Bot className="size-3.5 text-teal-300" />
              <span>
                {activeBBoxes.length > 0
                  ? `AI nhận diện ${activeBBoxes.length} vùng đối tượng`
                  : "0 vùng đối tượng · AI tham khảo"}
              </span>
            </div>
          </div>
        </div>

        {/* Thumbnail gallery */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {evidence.map((item) => {
            const thumbPosterUrl = item.type === "video" ? getVideoPosterUrl(item.url) : "";
            const itemSub = [item.fileSize, item.type === "video" ? "Video" : "Ảnh gốc"].filter(Boolean).join(" · ");

            return (
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
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-slate-900">
                  {item.type === "video" ? (
                    thumbPosterUrl && !failedPosters[item.id] ? (
                      <Image
                        src={thumbPosterUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                        onError={() => setFailedPosters((prev) => ({ ...prev, [item.id]: true }))}
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-900" />
                    )
                  ) : (
                    <Image
                      src={failedImages[item.id] ? "/evidence/ramp-entrance.png" : getSafeEvidenceUrl(item.url)}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                      onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
                    />
                  )}
                  {item.type === "video" && (
                    <span className="absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-slate-950/70 text-white">
                      <Play className="ml-0.5 size-3.5 fill-white" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{itemSub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Audit details: Evidence vs AI findings & User Claims */}
        <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bằng chứng gốc</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{active.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
              {displayResolution ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-teal-600" />
                  {displayResolution}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <MapPinCheck className="size-3 text-teal-600" />
                Gắn thẻ địa lý {active.geotagStatus === "valid" ? "hợp lệ" : "cần đối soát"}
              </span>
            </div>

            {/* Contributor User Claims */}
            {userClaims && userClaims.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thông tin người gửi mô tả</p>
                <div className="mt-1.5 space-y-1">
                  {userClaims.map((claim, cIdx) => {
                    const meta = getFeatureDisplayMeta(claim.feature);
                    return (
                      <div key={cIdx} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">{meta.label}:</span> {getClaimDisplayText(claim)}
                      </div>
                    );
                  })}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đối tượng nhận diện trên ảnh</p>
                <div className="mt-1.5 space-y-1">
                  {active.visualSuggestions
                    .filter((vs) => vs.value === "suggested_present" || Boolean(vs.detectorScore) || Boolean(vs.bboxNormalized))
                    .map((vs, sIdx) => {
                      const meta = getFeatureDisplayMeta(vs.feature);
                      return (
                        <div key={sIdx} className="flex items-center justify-between rounded border border-slate-100 bg-white px-2 py-1 text-xs">
                          <span className="text-slate-700">{meta.label}</span>
                          <div className="flex items-center gap-1">
                            {vs.bboxNormalized && (
                              <span className="text-[10px] text-slate-400">[{vs.bboxNormalized.map((n) => n.toFixed(2)).join(", ")}]</span>
                            )}
                            {vs.detectorScore && (
                              <Badge variant={meta.tone === "amber" ? "amber" : "teal"}>{Math.round(vs.detectorScore * 100)}%</Badge>
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
            Bằng chứng gốc · {active.device} {displayResolution && `· ${displayResolution}`} {activeBBoxes.length > 0 && `· ${activeBBoxes.length} khung nhận diện`}
          </DialogDescription>
          <div className="relative mt-4 flex h-[72vh] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950">
            <MediaStage
              active={active}
              activeImageUrl={activeImageUrl}
              videoStreamUrl={activeVideoStreamUrl}
              posterUrl={activePosterUrl}
              isLocalDeviceFile={isLocalDeviceFile}
              isFailed={Boolean(failedImages[active.id])}
              dims={activeDims}
              showBBoxes={showBBoxes}
              activeBBoxes={activeBBoxes}
              maxHeightClass="max-h-[72vh]"
              onMeasure={(w, h) => setImgDims((prev) => ({ ...prev, [active.id]: { w, h } }))}
              onMediaError={() => setFailedImages((prev) => ({ ...prev, [active.id]: true }))}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
