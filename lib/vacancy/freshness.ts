// ============================================
// 空席情報の鮮度判定（戦略 §14/§19「死因#1: 空席情報の信頼崩壊」対策）
//
// リアルタイムな「空席あり(vacant)」表示は、店舗が更新してから時間が経つと
// 実態と乖離し（行ったら満席だった）、サービス全体の信用を失わせる。
// そこで、最終更新時刻からの経過時間がしきい値を超えた `vacant` は
// 「営業中・要確認 (open)」へ自動降格し、UI に鮮度を明示する。
//
// この関数は副作用のない純粋関数。サーバ/クライアントの双方から呼べる。
// ============================================

/** これを超えて未更新の「空席あり」は鮮度切れとみなす（分） */
export const VACANCY_STALE_MINUTES = 120;

export type VacancyFreshness = {
  /** 鮮度を加味した表示用ステータス（古い vacant は open へ降格） */
  displayStatus: string;
  /** 鮮度切れか（リアルタイム性が重要な vacant/full のみ true になり得る） */
  stale: boolean;
  /** 最終更新からの経過分。タイムスタンプ不明なら null */
  ageMinutes: number | null;
  /** 自動降格が発生したか（vacant → open） */
  downgraded: boolean;
};

/**
 * 空席ステータスの鮮度を評価する。
 *
 * @param status        DB上（または営業時間補正後）の vacancy_status
 * @param lastUpdatedIso 店舗が空席を更新した時刻（stores.last_updated 等）
 * @param now           現在時刻(ms)。テスト用に注入可能
 * @param staleMinutes  鮮度しきい値（分）
 */
export function getVacancyFreshness(
  status: string | null | undefined,
  lastUpdatedIso: string | null | undefined,
  now: number = Date.now(),
  staleMinutes: number = VACANCY_STALE_MINUTES
): VacancyFreshness {
  const baseStatus = status ?? 'closed';

  // 経過時間の算出（不正/欠落タイムスタンプは null 扱い）
  let ageMinutes: number | null = null;
  if (lastUpdatedIso) {
    const ts = new Date(lastUpdatedIso).getTime();
    if (Number.isFinite(ts)) {
      ageMinutes = Math.max(0, Math.floor((now - ts) / 60000));
    }
  }

  // リアルタイム性が重要なステータスのみ鮮度切れの対象。
  // closed/open は時間によって実態が大きく乖離しないため対象外。
  const timeSensitive = baseStatus === 'vacant' || baseStatus === 'full';
  const stale =
    timeSensitive && ageMinutes !== null && ageMinutes > staleMinutes;

  // 古い「空席あり」は「営業中・要確認」へ降格（満席は降格せず鮮度警告のみ）
  const downgraded = stale && baseStatus === 'vacant';
  const displayStatus = downgraded ? 'open' : baseStatus;

  return { displayStatus, stale, ageMinutes, downgraded };
}

/**
 * 経過分を人間可読な相対表現に整形する補助。
 * i18n の単位ラベルを渡して使う（例: minutesUnit='分前', hoursUnit='時間前'）。
 */
export function formatVacancyAge(
  ageMinutes: number | null,
  labels: { justNow: string; minutesAgo: (n: number) => string; hoursAgo: (n: number) => string }
): string | null {
  if (ageMinutes === null) return null;
  if (ageMinutes < 1) return labels.justNow;
  if (ageMinutes < 60) return labels.minutesAgo(ageMinutes);
  return labels.hoursAgo(Math.floor(ageMinutes / 60));
}
