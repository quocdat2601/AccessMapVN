import type { AccessibilityFeatureType } from '@/features/community';

export type ReportReason =
  | 'IncorrectFeature'
  | 'MissingFeature'
  | 'OutdatedInformation'
  | 'WrongAddressOrPin'
  | 'Other';

export type ReportStatus =
  | 'Submitted'
  | 'UnderReview'
  | 'AwaitingMoreInfo'
  | 'LinkedToDispute'
  | 'Resolved'
  | 'Rejected';

export interface CreateReportInput {
  reason: ReportReason;
  description: string;
  featureType?: AccessibilityFeatureType;
  observedFeatureVersion?: number;
  proposedAddress?: string;
  proposedPosition?: {
    latitude: number;
    longitude: number;
  };
}

export interface ReportSummary {
  id: string;
  locationId: string;
  locationName: string;
  featureType: AccessibilityFeatureType | null;
  observedFeatureVersion: number | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  isStaleBaseline: boolean;
  publicResolutionNote: string | null;
  version: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface ReportHistoryItem {
  id: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  reason: string;
  outcome: string | null;
  occurredAt: string;
}

export interface ReportEvidenceItem {
  id: string;
  description: string | null;
  ownedMediaId: string | null;
  sourceVersion: number;
  createdAt: string;
}

export interface ReportDetail extends ReportSummary {
  proposedAddress: string | null;
  proposedLatitude: number | null;
  proposedLongitude: number | null;
  requestForInformation: string | null;
  history: ReportHistoryItem[];
  evidence: ReportEvidenceItem[];
}

export interface AddReportEvidenceInput {
  description?: string;
  ownedMediaId?: string;
  expectedVersion: number;
}
