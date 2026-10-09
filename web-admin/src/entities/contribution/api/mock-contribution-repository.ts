import type { ContributionRepository } from "./contribution-repository";
import { contributionMockRecords } from "./mock-contribution-data";
import { createContributionDetail } from "./mock-contribution-details";
import type {
  ApproveContributionInput,
  ContributionDetail,
  ContributionNavigation,
  ContributionQueueQuery,
  ContributionQueueResponse,
  ContributionQueueSummary,
  ContributionRecord,
  RequestMoreInfoInput,
} from "../model/types";

const MOCK_LATENCY_MS = 320;
const SLA_TARGET_MINUTES = 120;

function createSummary(records: ContributionRecord[]): ContributionQueueSummary {
  const awaitingDecision = records.filter((item) => item.status === "pending").length;
  const needsSupplement = records.filter((item) => item.status === "needs_supplement").length;
  const published = records.filter((item) => item.status === "published").length;
  const rejected = records.filter((item) => item.status === "rejected").length;
  const processed = published + rejected;

  return {
    total: records.length,
    awaitingDecision,
    needsSupplement,
    processed,
    published,
    rejected,
    active: awaitingDecision + needsSupplement,
    warnings: records.filter((item) => item.priority === "high").length,
    waitingOverSla: records.filter((item) => item.waitingMinutes > SLA_TARGET_MINUTES).length,
    newPlaces: records.filter((item) => item.type === "new_place").length,
  };
}

function matchesSearch(record: ContributionRecord, search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase("vi-VN");
  if (!normalizedSearch) return true;

  return [record.id, record.place.name, record.place.address, record.contributor.name]
    .some((value) => value.toLocaleLowerCase("vi-VN").includes(normalizedSearch));
}

function sortRecords(records: ContributionRecord[], sort: NonNullable<ContributionQueueQuery["sort"]>) {
  return [...records].sort((a, b) => {
    if (sort === "newest") return Date.parse(b.submittedAt) - Date.parse(a.submittedAt);
    if (sort === "lowest_confidence") return a.verification.confidence - b.verification.confidence;
    if (sort === "highest_reputation") return b.contributor.reputationScore - a.contributor.reputationScore;
    return Date.parse(a.submittedAt) - Date.parse(b.submittedAt);
  });
}

class MockContributionRepository implements ContributionRepository {
  private records = structuredClone(contributionMockRecords);
  private details = new Map(this.records.map((record) => [record.id, createContributionDetail(record)]));

