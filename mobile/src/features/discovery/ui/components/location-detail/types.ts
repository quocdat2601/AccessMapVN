import type {
  AccessibilityFeatureType,
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

export interface AccessibilityDetailFeature {
  id: string;
  icon: AccessibilityIconName;
  label: string;
  featureType: AccessibilityFeatureType;
  publishedStatus: PublishedFeatureStatus;
  confirmations?: number;
  status?: string;
  description?: string;
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
  comment: string;
}
