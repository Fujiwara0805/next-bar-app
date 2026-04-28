/**
 * 2点間の距離計算 (Haversine 公式)
 *
 * Phase 2 双方向QR のジオフェンス検証で使用。屋外GPS精度は5–15m、
 * 建物内では数十m程度の誤差が出るため、API側では accuracy も考慮した
 * 動的閾値で判定することを想定 (本ファイルは純粋距離計算のみ)。
 */

const EARTH_RADIUS_METERS = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

/**
 * GPS精度に応じてジオフェンス閾値を動的に決定する。
 * accuracy が小さい (高精度) → 厳しい閾値、大きい (低精度) → 緩い閾値。
 */
export function effectiveGeofenceThreshold(
  baseThresholdM: number,
  accuracyM: number | null | undefined
): number {
  if (accuracyM == null || !Number.isFinite(accuracyM) || accuracyM <= 0) {
    return baseThresholdM;
  }
  // accuracy の2倍を許容、ただし baseThreshold * 2 が上限
  const allowed = Math.max(baseThresholdM, accuracyM * 2);
  return Math.min(allowed, baseThresholdM * 2);
}
