/**
 * ============================================
 * ファイルパス: app/api/stores/place-photos/route.ts
 * APIエンドポイント: /api/stores/place-photos
 * Google Place Photosを取得するAPI
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Google Place Photosを取得
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

    // Place Details APIでphoto_referenceを取得
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${GOOGLE_MAPS_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    if (!detailsResponse.ok) {
      throw new Error(`Place Details API error: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();
    
    if (detailsData.status !== 'OK' || !detailsData.result?.photos) {
      return NextResponse.json({ photos: [] });
    }

    // 全ての写真URLを生成（プロキシ経由で取得）
    // プロキシ経由にすることで、CORS問題を回避し、APIキーをクライアントに露出しない
    const photos = detailsData.result.photos.map((photo: any) => {
      const photoReference = photo.photo_reference;
      // プロキシAPIエンドポイントを使用
      return `/api/stores/place-photo-proxy?photoReference=${encodeURIComponent(photoReference)}&maxwidth=800`;
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place photos' },
      { status: 500 }
    );
  }
}
