export type AccessibilityFeatureType =
  | 'Ramp'
  | 'EntranceDoor'
  | 'Elevator'
  | 'AccessibleRestroom'
  | 'TactilePaving';

export type PublishedFeatureStatus = 'Available' | 'Limited' | 'NotAvailable' | 'Unknown';
export type CommunityVoteType = 'StillAccurate' | 'Changed';
export type CommunityVoteStatus =
  | 'Recorded'
  | 'PendingValidation'
  | 'Eligible'
  | 'Rejected'
  | 'Superseded'
  | 'Archived';
export type FeatureCommunityLabel =
  | 'Uncorroborated'
  | 'Fresh'
  | 'Reinforced'
  | 'NeedsRecheck'
  | 'ConflictReported'
  | 'CommunityUnderReview';

export interface CommunityFeatureInput {
  featureType: AccessibilityFeatureType;
  label: string;
  icon: string;
  publishedStatus: PublishedFeatureStatus;
}

export interface CommunityFeatureState {
  locationId: string;
  featureType: AccessibilityFeatureType;
  featureVersion: number;
  publishedStatus: PublishedFeatureStatus;
  label: FeatureCommunityLabel;
  eligibleVoterCount: number;
  contradictingVoterCount: number;
  lastTrustedReconfirmedAt: string | null;
  freshnessFactor: number;
  advisory: {
    reason: string;
    startsAt: string;
    endsAt: string;
  } | null;
}

export interface CastCommunityVoteInput {
  voteType: CommunityVoteType;
  observedFeatureVersion: number;
  proposedStatus?: PublishedFeatureStatus;
  comment?: string;
}

export interface CommunityVoteReceipt {
  voteId: string;
  status: CommunityVoteStatus;
  featureVersion: number;
}

export interface PublicTimelineItem {
  id: string;
  eventType: 'FeaturePublished' | 'MetadataUpdated';
  occurredAt: string;
  featureType?: AccessibilityFeatureType;
  publishedStatus?: PublishedFeatureStatus;
  featureVersion?: number;
  metadataVersion?: number;
  summary: string;
}

export interface PublicCommunityComment {
  id: string;
  body: string;
  authorLabel: string;
  createdAt: string;
  recencyWeight: number;
  isRecentContext: boolean;
}
