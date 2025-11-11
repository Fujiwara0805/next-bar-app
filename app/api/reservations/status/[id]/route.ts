import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    
    return NextResponse.json({
      id: reservation.id,
      status: reservation.status,
      storeName: reservation.stores?.name,
      storeAddress: reservation.stores?.address,
      callerName: reservation.caller_name,
      partySize: reservation.party_size,
      arrivalTime: reservation.arrival_time,
      confirmedAt: reservation.confirmed_at,
      rejectionReason: reservation.rejection_reason,
      createdAt: reservation.created_at,
      expiresAt: reservation.expires_at,
    });
    
  } catch (error) {
    console.error('Error fetching reservation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

