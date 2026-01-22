/**
 * ============================================
 * ファイルパス: app/api/stores/place-photo-proxy/route.ts
 * APIエンドポイント: /api/stores/place-photo-proxy
 * Google Place Photosをプロキシ経由で取得するAPI
 * CORS問題を回避するため、サーバー側で画像を取得して返す
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Google Place Photoをプロキシ経由で取得
 * photoReferenceを受け取り、サーバー側でGoogle APIから画像を取得して返す
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

    // 画像データを取得
    const imageBuffer = await photoResponse.arrayBuffer();
    const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';

    // 画像をそのまま返す（プロキシとして機能）
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1時間キャッシュ
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
