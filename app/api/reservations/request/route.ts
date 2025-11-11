import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    // userIdはオプショナルに変更
    const { storeId, userId, userName, userPhone, partySize } = await request.json();
    
    // 入力検証（userIdは不要、userNameは必須）
    if (!storeId || !userName || !userPhone || !partySize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 店舗情報を取得
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, phone')
      .eq('id', storeId)
      .single();
    
    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    if (!store.phone) {
      return NextResponse.json(
        { error: 'Store phone number not available' },
        { status: 400 }
      );
    }
    
    // 到着予定時刻（10分後）
    const arrivalTime = new Date(Date.now() + 10 * 60 * 1000);
    
    // 予約リクエストをデータベースに記録
    const { data: reservation, error: reservationError } = await supabase
      .from('quick_reservations')
      .insert({
        store_id: storeId,
        user_id: userId || null, // オプショナル（ゲスト予約の場合はnull）
        caller_name: userName, // 必須
        caller_phone: userPhone,
        party_size: partySize,
        arrival_time: arrivalTime.toISOString(),
        status: 'pending',
        expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(), // 3分で期限切れ
      })
      .select()
      .single();
    
    if (reservationError) {
      console.error('Failed to create reservation:', reservationError);
      return NextResponse.json(
        { error: 'Failed to create reservation' },
        { status: 500 }
      );
    }
    
    // 店舗に自動音声電話をかける
    try {
      const call = await twilioClient.calls.create({
        to: store.phone,
        from: process.env.TWILIO_PHONE_NUMBER!,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/ivr?reservationId=${reservation.id}`,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['completed', 'no-answer', 'busy', 'failed'],
        timeout: 60, // 60秒でタイムアウト
      });
      
      // 通話IDを記録
      await supabase
        .from('quick_reservations')
        .update({ call_sid: call.sid })
        .eq('id', reservation.id);
      
      return NextResponse.json({
        success: true,
        reservationId: reservation.id,
        callSid: call.sid,
      });
      
    } catch (twilioError) {
      console.error('Twilio call error:', twilioError);
      
      // 通話失敗時は予約をキャンセル
      await supabase
        .from('quick_reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);
      
      return NextResponse.json(
        { error: 'Failed to call store' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


