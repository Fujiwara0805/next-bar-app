import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// キャッシュ無効化（Route Segment Config）
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// quick_reservations は service_role で操作する（anon素通しRLSを撤廃したため）。
const supabase = createServerSupabaseClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }
    
    // 予約情報を取得
    const { data: reservation, error } = await supabase
      .from('quick_reservations')
      .select('*, stores(name, address)')
      .eq('id', id)
      .single();
    
    if (error || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }
    
    // 期限切れをチェック（pendingのまま期限切れになった場合）
    let finalStatus = reservation.status;
    if (reservation.status === 'pending' && reservation.expires_at) {
      const expiresAt = new Date(reservation.expires_at);
      const now = new Date();
      if (now > expiresAt) {
        // 期限切れになったので、expiredに更新
        finalStatus = 'expired';
        await supabase
          .from('quick_reservations')
          .update({ status: 'expired' })
          .eq('id', reservation.id);
      }
    }
    
    // レスポンスヘッダーでキャッシュを明示的に無効化
    return NextResponse.json(
      {
        id: reservation.id,
        status: finalStatus,
        storeName: reservation.stores?.name,
        storeAddress: reservation.stores?.address,
        callerName: reservation.caller_name,
        partySize: reservation.party_size,
        arrivalTime: reservation.arrival_time,
        confirmedAt: reservation.confirmed_at,
        rejectionReason: reservation.rejection_reason,
        createdAt: reservation.created_at,
        expiresAt: reservation.expires_at,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );
    
  } catch (error) {
    console.error('Error fetching reservation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}