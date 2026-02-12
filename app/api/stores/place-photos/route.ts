/**
 * ============================================
 * ファイルパス: app/api/stores/place-photos/route.ts
 * APIエンドポイント: /api/stores/place-photos
 * Google Place Photosを取得するAPI（Place Details photos を 24h サーバーキャッシュ）
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';

// サーバー専用キーを優先（未設定なら公開キーにフォールバック）
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** サーバーキャッシュ TTL: 24時間 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const placePhotosCache = new Map<string, CacheEntry<{ photos: string[] }>>();

function getCachedPhotos(placeId: string): { photos: string[] } | null {
  const entry = placePhotosCache.get(placeId);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function setCachedPhotos(placeId: string, data: { photos: string[] }): void {
  placePhotosCache.set(placeId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Google Place Photosを取得（キャッシュヒット時は Place Details API を叩かない）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const cached = getCachedPhotos(placeId);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        },
      });
    }

    // Place Details APIでphoto_referenceを取得
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${GOOGLE_MAPS_API_KEY}`;

    const detailsResponse = await fetch(detailsUrl);
    if (!detailsResponse.ok) {
      throw new Error(`Place Details API error: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result?.photos) {
      const empty = { photos: [] };
      setCachedPhotos(placeId, empty);
      return NextResponse.json(empty);
    }

    // 全ての写真URLを生成（プロキシ経由で取得）
    const photos = detailsData.result.photos
      .filter((photo: { photo_reference?: string }) => photo.photo_reference)
      .map((photo: { photo_reference: string }) =>
        `/api/stores/place-photo-proxy?photoReference=${encodeURIComponent(photo.photo_reference)}&maxwidth=800`
      );

    const result = { photos };
    setCachedPhotos(placeId, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place photos' },
      { status: 500 }
    );
  }
}
