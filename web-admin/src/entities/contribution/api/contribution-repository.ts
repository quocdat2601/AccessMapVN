import type {
  ApproveContributionInput,
  ContributionDetail,
  ContributionNavigation,
  ContributionQueueQuery,
  ContributionQueueResponse,
  RequestMoreInfoInput,
  ReviseClaimAssessmentInput,
} from "../model/types";

export interface ContributionRepository {
  getQueue(query?: ContributionQueueQuery, signal?: AbortSignal): Promise<ContributionQueueResponse>;
  getById(id: string, signal?: AbortSignal): Promise<ContributionDetail | null>;
  getNavigation(id: string): Promise<ContributionNavigation>;
  approve(id: string, input: ApproveContributionInput): Promise<ContributionDetail>;
  requestMoreInfo(id: string, input: RequestMoreInfoInput): Promise<ContributionDetail>;
  reject(id: string, reason: string): Promise<ContributionDetail>;
  reviseClaimAssessment(id: string, input: ReviseClaimAssessmentInput): Promise<ContributionDetail>;
  sendReminder(id: string): Promise<ContributionDetail>;
}
