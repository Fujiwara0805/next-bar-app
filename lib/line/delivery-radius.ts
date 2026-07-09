export const LINE_DELIVERY_DEFAULT_RADIUS_KM = 1;
export const LINE_DELIVERY_MIN_RADIUS_KM = 0.5;
export const LINE_DELIVERY_MAX_RADIUS_KM = 5;

export function normalizeLineDeliveryRadiusKm(
  value: unknown,
  fallback = LINE_DELIVERY_DEFAULT_RADIUS_KM
): number {
  if (value == null || value === '') {
    return normalizeLineDeliveryRadiusKm(fallback, LINE_DELIVERY_DEFAULT_RADIUS_KM);
  }
  const n = Number(value);
  const base = Number.isFinite(n) ? n : fallback;
  return Math.min(
    LINE_DELIVERY_MAX_RADIUS_KM,
    Math.max(LINE_DELIVERY_MIN_RADIUS_KM, base)
  );
}