  private async wait(signal?: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, MOCK_LATENCY_MS);
      signal?.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new DOMException("Đã hủy yêu cầu", "AbortError"));
      }, { once: true });
    });
  }

  private save(detail: ContributionDetail) {
    this.details.set(detail.id, detail);
    const recordIndex = this.records.findIndex((record) => record.id === detail.id);
    if (recordIndex >= 0) {
      this.records[recordIndex] = {
        id: detail.id,
        submittedAt: detail.submittedAt,
        attemptLabel: detail.attemptLabel,
        type: detail.type,
        reason: detail.reason,
        place: detail.place,
        contributor: detail.contributor,
        categories: detail.categories,
        verification: detail.verification,
        status: detail.status,
        priority: detail.priority,
        waitingMinutes: detail.waitingMinutes,
        evidenceCount: detail.evidenceCount,
      };
    }
    return structuredClone(detail);
  }

  async getQueue(query: ContributionQueueQuery = {}, signal?: AbortSignal): Promise<ContributionQueueResponse> {
    await this.wait(signal);

    const {
      search = "",
      status = "all",
      type = "all",
      reason = "all",
      category = "all",
      warning = "all",
      date = "all",
      view = "all",
      sort = "oldest",
      page = 1,
      pageSize = 8,
    } = query;

    const filtered = this.records.filter((record) => {
      const matchesStatus = status === "all"
        || (status === "processed" ? record.status === "published" || record.status === "rejected" : record.status === status);
      const matchesType = type === "all" || record.type === type;
      const matchesReason = reason === "all" || record.reason === reason;
      const matchesCategory = category === "all" || record.categories.includes(category);
      const matchesWarning = warning === "all"
        || (warning === "warning" && record.priority === "high")
        || (warning === "over_sla" && record.waitingMinutes > SLA_TARGET_MINUTES);
      const submittedAt = Date.parse(record.submittedAt);
      const referenceNow = Date.parse("2026-10-09T23:59:59+07:00");
      const dateWindow = date === "today" ? 24 * 60 * 60 * 1000 : date === "7d" ? 7 * 24 * 60 * 60 * 1000 : date === "30d" ? 30 * 24 * 60 * 60 * 1000 : Number.POSITIVE_INFINITY;
      const matchesDate = referenceNow - submittedAt <= dateWindow;
      const matchesView = view === "all"
        || (view === "waiting_long" && record.waitingMinutes > SLA_TARGET_MINUTES)
        || (view === "warning" && record.priority === "high")
        || (view === "new_place" && record.type === "new_place");

      return matchesSearch(record, search) && matchesStatus && matchesType && matchesReason && matchesCategory && matchesWarning && matchesDate && matchesView;
    });

    const sorted = sortRecords(filtered, sort);
    const safePageSize = Math.min(50, Math.max(1, pageSize));
    const totalPages = Math.max(1, Math.ceil(sorted.length / safePageSize));
    const safePage = Math.min(totalPages, Math.max(1, page));
    const start = (safePage - 1) * safePageSize;

    return structuredClone({
      items: sorted.slice(start, start + safePageSize),
      total: sorted.length,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
      summary: createSummary(this.records),
      updatedAt: "2026-10-09T15:39:00+07:00",
      slaTargetMinutes: SLA_TARGET_MINUTES,
    });
  }

  async getById(id: string, signal?: AbortSignal): Promise<ContributionDetail | null> {
    await this.wait(signal);
    const detail = this.details.get(id);
    return detail ? structuredClone(detail) : null;
  }

  async getNavigation(id: string): Promise<ContributionNavigation> {
    const index = this.records.findIndex((record) => record.id === id);
    return {
      previousId: index > 0 ? this.records[index - 1]?.id : undefined,
      nextId: index >= 0 && index < this.records.length - 1 ? this.records[index + 1]?.id : undefined,
      current: index >= 0 ? index + 1 : 0,
      total: this.records.length,
    };
  }

  async approve(id: string, input: ApproveContributionInput): Promise<ContributionDetail> {
    const detail = this.details.get(id);
    if (!detail) throw new Error("Không tìm thấy hồ sơ");
    if (input.claimIds.length === 0) throw new Error("Cần chọn ít nhất một hạng mục đủ điều kiện");

    const now = new Date().toISOString();
    detail.claims = detail.claims.map((claim) => input.claimIds.includes(claim.id)
      ? { ...claim, decision: "approved", decisionNote: "Được chọn công bố sau kiểm duyệt độc lập." }
      : { ...claim, decision: "rejected", decisionNote: "Không được chọn công bố trong quyết định này." });
    detail.status = "published";
    detail.waitingMinutes = 0;
    detail.verification = { ...detail.verification, outcome: "publishable", note: `${input.claimIds.length}/${detail.claims.length} hạng mục được chọn công bố` };
    detail.moderationDecision = { type: "published", selectedClaimIds: input.claimIds, reason: input.note, decidedAt: now, decidedBy: "Minh Trần" };
    detail.timeline.push({ id: `${id}-timeline-${Date.now()}`, type: "published", title: "Phê duyệt và công bố dữ liệu", description: `${input.claimIds.length}/${detail.claims.length} hạng mục được chọn. ${input.note}`, occurredAt: now, actor: "Minh Trần" });
    return this.save(detail);
  }

  async requestMoreInfo(id: string, input: RequestMoreInfoInput): Promise<ContributionDetail> {
    const detail = this.details.get(id);
    if (!detail) throw new Error("Không tìm thấy hồ sơ");
    if (input.claimIds.length === 0 || input.evidenceItems.length === 0 || !input.instructions.trim()) throw new Error("Vui lòng chọn hạng mục, minh chứng cần bổ sung và nhập hướng dẫn");

    const now = new Date().toISOString();
    const dueAt = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    detail.status = "needs_supplement";
    detail.attemptLabel = "Chờ bổ sung lần 1/2";
    detail.claims = detail.claims.map((claim) => input.claimIds.includes(claim.id) ? { ...claim, decision: "needs_more_info", decisionNote: input.instructions } : claim);
    detail.informationRequest = { requestedClaimIds: input.claimIds, evidenceItems: input.evidenceItems, instructions: input.instructions, requestedAt: now, requestedBy: "Minh Trần", dueAt, responseStatus: "waiting" };
    detail.timeline.push({ id: `${id}-timeline-${Date.now()}`, type: "info_requested", title: "Yêu cầu bổ sung minh chứng", description: input.instructions, occurredAt: now, actor: "Minh Trần" });
    return this.save(detail);
  }

  async reject(id: string, reason: string): Promise<ContributionDetail> {
    const detail = this.details.get(id);
    if (!detail) throw new Error("Không tìm thấy hồ sơ");
    if (!reason.trim()) throw new Error("Lý do từ chối là bắt buộc");

    const now = new Date().toISOString();
    detail.status = "rejected";
    detail.waitingMinutes = 0;
    detail.claims = detail.claims.map((claim) => ({ ...claim, decision: "rejected", decisionNote: reason }));
    detail.moderationDecision = { type: "rejected", selectedClaimIds: [], reason, decidedAt: now, decidedBy: "Minh Trần" };
    detail.timeline.push({ id: `${id}-timeline-${Date.now()}`, type: "rejected", title: "Từ chối hồ sơ", description: reason, occurredAt: now, actor: "Minh Trần" });
    return this.save(detail);
  }

  async sendReminder(id: string): Promise<ContributionDetail> {
    const detail = this.details.get(id);
    if (!detail || !detail.informationRequest) throw new Error("Hồ sơ không ở trạng thái chờ bổ sung");
    const now = new Date().toISOString();
    detail.informationRequest.reminderSentAt = now;
    detail.timeline.push({ id: `${id}-timeline-${Date.now()}`, type: "reminder_sent", title: "Đã gửi nhắc bổ sung", description: "Thông báo nhắc đã được gửi qua ứng dụng cộng đồng.", occurredAt: now, actor: "Minh Trần" });
    return this.save(detail);
  }
}

export const contributionRepository: ContributionRepository = new MockContributionRepository();
