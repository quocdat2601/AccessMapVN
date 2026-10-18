export type AccessibilityFeatureType =
  | "Ramp"
  | "EntranceDoor"
  | "Elevator"
  | "AccessibleRestroom"
  | "TactilePaving";

export type PublishedFeatureStatus =
  | "Available"
  | "Limited"
  | "NotAvailable"
  | "Unknown";

export type DisputeStatus =
  | "Open"
  | "UnderReview"
  | "AwaitingMoreInfo"
  | "CorrectionPending"
  | "ResolvedBaseline"
  | "ResolvedUpdated";

export type DisputeDecisionType =
  | "RequestEvidence"
  | "RetainBaseline"
  | "LinkCorrection"
  | "RecordPublication"
  | "CreateAdvisory";

export type ReportStatus =
  | "Submitted"
  | "UnderReview"
  | "AwaitingMoreInfo"
  | "LinkedToDispute"
  | "Resolved"
  | "Rejected";

export type ReportReason =
  | "IncorrectFeature"
  | "MissingFeature"
  | "OutdatedInformation"
  | "Other"
  | "WrongAddressOrPin";

export type ReportResolution =
  | "BaselineRetained"
  | "AdvisoryCreated"
  | "CorrectionPublished"
  | "MetadataCorrected";

export type ReportDecision =
  | "StartReview"
  | "RequestEvidence"
  | "LinkDispute"
  | "Resolve"
  | "Reject";

export type CommunityCommentStatus =
  | "PendingReview"
  | "Approved"
  | "Hidden"
  | "Rejected";

export interface AdminQueueResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminQueueQuery {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface DisputeQueueItem {
  id: string;
  locationId: string;
  locationName?: string;
  locationAddress?: string;
  featureType: AccessibilityFeatureType;
  featureVersion: number;
  publishedStatus?: PublishedFeatureStatus;
  status: DisputeStatus;
  openReason: string;
  openedAt: string;
  updatedAt?: string;
  contradictingVoterCount?: number;
}

export interface DisputeVoteSummary {
  id: string;
  voteType: "StillAccurate" | "Changed";
  proposedStatus?: PublishedFeatureStatus;
  comment?: string;
  status?: string;
  createdAt: string;
  evidenceSubmissionId?: string;
}

export interface DisputeDecisionRecord {
  id: string;
  decisionType: DisputeDecisionType;
  reason: string;
  moderatorDisplayName?: string;
  correctionSubmissionId?: string;
  advisoryId?: string;
  decidedAt: string;
  caseVersion: number;
}

export interface TemporaryAdvisory {
  id: string;
  status: "Scheduled" | "Active" | "Expired" | "Revoked";
  reason: string;
  startsAt: string;
  endsAt: string;
}

export interface DisputeDetail extends DisputeQueueItem {
  votes: DisputeVoteSummary[];
  decisions: DisputeDecisionRecord[];
  advisory?: TemporaryAdvisory;
  correctionSubmissionId?: string;
  version: number;
}

export interface DisputeDecisionInput {
  decision: DisputeDecisionType;
  reason: string;
  correctionSubmissionId?: string;
  startsAt?: string;
  endsAt?: string;
  advisoryReason?: string;
}

export interface ReportQueueItem {
  id: string;
  locationId: string;
  locationName?: string;
  locationAddress?: string;
  featureType?: AccessibilityFeatureType;
  observedFeatureVersion?: number;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  isStaleBaseline?: boolean;
  createdAt: string;
  updatedAt?: string;
  evidenceCount?: number;
}

export interface ReportEvidence {
  id: string;
  description?: string;
  mediaUrl?: string;
  mediaContentType?: string;
  createdAt: string;
}

export interface EvidenceAccess {
  evidenceId: string;
  accessUrl: string;
  contentType: string;
  expiresAt: string;
}

export interface ReportHistoryEntry {
  id: string;
  fromStatus?: ReportStatus;
  toStatus: ReportStatus;
  reason: string;
  outcome?: string;
  actorDisplayName?: string;
  occurredAt: string;
}

export interface ReportDetail extends ReportQueueItem {
  reporterDisplayName?: string;
  proposedAddress?: string;
  proposedLatitude?: number;
  proposedLongitude?: number;
  linkedDisputeCaseId?: string;
  linkedSubmissionId?: string;
  resolution?: ReportResolution;
  publicResolutionNote?: string;
  locationMetadataVersion?: number;
  currentAddress?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  evidence: ReportEvidence[];
  history: ReportHistoryEntry[];
  version: number;
}

export interface ReportTransitionInput {
  decision: ReportDecision;
  note: string;
  expectedVersion: number;
  resolution?: ReportResolution;
  publicResolutionNote?: string;
  linkedDisputeCaseId?: string;
  linkedSubmissionId?: string;
  advisoryId?: string;
}

export interface MetadataCorrectionInput {
  expectedMetadataVersion: number;
  sourceReportId: string;
  reason: string;
  proposedAddress?: string;
  proposedPosition?: {
    latitude: number;
    longitude: number;
  };
}

export interface CommunityCommentQueueItem {
  id: string;
  locationId: string;
  locationName?: string;
  scopeId?: string;
  authorDisplayName?: string;
  body: string;
  status: CommunityCommentStatus;
  createdAt: string;
  moderatedAt?: string;
  moderationReason?: string;
  version?: number;
  etag?: string;
}

export interface CommentModerationInput {
  decision: "Approve" | "Hide";
  reason: string;
  expectedVersion: number;
}
