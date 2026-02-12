/**
 * ============================================
 * APIエンドポイント: /api/geocode
 * 住所から緯度経度を取得するサーバーサイドGeocodingプロキシ
 * クライアントにAPIキーを露出させないためのセキュリティ対策
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** サーバーキャッシュ TTL: 24時間（同じ住所の再リクエストを削減） */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface GeocodeCacheEntry {
  lat: number;
  lng: number;
  expiresAt: number;
}

const geocodeCache = new Map<string, GeocodeCacheEntry>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: 'address パラメータが必要です' },
        { status: 400 }
      );
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // キャッシュチェック
    const cacheKey = address.trim().toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(
        { lat: cached.lat, lng: cached.lng, fromCache: true },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
          },
        }
      );
    }

    // Google Geocoding API 呼び出し（サーバーサイドのためAPIキーは安全）
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&language=ja&region=JP`;

    const resp = await fetch(url);

    if (!resp.ok) {
      throw new Error(`Geocoding API HTTP error: ${resp.status}`);
    }

    const data = await resp.json();

    if (data.status === 'OK' && data.results && data.results[0]) {
      const loc = data.results[0].geometry.location;

      // キャッシュに保存
      geocodeCache.set(cacheKey, {
        lat: loc.lat,
        lng: loc.lng,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return NextResponse.json(
        { lat: loc.lat, lng: loc.lng },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
          },
        }
      );
    }

    return NextResponse.json(
      { error: 'Geocoding結果が見つかりませんでした', status: data.status },
      { status: 404 }
    );
  } catch (error) {
    console.error('Geocoding API error:', error);
    return NextResponse.json(
      { error: 'Geocodingに失敗しました' },
      { status: 500 }
    );
  }
}
