export interface ReportEvidenceDraft {
  uri: string;
  base64?: string;
  aiScore?: number;
  confidenceScore?: number;
  featureTags: string[];
  aiSummary?: string | null;
  matrixResult?: any;
  uploadedUrl?: string;
  isUploading?: boolean;
}

export interface ReportDraft {
  locationId: string;
  locationName: string;
  reason: 'Changed' | 'Blocked' | 'Incorrect' | 'Other';
  description: string;
  featureIds: string[];
  evidence?: ReportEvidenceDraft | null;
  isOpen?: boolean;
}

let currentDraft: ReportDraft | null = null;
let listeners: Array<() => void> = [];
let activeUploadPromise: Promise<string> | null = null;

export function getActiveUploadPromise(): Promise<string> | null {
  return activeUploadPromise;
}

export function setActiveUploadPromise(promise: Promise<string> | null): void {
  activeUploadPromise = promise;
}

export function getReportDraft(): ReportDraft | null {
  return currentDraft;
}

export function setReportDraft(draft: ReportDraft | null): void {
  currentDraft = draft;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

export function setReportEvidence(evidence: ReportEvidenceDraft | null): void {
  if (currentDraft) {
    currentDraft = {
      ...currentDraft,
      evidence,
      isOpen: true,
    };
  } else {
    currentDraft = {
      locationId: '',
      locationName: '',
      reason: 'Changed',
      description: '',
      featureIds: evidence?.featureTags ?? ['ramp'],
      evidence,
      isOpen: true,
    };
  }
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

export function subscribeReportDraft(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function clearReportDraft(): void {
  currentDraft = null;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}
