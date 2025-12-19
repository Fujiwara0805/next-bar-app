/**
 * Google Maps APIを使用して営業時間を取得し、opening_hours.open_nowのboolean値でis_openを判定するユーティリティ
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

/**
 * Google Maps Places APIから営業時間を取得
 * @param placeId Google Place ID
 * @returns 営業時間情報、またはnull（取得失敗時）
 */
export async function getOpeningHoursFromGoogle(
  placeId: string
): Promise<OpeningHours | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定です');
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&key=${GOOGLE_MAPS_API_KEY}&language=ja`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.result?.opening_hours) {
      console.warn('営業時間情報が取得できませんでした:', data.status);
      return null;
    }

    return data.result.opening_hours;
  } catch (error) {
    console.error('営業時間の取得に失敗しました:', error);
    return null;
  }
}

/**
 * Google Maps JavaScript APIを使用して営業時間を取得（クライアントサイド用）
 * @param placeId Google Place ID
 * @param placesService Google Maps PlacesService インスタンス
 * @returns 営業時間情報、またはnull（取得失敗時）
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
 * opening_hours.open_nowのboolean値を取得
 * @param openingHours 営業時間情報
 * @returns 営業中の場合true、それ以外false、またはnull（open_nowが存在しない場合）
 */
export function getIsOpenFromOpeningHours(openingHours: OpeningHours | null): boolean | null {
  if (!openingHours) {
    return null;
  }

  // open_nowが存在する場合のみ使用（open_nowがundefinedの場合はnullを返す）
  if (openingHours.open_now !== undefined) {
    return openingHours.open_now;
  }

  // open_nowが存在しない場合はnullを返す
  return null;
}

/**
 * Google Place IDから営業時間を取得し、open_nowのboolean値を返す
 * @param placeId Google Place ID
 * @returns 営業中の場合true、それ以外false、またはnull（判定不可）
 */
export async function checkIsOpenFromGooglePlaceId(
  placeId: string | null
): Promise<boolean | null> {
  if (!placeId) {
    return null;
  }

  const openingHours = await getOpeningHoursFromGoogle(placeId);
  if (!openingHours) {
    return null;
  }

  // opening_hours.open_nowのboolean値を直接返す
  return getIsOpenFromOpeningHours(openingHours);
}

/**
 * Google Maps JavaScript APIを使用して営業時間を取得し、open_nowのboolean値を返す（クライアントサイド用）
 * @param placeId Google Place ID
 * @param placesService Google Maps PlacesService インスタンス
 * @returns 営業中の場合true、それ以外false、またはnull（判定不可）
 */
export async function checkIsOpenFromGoogleMapsJS(
  placeId: string | null,
  placesService: google.maps.places.PlacesService
): Promise<boolean | null> {
  if (!placeId) {
    return null;
  }

  const openingHours = await getOpeningHoursFromGoogleMapsJS(placeId, placesService);
  if (!openingHours) {
    return null;
  }

  // opening_hours.open_nowのboolean値を直接返す
  return getIsOpenFromOpeningHours(openingHours);
}
