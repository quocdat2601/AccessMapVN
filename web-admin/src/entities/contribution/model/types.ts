export type ContributionStatus = "pending" | "needs_supplement" | "published" | "rejected";
export type ContributionType = "new_place" | "place_update";
export type ContributionReason = "new_accessibility_data" | "information_update" | "evidence_correction";
export type ContributionPriority = "normal" | "high";
export type ContributionSort = "oldest" | "newest" | "lowest_confidence" | "highest_reputation";
export type ContributionQueueView = "all" | "waiting_long" | "warning" | "new_place";
export type ContributionDateFilter = "all" | "today" | "7d" | "30d";
export type ContributionWarningFilter = "all" | "warning" | "over_sla";
export type VerificationOutcome = "needs_review" | "matched" | "missing_evidence" | "needs_cross_check" | "publishable" | "not_publishable";
export type EvidenceType = "image" | "video";
export type ClaimDecision = "pending" | "approved" | "needs_more_info" | "rejected";
export type TimelineEventType = "submitted" | "ai_completed" | "review_started" | "info_requested" | "reminder_sent" | "published" | "rejected";

export type AccessibilityCategory =
  | "Lối vào chính"
  | "Ram dốc"
  | "Cửa tự động"
  | "Thang máy"
  | "WC tiếp cận"
  | "Lối xúc giác"
  | "Bãi đỗ xe ưu tiên"
  | "Lối vào phẳng";

export interface ContributionPlace {
  id: string;
  name: string;
  address: string;
  district: string;
  city: "TP.HCM" | "Hà Nội";
}

export interface ContributorSummary {
  id: string;
  name: string;
  initials: string;
  reputationScore: number;
  avatarTone: "teal" | "cyan" | "slate" | "mint";
}

export interface ContributionVerification {
  confidence: number;
  outcome: VerificationOutcome;
  checkedItems?: number;
  totalItems?: number;
  note: string;
}

export interface ContributionRecord {
  id: string;
  submittedAt: string;
  attemptLabel: string;
  type: ContributionType;
  reason: ContributionReason;
  place: ContributionPlace;
  contributor: ContributorSummary;
  categories: AccessibilityCategory[];
  verification: ContributionVerification;
  status: ContributionStatus;
  priority: ContributionPriority;
  waitingMinutes: number;
  evidenceCount: number;
}

export interface EvidenceAiFinding {
  label: string;
  confidence?: number;
  tone: "positive" | "warning" | "critical" | "neutral";
}

export interface VisualSuggestion {
  feature: string;
  value: string;
  detectorScore?: number;
  bboxFormat?: string;
  coordinateSpace?: string;
  bboxNormalized?: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
}

export interface UserClaim {
  feature: string;
  claim: string;
  snippet?: string;
}

export interface ContributionEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  url: string;
  capturedAt: string;
  device: string;
  resolution: string;
  fileSize: string;
  exifStatus: "valid" | "missing" | "mismatch";
  geotagStatus: "valid" | "mismatch" | "missing";
  description: string;
  aiFindings: EvidenceAiFinding[];
  visualSuggestions?: VisualSuggestion[];
}

export interface AiClaimAssessment {
  label: string;
  confidence: number;
  details: string;
  advisoryOnly: true;
}

export interface AccessibilityClaim {
  id: string;
  feature: AccessibilityCategory;
  standard: string;
  contributorClaim: string;
  aiAssessment: AiClaimAssessment;
  currentPublishedValue?: string;
  evidenceIds: string[];
  eligibleForApproval: boolean;
  decision: ClaimDecision;
  decisionNote?: string;
}

export interface LocationIntegrity {
  poiCode: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  surveyArea: string;
  mismatchMeters?: number;
  warning?: string;
  mapHref?: string;
}

export interface ContributionTimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  occurredAt: string;
  actor: string;
}

export interface InformationRequest {
  requestedClaimIds: string[];
  evidenceItems: string[];
  instructions: string;
  requestedAt: string;
  requestedBy: string;
  dueAt: string;
  reminderSentAt?: string;
  responseStatus: "waiting" | "received";
}

export interface ModerationDecision {
  type: "published" | "rejected";
  selectedClaimIds: string[];
  reason: string;
  decidedAt: string;
  decidedBy: string;
}

export interface ContributorHistorySummary {
  approved: number;
  supplements: number;
  violations: number;
  reputationDelta?: number;
}

export interface ContributionDetail extends ContributionRecord {
  locationIntegrity: LocationIntegrity;
  evidence: ContributionEvidence[];
  claims: AccessibilityClaim[];
  timeline: ContributionTimelineEvent[];
  informationRequest?: InformationRequest;
  moderationDecision?: ModerationDecision;
  contributorHistory: ContributorHistorySummary;
  technicalNotes: string[];
  applicableStandards: string[];
  userClaims?: UserClaim[];
}

export interface RequestMoreInfoInput {
  claimIds: string[];
  evidenceItems: string[];
  instructions: string;
}

export interface ApproveContributionInput {
  claimIds: string[];
  note: string;
}

export interface ContributionNavigation {
  previousId?: string;
  nextId?: string;
  current: number;
  total: number;
}

export interface ContributionQueueSummary {
  total: number;
  awaitingDecision: number;
  needsSupplement: number;
  processed: number;
  published: number;
  rejected: number;
  active: number;
  warnings: number;
  waitingOverSla: number;
  newPlaces: number;
}

export interface ContributionQueueQuery {
  search?: string;
  status?: ContributionStatus | "processed" | "all";
  type?: ContributionType | "all";
  reason?: ContributionReason | "all";
  category?: AccessibilityCategory | "all";
  warning?: ContributionWarningFilter;
  date?: ContributionDateFilter;
  view?: ContributionQueueView;
  sort?: ContributionSort;
  page?: number;
  pageSize?: number;
}

export interface ContributionQueueResponse {
  items: ContributionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: ContributionQueueSummary;
  updatedAt: string;
  slaTargetMinutes: number;
}
