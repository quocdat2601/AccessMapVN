import { apiClient } from '@/shared/api/client';
import type {
  AccessibilityFeatureType,
  CastCommunityVoteInput,
  CommunityFeatureState,
  CommunityVoteReceipt,
  FeatureCommunityLabel,
  PublishedFeatureStatus,
  PublicCommunityComment,
  PublicTimelineItem,
} from '../model/types';

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function fetchCommunityState(
  locationId: string,
  featureType: AccessibilityFeatureType
): Promise<CommunityFeatureState> {
  const raw = await apiClient.get<any>(
    `/api/v1/locations/${encodeURIComponent(locationId)}/features/${featureType}/community`,
    { auth: 'none' }
  );
  const feature = raw.feature ?? raw.locationFeature ?? raw;
  const community = raw.communityState ?? raw.state ?? raw.community ?? raw;
  const advisoryRaw = raw.activeAdvisory ?? raw.advisory ?? community.advisory ?? null;

  return {
    locationId,
    featureType,
    featureVersion: numberOr(
      raw.publishedVersion ?? raw.featureVersion ?? feature.featureVersion ?? feature.version,
      0
    ),
    publishedStatus: (raw.publishedStatus ??
      feature.publishedStatus ??
      feature.currentStatus ??
      'Unknown') as PublishedFeatureStatus,
    label: (raw.communityLabel ?? community.communityLabel ?? community.label ?? 'Uncorroborated') as FeatureCommunityLabel,
    eligibleVoterCount: numberOr(
      community.eligibleVoterCount ?? community.distinctEligibleVoters,
      0
    ),
    contradictingVoterCount: numberOr(
      community.contradictingVoterCount ?? community.independentContradictions,
      0
    ),
    lastTrustedReconfirmedAt: community.lastTrustedReconfirmedAt ?? null,
    freshnessFactor: numberOr(community.freshnessFactor, 1),
    advisory: advisoryRaw
      ? {
          reason: String(advisoryRaw.reason ?? ''),
          startsAt: String(advisoryRaw.startsAt ?? ''),
          endsAt: String(advisoryRaw.endsAt ?? ''),
        }
      : null,
  };
}

export async function castCommunityVote(
  locationId: string,
  featureType: AccessibilityFeatureType,
  input: CastCommunityVoteInput,
  userId: string
): Promise<CommunityVoteReceipt> {
  const raw = await apiClient.postIdempotent<any>(
    `/api/v1/locations/${encodeURIComponent(locationId)}/features/${featureType}/votes`,
    input,
    `vote:${userId}:${locationId}:${featureType}:${input.observedFeatureVersion}:${input.voteType}:${input.proposedStatus ?? 'baseline'}`,
    { auth: 'required' }
  );

  return {
    voteId: String(raw.voteId ?? raw.id ?? ''),
    status: (raw.voteStatus ?? raw.status ?? 'Recorded') as CommunityVoteReceipt['status'],
    featureVersion: numberOr(
      raw.publishedVersion ?? raw.featureVersion ?? input.observedFeatureVersion,
      input.observedFeatureVersion
    ),
  };
}

export async function linkVoteSubmission(voteId: string, submissionId: string): Promise<void> {
  await apiClient.postIdempotent(
    `/api/v1/community-votes/${encodeURIComponent(voteId)}/link-submission`,
    { submissionId },
    `vote-link:${voteId}:${submissionId}`,
    { auth: 'required' }
  );
}

export async function withdrawCommunityVote(
  locationId: string,
  featureType: AccessibilityFeatureType
): Promise<void> {
  await apiClient.delete(
    `/api/v1/locations/${encodeURIComponent(locationId)}/features/${featureType}/votes/mine`,
    { auth: 'required' }
  );
}

export async function fetchLocationTimeline(locationId: string): Promise<PublicTimelineItem[]> {
  const response = await apiClient.get<{ items: PublicTimelineItem[] }>(
    `/api/v1/locations/${encodeURIComponent(locationId)}/timeline?pageSize=10`,
    { auth: 'none' }
  );
  return response.items ?? [];
}

export async function fetchCommunityComments(locationId: string): Promise<PublicCommunityComment[]> {
  const response = await apiClient.get<{ items: PublicCommunityComment[] }>(
    `/api/v1/locations/${encodeURIComponent(locationId)}/comments?pageSize=20`,
    { auth: 'none' }
  );
  return response.items ?? [];
}

export async function submitCommunityComment(
  locationId: string,
  body: string,
  userId: string
): Promise<void> {
  await apiClient.postIdempotent(
    `/api/v1/locations/${encodeURIComponent(locationId)}/comments`,
    { body },
    `comment:${userId}:${locationId}`,
    { auth: 'required' }
  );
}
