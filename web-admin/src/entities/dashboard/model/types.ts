export type DateRangeKey = "7d" | "30d";
export type MetricTone = "normal" | "warning" | "critical" | "positive";
export type TrendDirection = "up" | "down" | "flat";

export interface DashboardMetric {
  id: "pending" | "overdue" | "processing-time" | "on-time";
  label: string;
  value: number;
  unit?: string;
  supportingText: string;
  comparison: string;
  trend: number;
  trendDirection: TrendDirection;
  tone: MetricTone;
  icon: "inbox" | "clock-alert" | "timer" | "circle-check";
}

export type PriorityType = "submission" | "dispute" | "ai-failure" | "suspicious-user";
export type PriorityLevel = "high" | "medium";

export interface PriorityItem {
  id: string;
  type: PriorityType;
  title: string;
  context: string;
  waitingTime: string;
  priority: PriorityLevel;
  actionLabel: string;
  href: string;
}

export interface TrendPoint {
  label: string;
  submissions: number;
  disputes: number;
  resolved: number;
  backlog: number;
}

export interface WorkflowSlice {
  name: string;
  value: number;
  color: string;
}

export interface DistributionItem {
  label: string;
  value: number;
  percentage: number;
  tone: "teal" | "slate" | "amber" | "red" | "blue";
}

export interface AiOutcome {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PublishedLocation {
  id: string;
  name: string;
  district: string;
  accessibilityScore: number;
  publishedAt: string;
  category: string;
}

export interface DashboardSummary {
  received: number;
  resolved: number;
  pendingSubmissions: number;
  pendingDisputes: number;
  locationsPublished: number;
  coverageDistricts: number;
  coverageDistrictsTotal: number;
}

export interface DashboardData {
  range: DateRangeKey;
  rangeLabel: string;
  generatedAt: string;
  summary: DashboardSummary;
  metrics: DashboardMetric[];
  priorities: PriorityItem[];
  trends: TrendPoint[];
  workflow: WorkflowSlice[];
  backlogAging: DistributionItem[];
  aiOutcomes: AiOutcome[];
  recentLocations: PublishedLocation[];
}
