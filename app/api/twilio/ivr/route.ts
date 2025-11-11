import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reservationId = searchParams.get('reservationId');
    
    if (!reservationId) {
      return new NextResponse('Invalid request', { status: 400 });
    }
    
    // 予約情報を取得
    const { data: reservation, error } = await supabase
      .from('quick_reservations')
      .select('*, stores(name)')
      .eq('id', reservationId)
      .single();
    
    if (error || !reservation) {
      console.error('Reservation not found:', error);
      
      const twiml = new VoiceResponse();
      twiml.say(
        { language: 'ja-JP', voice: 'Polly.Mizuki' },
        '予約情報が見つかりませんでした。'
      );
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // 予約が既に処理済みか確認
    if (reservation.status !== 'pending') {
      const twiml = new VoiceResponse();
      twiml.say(
        { language: 'ja-JP', voice: 'Polly.Mizuki' },
        'この予約は既に処理されています。'
      );
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // TwiML（音声とボタン入力）を生成
    const twiml = new VoiceResponse();
    
    // Gatherで数字入力を受け付ける
    const gather = twiml.gather({
      numDigits: 1,
      action: `/api/twilio/ivr-response?reservationId=${reservationId}`,
      method: 'POST',
      timeout: 10,
    });
    
    // 到着予定時刻をフォーマット
    const arrivalTime = new Date(reservation.arrival_time);
    const timeStr = arrivalTime.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // 電話番号を音声で読み上げやすい形式に変換
    const phoneForSpeech = formatPhoneForSpeech(reservation.caller_phone);
    
    // 音声ガイダンス
    gather.say(
      { 
        language: 'ja-JP', 
        voice: 'Polly.Mizuki',
        loop: 1
      },
      `こちらは、ニケンメプラスの予約システムです。
       お客様から、10分後の来店予約リクエストがあります。
       
       お名前は、${reservation.caller_name || '不明'} 様、
       電話番号は、${phoneForSpeech}、
       ${reservation.party_size}名様、
       来店予定時刻は、${timeStr}頃です。
       
       予約を受け入れる場合は、1を、
       お断りする場合は、2を押してください。
       
       もう一度聞く場合は、3を押してください。`
    );
    
    // タイムアウト時のメッセージ
    twiml.say(
      { language: 'ja-JP', voice: 'Polly.Mizuki' },
      '入力がありませんでした。予約はキャンセルされます。'
    );
    
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('IVR error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say(
      { language: 'ja-JP', voice: 'Polly.Mizuki' },
      'システムエラーが発生しました。'
    );
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

// 電話番号を音声で読み上げやすい形式に変換
function formatPhoneForSpeech(phone: string): string {
  // 090-1234-5678 → "ぜろきゅうぜろ、いちにさんよん、ごろくななはち"
  const cleaned = phone.replace(/[-\s]/g, '');
  
  if (cleaned.length === 11) {
    const parts = [
      cleaned.substring(0, 3),  // 090
      cleaned.substring(3, 7),  // 1234
      cleaned.substring(7)      // 5678
    ];
    
    return parts.map(part => part.split('').join('、')).join('の、');
  } else if (cleaned.length === 10) {
    const parts = [
      cleaned.substring(0, 3),  // 097
      cleaned.substring(3, 6),  // 123
      cleaned.substring(6)      // 4567
    ];
    
    return parts.map(part => part.split('').join('、')).join('の、');
  }
  
  return cleaned.split('').join('、');
}




