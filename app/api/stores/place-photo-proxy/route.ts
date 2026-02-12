/**
 * ============================================
 * ファイルパス: app/api/stores/place-photo-proxy/route.ts
 * APIエンドポイント: /api/stores/place-photo-proxy
 * Google Place Photosをプロキシ経由で取得するAPI（24h サーバーキャッシュ）
 * CORS問題を回避するため、サーバー側で画像を取得して返す
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';

// サーバー専用キーを優先（未設定なら公開キーにフォールバック）
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** サーバーキャッシュ TTL: 24時間 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface PhotoCacheEntry {
  buffer: ArrayBuffer;
  contentType: string;
  expiresAt: number;
}

const photoProxyCache = new Map<string, PhotoCacheEntry>();

function getCacheKey(photoReference: string, maxwidth: string): string {
  return `${photoReference}|${maxwidth}`;
}

function getCachedPhoto(key: string): PhotoCacheEntry | null {
  const entry = photoProxyCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry;
}

function setCachedPhoto(key: string, buffer: ArrayBuffer, contentType: string): void {
  photoProxyCache.set(key, {
    buffer,
    contentType,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Google Place Photoをプロキシ経由で取得（キャッシュヒット時は Place Photo API を叩かない）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoReference = searchParams.get('photoReference');
    const maxwidth = searchParams.get('maxwidth') || '800';

    if (!photoReference) {
      return NextResponse.json({ error: 'photoReference is required' }, { status: 400 });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const cacheKey = getCacheKey(photoReference, maxwidth);
    const cached = getCachedPhoto(cacheKey);
    if (cached) {
      return new NextResponse(cached.buffer, {
        status: 200,
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
        },
      });
    }

    // Google Place Photos APIから画像を取得
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${encodeURIComponent(photoReference)}&key=${GOOGLE_MAPS_API_KEY}`;

    const photoResponse = await fetch(photoUrl);

    if (!photoResponse.ok) {
      console.error(`Place Photo API error: ${photoResponse.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch photo' },
        { status: photoResponse.status }
      );
    }

    const imageBuffer = await photoResponse.arrayBuffer();
    const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';

    setCachedPhoto(cacheKey, imageBuffer, contentType);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error proxying place photo:', error);
    return NextResponse.json(
      { error: 'Failed to proxy place photo' },
      { status: 500 }
    );
  }
}
