import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { sendPushToStore } from '@/lib/push/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// quick_reservations は service_role で操作する（anon素通しRLSを撤廃したため）。
const supabase = createServerSupabaseClient();

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

if (!twilioAccountSid || !twilioAuthToken) {
  throw new Error('Missing Twilio environment variables: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
}

const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

export async function POST(request: NextRequest) {
  try {
    // userIdはオプショナルに変更
    const { storeId, userId, userName, userPhone, partySize, arrivalMinutes } = await request.json();
    
    // 入力検証（userIdは不要、userNameは必須）
    if (!storeId || !userName || !userPhone || !partySize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 入力の型・長さバリデーション
    // （TTSで読み上げられるため過度に長い/不正な値を拒否し、悪用を抑止）
    const name = String(userName).trim().slice(0, 50);
    const phoneRaw = String(userPhone).trim();
    if (!/^[0-9+\-\s()]{8,20}$/.test(phoneRaw)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    const size = Number(partySize);
    if (!Number.isInteger(size) || size < 1 || size > 50) {
      return NextResponse.json(
        { error: 'Invalid party size' },
        { status: 400 }
      );
    }

    // 到着時間の検証（デフォルトは10分）
    const minutes = arrivalMinutes ? parseInt(arrivalMinutes) : 10;
    if (![10, 20, 30].includes(minutes)) {
      return NextResponse.json(
        { error: 'Invalid arrival minutes. Must be 10, 20, or 30' },
        { status: 400 }
      );
    }

    // レート制限（防御的多層化）: ログイン不要のため、
    // 直近5分の quick_reservations を caller_phone / store_id 単位で数え、
    // 連続発信によるスパム架電・Twilio課金浪費を抑止する。
    const RATE_WINDOW_MS = 5 * 60 * 1000;
    const MAX_PER_PHONE = 3;
    const MAX_PER_STORE = 5;
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

    const [{ count: phoneCount }, { count: storeCount }] = await Promise.all([
      supabase
        .from('quick_reservations')
        .select('id', { count: 'exact', head: true })
        .eq('caller_phone', phoneRaw)
        .gte('created_at', since),
      supabase
        .from('quick_reservations')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', since),
    ]);

    if ((phoneCount ?? 0) >= MAX_PER_PHONE || (storeCount ?? 0) >= MAX_PER_STORE) {
      return NextResponse.json(
        { error: 'Too many reservation requests. Please try again later.' },
        { status: 429 }
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
    
    // 到着予定時刻（選択された分数後）
    const arrivalTime = new Date(Date.now() + minutes * 60 * 1000);
    
    // 予約リクエストをデータベースに記録
    const { data: reservation, error: reservationError } = await supabase
      .from('quick_reservations')
      .insert({
        store_id: storeId,
        user_id: userId || null, // オプショナル（ゲスト予約の場合はnull）
        caller_name: name, // 必須
        caller_phone: phoneRaw,
        party_size: size,
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
      // 店舗の電話番号を国際形式に変換
      const storePhoneInternational = convertToInternational(store.phone);
      
      const call = await twilioClient.calls.create({
        to: storePhoneInternational,
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

      // 店舗にプッシュ通知を送信（新規予約リクエスト）
      sendPushToStore(storeId, {
        title: '🔔 新しい予約リクエスト',
        body: `${name}様から${size}名の予約リクエストが入りました。`,
        url: `/store/manage/${storeId}/update`,
        tag: `reservation-${reservation.id}`,
      });

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

// 電話番号を国際形式に変換
function convertToInternational(phone: string): string {
  // 090-1234-5678 → +819012345678
  const cleaned = phone.replace(/[-\s]/g, '');
  
  // 既に+81で始まっている場合はそのまま返す
  if (cleaned.startsWith('+81')) {
    return cleaned;
  }
  
  // 0で始まる日本の電話番号の場合
  if (cleaned.startsWith('0')) {
    return `+81${cleaned.substring(1)}`;
  }
  
  // その他の形式の場合は+81を付加
  return `+81${cleaned}`;
}

