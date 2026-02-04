/**
 * Google Places Details API を使用して営業状態を判定するユーティリティ
 *
 * 重要:
 * - permanently/temporarily closed（閉業/休業）を business_status で検知し、必ず「営業外(false)」として扱う
 * - opening_hours が取得できないケースでも、business_status が CLOSED_* の場合は false を返す
 * - open_now が存在しない場合は null（判定不可）を返す（誤判定を避ける）
 */

// サーバー側は非公開キーを優先（未設定なら従来互換で NEXT_PUBLIC をフォールバック）
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface OpeningHoursPeriod {
  open: {
    day: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    time: string; // "HHMM" format (e.g., "0900" for 9:00 AM)
  };
  close?: {
    day: number;
    time: string;
  };
}

export interface OpeningHours {
  open_now?: boolean;
  periods?: OpeningHoursPeriod[];
  weekday_text?: string[];
}

export type BusinessStatus =
  | 'OPERATIONAL'
  | 'CLOSED_TEMPORARILY'
  | 'CLOSED_PERMANENTLY'
  | string;

export interface PlaceDetails {
  business_status?: BusinessStatus;
  opening_hours?: OpeningHours;
}

/**
 * Google Maps Places Details API から Place 情報を取得
 * @param placeId Google Place ID
 * @returns PlaceDetails または null（HTTP/ネットワーク失敗など）
 */
export async function getPlaceDetailsFromGoogle(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY（または NEXT_PUBLIC_GOOGLE_MAPS_API_KEY）が未設定です');
    return null;
  }

  try {
    // business_status を追加で取得することで「閉業/休業」を判定できる
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=opening_hours,business_status&key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY
    )}&language=ja`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // OK 以外でも result が返ることは基本ないため、ここで null
    if (data.status !== 'OK' || !data.result) {
      console.warn('Place Details が取得できませんでした:', {
        placeId,
        status: data.status,
        error_message: data.error_message,
      });
      return null;
    }

    return {
      business_status: data.result.business_status as BusinessStatus | undefined,
      opening_hours: data.result.opening_hours as OpeningHours | undefined,
    };
  } catch (error) {
    console.error('Place Details の取得に失敗しました:', error);
    return null;
  }
}

/**
 * （互換）Google Maps Places API から営業時間だけを取得
 * @deprecated 可能なら getPlaceDetailsFromGoogle を使用
 */
export async function getOpeningHoursFromGoogle(placeId: string): Promise<OpeningHours | null> {
  const details = await getPlaceDetailsFromGoogle(placeId);
  return details?.opening_hours ?? null;
}

/**
 * Google Maps JavaScript API を使用して Place Details を取得（クライアント用）
 */
export function getPlaceDetailsFromGoogleMapsJS(
  placeId: string,
  placesService: google.maps.places.PlacesService
): Promise<PlaceDetails | null> {
  return new Promise((resolve) => {
    placesService.getDetails(
      {
        placeId,
        // business_status が取得できる環境では併せて取得
        fields: ['opening_hours', 'business_status'] as any,
      } as any,
      (place: any, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve({
            business_status: place.business_status as BusinessStatus | undefined,
            opening_hours: place.opening_hours as OpeningHours | undefined,
          });
        } else {
          console.warn('Place Details(JS) が取得できませんでした:', status);
          resolve(null);
        }
      }
    );
  });
}

/**
 * （互換）Google Maps JavaScript API を使用して営業時間のみを取得（クライアント用）
 */
export function getOpeningHoursFromGoogleMapsJS(
  placeId: string,
  placesService: google.maps.places.PlacesService
): Promise<OpeningHours | null> {
  return new Promise((resolve) => {
    placesService.getDetails(
      {
        placeId: placeId,
        fields: ['opening_hours'],
      } as any,
      (place: any, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.opening_hours) {
          resolve(place.opening_hours);
        } else {
          console.warn('営業時間情報が取得できませんでした:', status);
          resolve(null);
        }
      }
    );
  });
}

/**
 * opening_hours.open_now の boolean 値を取得
 * @returns true/false または null（open_now が存在しない/判定不可）
 */
export function getIsOpenFromOpeningHours(openingHours: OpeningHours | null): boolean | null {
  if (!openingHours) return null;
  if (openingHours.open_now !== undefined) return openingHours.open_now;
  return null;
}

function isClosedByBusinessStatus(status?: BusinessStatus): boolean {
  return status === 'CLOSED_PERMANENTLY' || status === 'CLOSED_TEMPORARILY';
}

/**
 * Google Place ID から営業状態を判定して返す
 * - business_status が CLOSED_* なら必ず false
 * - open_now が取れれば true/false
 * - open_now が取れない場合は null（判定不可）
 */
export async function checkIsOpenFromGooglePlaceId(placeId: string | null): Promise<boolean | null> {
  if (!placeId) return null;

  const details = await getPlaceDetailsFromGoogle(placeId);
  if (!details) return null;

  if (isClosedByBusinessStatus(details.business_status)) {
    return false;
  }

  // opening_hours.open_now の boolean 値を直接返す
  return getIsOpenFromOpeningHours(details.opening_hours ?? null);
}

/**
 * クライアント（Google Maps JS）で Place Details から営業状態を判定
 */
export async function checkIsOpenFromGoogleMapsJS(
  placeId: string | null,
  placesService: google.maps.places.PlacesService
): Promise<boolean | null> {
  if (!placeId) return null;

  const details = await getPlaceDetailsFromGoogleMapsJS(placeId, placesService);
  if (!details) return null;

  if (isClosedByBusinessStatus(details.business_status)) {
    return false;
  }

  return getIsOpenFromOpeningHours(details.opening_hours ?? null);
}
