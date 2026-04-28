/**
 * 客報告 (store_crowd_reports) を時間減衰付きで集計する。
 *
 * Phase 1-A 「いま空いてる？」報告ボタンで使用。
 * 直近 WINDOW_MINUTES の有効報告を取り、 e^(-t/HALFLIFE_MIN) の重みで
 * 投票を集計し、最多得票ステータスを返す。3票未満なら null (未確定)。
 */

export type CrowdStatus = 'vacant' | 'busy' | 'full';

export const CROWD_STATUSES: CrowdStatus[] = ['vacant', 'busy', 'full'];

export const WINDOW_MINUTES = 30;
export const HALFLIFE_MINUTES = 15;
export const MIN_REPORTS_FOR_VALID = 3;

export type CrowdReport = {
  report_type: string;
  reported_at: string; // ISO timestamp
};

export type CrowdAggregate = {
  status: CrowdStatus | null;
  totalReports: number;
  weightedVotes: Record<CrowdStatus, number>;
  rawCounts: Record<CrowdStatus, number>;
  isValid: boolean;
  windowMinutes: number;
  computedAt: string;
};

const ZERO_VOTES = (): Record<CrowdStatus, number> => ({
  vacant: 0,
  busy: 0,
  full: 0,
});

function isCrowdStatus(s: string): s is CrowdStatus {
  return CROWD_STATUSES.includes(s as CrowdStatus);
}

export function aggregateCrowdReports(
  reports: CrowdReport[],
  now: Date = new Date()
): CrowdAggregate {
  const weighted = ZERO_VOTES();
  const counts = ZERO_VOTES();
  const cutoffMs = now.getTime() - WINDOW_MINUTES * 60 * 1000;

  for (const r of reports) {
    if (!isCrowdStatus(r.report_type)) continue;
    const reportedMs = new Date(r.reported_at).getTime();
    if (Number.isNaN(reportedMs) || reportedMs < cutoffMs) continue;

    const ageMin = (now.getTime() - reportedMs) / 60_000;
    const weight = Math.exp(-ageMin / HALFLIFE_MINUTES);

    weighted[r.report_type] += weight;
    counts[r.report_type] += 1;
  }

  const totalReports = CROWD_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const isValid = totalReports >= MIN_REPORTS_FOR_VALID;

  let topStatus: CrowdStatus | null = null;
  if (isValid) {
    let topWeight = 0;
    for (const s of CROWD_STATUSES) {
      if (weighted[s] > topWeight) {
        topWeight = weighted[s];
        topStatus = s;
      }
    }
  }

  return {
    status: topStatus,
    totalReports,
    weightedVotes: weighted,
    rawCounts: counts,
    isValid,
    windowMinutes: WINDOW_MINUTES,
    computedAt: now.toISOString(),
  };
}
