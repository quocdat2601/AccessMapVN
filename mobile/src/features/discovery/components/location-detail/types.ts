export type AccessibilityIconName =
  | 'wheelchair-accessibility'
  | 'elevator-passenger'
  | 'slope-uphill'
  | 'toilet';

export interface AccessibilityDetailFeature {
  id: string;
  icon: AccessibilityIconName;
  label: string;
  confirmations: number;
}

export interface CommunityReview {
  id: string;
  author: string;
  initials: string;
  age: string;
  helpfulCount: number;
  comment: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  isFaceBlurred?: boolean;
}

export interface LocationDetailData {
  id: string;
  name: string;
  address: string;
  standardLabel: string;
  trustPercent: number;
  confirmationCount: number;
  lastVerified: string;
  verificationState: string;
  features: AccessibilityDetailFeature[];
  reviews: CommunityReview[];
  evidence: EvidenceItem[];
}
