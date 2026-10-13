import AsyncStorage from '@react-native-async-storage/async-storage';

export const DRAFT_SCHEMA_VERSION = 1;
export const DRAFT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SurveyDraftMedia {
  localUri?: string;
  remoteUrl?: string;
  uploadStatus: 'pending' | 'uploaded' | 'failed';
}

export interface SurveyDraftMeasurements {
  doorClearWidth?: {
    status: string;
    valueMm?: number;
    method?: string;
  };
  rampSlope?: {
    status: string;
    heightCm?: number;
    lengthCm?: number;
    method?: string;
  };
}

export interface SurveyDraftGps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  mocked?: boolean;
  timestamp?: number;
}

export interface SurveyDraft {
  schemaVersion: number;
  locationId: string;
  locationName?: string;
  clientSubmissionId: string;
  media: SurveyDraftMedia[];
  featureTags: string[];
  measurements?: SurveyDraftMeasurements;
  textDescription: string;
  gps?: SurveyDraftGps;
  lastSavedAt: number;
}

export interface StorageBackend {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys?: () => Promise<readonly string[]>;
  multiRemove?: (keys: readonly string[]) => Promise<void>;
}

export type FileExistenceChecker = (uri: string) => Promise<boolean>;

export async function defaultFileExistenceChecker(uri: string): Promise<boolean> {
  if (!uri?.trim()) return false;
  try {
    const res = await fetch(uri, { method: 'HEAD' });
    return res.ok || res.status === 200 || res.status === 0;
  } catch {
    return false;
  }
}

let activeStorage: StorageBackend = AsyncStorage;
let activeFileChecker: FileExistenceChecker = defaultFileExistenceChecker;

export function setStorageBackendForTesting(customBackend: StorageBackend) {
  activeStorage = customBackend;
}

export function setFileCheckerForTesting(customChecker: FileExistenceChecker) {
  activeFileChecker = customChecker;
}

export function resetStorageBackend() {
  activeStorage = AsyncStorage;
  activeFileChecker = defaultFileExistenceChecker;
}

export function getDraftStorageKey(locationId: string): string {
  return `@accessmap_draft_${locationId.trim()}`;
}

export async function saveSurveyDraft(
  draft: Omit<SurveyDraft, 'schemaVersion' | 'lastSavedAt'> & {
    schemaVersion?: number;
    lastSavedAt?: number;
  }
): Promise<SurveyDraft> {
  if (!draft.locationId?.trim()) {
    throw new Error('LocationId không được để trống khi lưu bản nháp.');
  }

  // Ensure media only contains lightweight URIs, never base64 payload strings
  const sanitizedMedia: SurveyDraftMedia[] = (draft.media || []).map((m) => {
    const isBase64 = m.localUri?.startsWith('data:') || (m.localUri?.length ?? 0) > 2000;
    return {
      localUri: isBase64 ? undefined : m.localUri,
      remoteUrl: m.remoteUrl,
      uploadStatus: m.uploadStatus || (m.remoteUrl ? 'uploaded' : 'pending'),
    };
  });

  const fullDraft: SurveyDraft = {
    schemaVersion: draft.schemaVersion ?? DRAFT_SCHEMA_VERSION,
    locationId: draft.locationId.trim(),
    locationName: draft.locationName,
    clientSubmissionId: draft.clientSubmissionId || `mob-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`,
    media: sanitizedMedia,
    featureTags: draft.featureTags || [],
    measurements: draft.measurements,
    textDescription: draft.textDescription || '',
    gps: draft.gps,
    lastSavedAt: draft.lastSavedAt ?? Date.now(),
  };

  const key = getDraftStorageKey(fullDraft.locationId);
  await activeStorage.setItem(key, JSON.stringify(fullDraft));
  return fullDraft;
}

export async function validateDraftMedia(
  draft: SurveyDraft,
  customChecker?: FileExistenceChecker
): Promise<SurveyDraft> {
  const checker = customChecker || activeFileChecker;
  const verifiedMedia: SurveyDraftMedia[] = await Promise.all(
    (draft.media || []).map(async (m) => {
      // If already uploaded with remoteUrl, media is durable
      if (m.uploadStatus === 'uploaded' && m.remoteUrl) {
        return m;
      }
      if (m.localUri) {
        const exists = await checker(m.localUri);
        if (!exists) {
          return {
            ...m,
            uploadStatus: 'failed',
          };
        }
      }
      return m;
    })
  );

  return {
    ...draft,
    media: verifiedMedia,
  };
}

export async function loadSurveyDraft(
  locationId: string,
  options?: { validateMedia?: boolean; customChecker?: FileExistenceChecker }
): Promise<SurveyDraft | null> {
  if (!locationId?.trim()) return null;
  const key = getDraftStorageKey(locationId);

  try {
    const raw = await activeStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SurveyDraft;

    // Check expiration (7 days)
    if (!parsed.lastSavedAt || Date.now() - parsed.lastSavedAt > DRAFT_EXPIRATION_MS) {
      await activeStorage.removeItem(key);
      return null;
    }

    // Incompatible schema version fallback
    if (parsed.schemaVersion !== DRAFT_SCHEMA_VERSION) {
      return null;
    }

    if (options?.validateMedia !== false) {
      return await validateDraftMedia(parsed, options?.customChecker);
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function deleteSurveyDraft(locationId: string): Promise<void> {
  if (!locationId?.trim()) return;
  const key = getDraftStorageKey(locationId);
  try {
    await activeStorage.removeItem(key);
  } catch {}
}

export async function deleteSurveyDraftOnSuccess(
  locationId: string,
  confirmedSubmissionId: string,
  expectedClientId: string
): Promise<boolean> {
  if (!locationId?.trim() || !confirmedSubmissionId || !expectedClientId) {
    return false;
  }

  const existing = await loadSurveyDraft(locationId);
  if (!existing) return false;

  // Only delete if the submitted client ID strictly matches the draft's clientSubmissionId
  if (existing.clientSubmissionId === expectedClientId) {
    await deleteSurveyDraft(locationId);
    return true;
  }

  return false;
}

export function refreshDraftSubmissionId(draft: SurveyDraft): SurveyDraft {
  return {
    ...draft,
    clientSubmissionId: `mob-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`,
    lastSavedAt: Date.now(),
  };
}

export async function clearAllSurveyDrafts(): Promise<void> {
  try {
    if (activeStorage.getAllKeys && activeStorage.multiRemove) {
      const keys = await activeStorage.getAllKeys();
      const draftKeys = keys.filter((k) => k.startsWith('@accessmap_draft_'));
      if (draftKeys.length > 0) {
        await activeStorage.multiRemove(draftKeys);
      }
    }
  } catch {}
}
