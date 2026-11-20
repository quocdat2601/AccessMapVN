import type {
  AccessibilityFeatureType,
  CommunityCommentStatus,
  FeatureCommunityLabel,
  PublishedFeatureStatus,
} from '@/features/community';

export type AccessibilityIconName =
  | 'wheelchair-accessibility'
  | 'elevator-passenger'
  | 'slope-uphill'
  | 'toilet'
  | 'door'
  | 'dots-grid'
  | 'shield-check'
  | 'check-decagram';

export type FeatureVerificationLevel =
  | 'verified_compliant'
  | 'unverified_presence'
  | 'limited'
  | 'not_available'
  | 'unknown';

export interface AccessibilityDetailFeature {
  id: string;
  icon: AccessibilityIconName;
  label: string;
  featureType: AccessibilityFeatureType;
  publishedStatus: PublishedFeatureStatus;
  verificationLevel?: FeatureVerificationLevel;
  specLabel?: string;
  confirmations?: number;
  status?: string;
  description?: string;
  communityLabel?: FeatureCommunityLabel;
  eligibleVoterCount?: number;
  contradictingVoterCount?: number;
  freshnessPercent?: number;
  advisory?: { reason: string; endsAt: string } | null;
  featureVersion?: number;
}

export interface EvidenceItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  isFaceBlurred?: boolean;
  imageUrl?: string;
  specTag?: string;
  specIcon?: string;
}


export interface CommunityReview {
  id: string;
  author: string;
  initials: string;
  age: string;
  helpfulCount: number;
  likesCount?: number;
  comment: string;
  status?: CommunityCommentStatus;
  isOwn?: boolean;
  createdAtIso?: string;
}
