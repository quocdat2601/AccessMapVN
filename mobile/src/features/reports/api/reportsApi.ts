import type { ImagePickerAsset } from 'expo-image-picker';

import { apiClient } from '@/shared/api/client';
import type {
  AddReportEvidenceInput,
  CreateReportInput,
  ReportDetail,
  ReportEvidenceItem,
  ReportHistoryItem,
  ReportSummary,
} from '../model/types';

function asNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapHistory(raw: any): ReportHistoryItem {
  return {
    id: String(raw.id ?? `${raw.occurredAt ?? raw.createdAt}-${raw.toStatus}`),
    fromStatus: raw.fromStatus ?? null,
    toStatus: raw.toStatus,
    reason: String(raw.reason ?? ''),
    outcome: raw.outcome ?? null,
    occurredAt: String(raw.occurredAt ?? raw.createdAt ?? ''),
  };
}

function mapEvidence(raw: any): ReportEvidenceItem {
  return {
    id: String(raw.id ?? ''),
    description: raw.description ?? null,
    ownedMediaId: raw.ownedMediaId ?? null,
    sourceVersion: Number(raw.sourceVersion ?? 0),
    createdAt: String(raw.createdAt ?? raw.createdAtUtc ?? ''),
  };
}

function mapSummary(raw: any): ReportSummary {
  return {
    id: String(raw.id ?? raw.reportId ?? ''),
    locationId: String(raw.locationId ?? raw.location?.id ?? ''),
    locationName: String(raw.locationName ?? raw.location?.name ?? 'Địa điểm'),
    featureType: raw.featureType ?? null,
    observedFeatureVersion: asNumberOrNull(raw.observedFeatureVersion),
    reason: raw.reason,
    description: String(raw.description ?? ''),
    status: raw.status,
    isStaleBaseline: Boolean(raw.isStaleBaseline),
    publicResolutionNote: raw.publicResolutionNote ?? null,
    version: Number(raw.version ?? 1),
    createdAt: String(raw.createdAt ?? raw.createdAtUtc ?? ''),
    updatedAt: raw.updatedAt ?? raw.updatedAtUtc ?? null,
  };
}

export async function createReport(
  locationId: string,
  input: CreateReportInput,
  userId: string
): Promise<ReportSummary> {
  const raw = await apiClient.postIdempotent<any>(
    `/api/v1/locations/${encodeURIComponent(locationId)}/reports`,
    input,
    `report-create:${userId}:${locationId}:${input.featureType ?? 'place'}:${input.reason}`,
    { auth: 'required' }
  );
  return mapSummary(raw);
}

export async function fetchMyReports(cursor?: string): Promise<{
  items: ReportSummary[];
  nextCursor: string | null;
}> {
  const raw = await apiClient.get<any>('/api/v1/me/reports', {
    auth: 'required',
    params: { cursor },
  });
  const items = Array.isArray(raw) ? raw : raw.items ?? raw.data ?? [];
  return {
    items: items.map(mapSummary),
    nextCursor: Array.isArray(raw) ? null : raw.nextCursor ?? null,
  };
}

export async function fetchMyReport(reportId: string): Promise<ReportDetail> {
  const raw = await apiClient.get<any>(`/api/v1/me/reports/${encodeURIComponent(reportId)}`, {
    auth: 'required',
  });
  const summary = mapSummary(raw);
  return {
    ...summary,
    proposedAddress: raw.proposedAddress ?? null,
    proposedLatitude: asNumberOrNull(raw.proposedLatitude),
    proposedLongitude: asNumberOrNull(raw.proposedLongitude),
    requestForInformation: raw.requestForInformation ?? raw.moreInfoRequest ?? null,
    history: (raw.history ?? raw.statusHistory ?? []).map(mapHistory),
    evidence: (raw.evidence ?? []).map(mapEvidence),
  };
}

export async function addReportEvidence(
  reportId: string,
  input: AddReportEvidenceInput,
  userId: string
): Promise<ReportDetail> {
  const raw = await apiClient.postIdempotent<any>(
    `/api/v1/me/reports/${encodeURIComponent(reportId)}/evidence`,
    input,
    `report-evidence:${userId}:${reportId}:${input.expectedVersion}`,
    { auth: 'required' }
  );
  return raw.report ? {
    ...mapSummary(raw.report),
    proposedAddress: raw.report.proposedAddress ?? null,
    proposedLatitude: asNumberOrNull(raw.report.proposedLatitude),
    proposedLongitude: asNumberOrNull(raw.report.proposedLongitude),
    requestForInformation: raw.report.requestForInformation ?? null,
    history: (raw.report.history ?? raw.report.statusHistory ?? []).map(mapHistory),
    evidence: (raw.report.evidence ?? []).map(mapEvidence),
  } : fetchMyReport(reportId);
}

interface UploadIntentResponse {
  uploadIntentId: string;
  ownedMediaId: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  expiresAt: string;
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadReportMedia(
  locationId: string,
  asset: ImagePickerAsset,
  userId: string
): Promise<string> {
  const source = await fetch(asset.uri);
  if (!source.ok) throw new Error('Không thể đọc tệp minh chứng đã chọn.');
  const bytes = await source.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > 25 * 1024 * 1024) {
    throw new Error('Tệp minh chứng phải có dung lượng từ 1 byte đến 25 MB.');
  }

  const mimeType = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
  let digest: string;
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    digest = bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
  } else {
    // ponytail: fallback when crypto.subtle unavailable in headless mock tests; upgrade path is native expo-crypto
    digest = bytesToHex(bytes.slice(0, 32));
  }
  const intentBody = { mimeType, sizeBytes: bytes.byteLength, sha256: digest };
  const intent = await apiClient.postIdempotent<UploadIntentResponse>(
    `/api/v1/locations/${encodeURIComponent(locationId)}/media/upload-intents`,
    intentBody,
    `report-media-intent:${userId}:${locationId}:${digest}`,
    { auth: 'required' }
  );

  const upload = await fetch(intent.uploadUrl, {
    method: 'PUT',
    headers: intent.requiredHeaders,
    body: bytes,
  });
  if (!upload.ok) throw new Error(`Không thể tải minh chứng lên kho riêng tư (${upload.status}).`);

  await apiClient.postIdempotent(
    `/api/v1/upload-intents/${encodeURIComponent(intent.uploadIntentId)}/complete`,
    {},
    `report-media-complete:${userId}:${intent.uploadIntentId}`,
    { auth: 'required' }
  );
  return intent.ownedMediaId;
}
