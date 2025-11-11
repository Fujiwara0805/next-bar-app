import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

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
    const searchParams = request.nextUrl.searchParams;
    const reservationId = searchParams.get('reservationId');
    
    const formData = await request.formData();
    const digits = formData.get('Digits') as string; // 押されたボタン: "1", "2", "3"
    
    const twiml = new VoiceResponse();
    
    if (!reservationId) {
      twiml.say(
        { language: 'ja-JP', voice: 'Polly.Mizuki' },
        'エラーが発生しました。'
      );
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // 予約情報を取得
    const { data: reservation, error } = await supabase
      .from('quick_reservations')
      .select('*, stores(name)')
      .eq('id', reservationId)
      .single();
    
    if (error || !reservation) {
      console.error('Reservation not found:', error);
      twiml.say(
        { language: 'ja-JP', voice: 'Polly.Mizuki' },
        '予約情報が見つかりませんでした。'
      );
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    switch (digits) {
      case '1': // 承認
        // データベースを更新
        const { error: confirmError } = await supabase
          .from('quick_reservations')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', reservationId);
        
        if (confirmError) {
          console.error('Failed to confirm reservation:', confirmError);
        }
        
        // お客様にSMSを送信
        await sendConfirmationSMS(
          reservation.caller_phone,
          reservation.stores.name,
          reservation.arrival_time
        );
        
        // 音声応答
        twiml.say(
          { language: 'ja-JP', voice: 'Polly.Mizuki' },
          `予約を承認しました。
           お客様に確認のショートメッセージをお送りします。
           ${reservation.caller_name || 'お客'}様のご来店をお待ちしております。`
        );
        break;
      
      case '2': // 拒否
        // データベースを更新
        const { error: rejectError } = await supabase
          .from('quick_reservations')
          .update({
            status: 'rejected',
            rejection_reason: '満席のため',
          })
          .eq('id', reservationId);
        
        if (rejectError) {
          console.error('Failed to reject reservation:', rejectError);
        }
        
        // お客様にSMSを送信
        await sendRejectionSMS(
          reservation.caller_phone,
          reservation.stores.name
        );
        
        // 音声応答
        twiml.say(
          { language: 'ja-JP', voice: 'Polly.Mizuki' },
          '予約をお断りしました。お客様にショートメッセージをお送りします。'
        );
        break;
      
      case '3': // もう一度聞く
        // 最初のIVRメニューに戻る
        twiml.redirect(`/api/twilio/ivr?reservationId=${reservationId}`);
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' },
        });
      
      default:
        // 無効な入力
        twiml.say(
          { language: 'ja-JP', voice: 'Polly.Mizuki' },
          '無効な入力です。もう一度お試しください。'
        );
        twiml.redirect(`/api/twilio/ivr?reservationId=${reservationId}`);
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' },
        });
    }
    
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('IVR response error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say(
      { language: 'ja-JP', voice: 'Polly.Mizuki' },
      'エラーが発生しました。'
    );
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

// 承認SMSを送信
async function sendConfirmationSMS(
  to: string,
  storeName: string,
  arrivalTime: string
) {
  const timeStr = new Date(arrivalTime).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const internationalPhone = convertToInternational(to);
  
  try {
    const messageOptions: any = {
      body: `【${storeName}】\n✅ ご予約ありがとうございます！\n\n到着予定: ${timeStr}頃\n\nご来店をお待ちしております🍺`,
      to: internationalPhone,
    };

    // Messaging Service IDがあればそれを使用、なければ電話番号を使用
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    } else {
      messageOptions.from = process.env.TWILIO_PHONE_NUMBER;
    }

    await twilioClient.messages.create(messageOptions);
    console.log('Confirmation SMS sent to:', to);
  } catch (error) {
    console.error('Failed to send confirmation SMS:', error);
  }
}

// 拒否SMSを送信
async function sendRejectionSMS(to: string, storeName: string) {
  const internationalPhone = convertToInternational(to);
  
  try {
    const messageOptions: any = {
      body: `【${storeName}】\n申し訳ございません。現在満席のため、ご予約をお受けできません。\n\nまたのご利用をお待ちしております。`,
      to: internationalPhone,
    };

    // Messaging Service IDがあればそれを使用、なければ電話番号を使用
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    } else {
      messageOptions.from = process.env.TWILIO_PHONE_NUMBER;
    }

    await twilioClient.messages.create(messageOptions);
    console.log('Rejection SMS sent to:', to);
  } catch (error) {
    console.error('Failed to send rejection SMS:', error);
  }
}

// 電話番号を国際形式に変換
function convertToInternational(phone: string): string {
  // 090-1234-5678 → +819012345678
  const cleaned = phone.replace(/[-\s]/g, '');
  if (cleaned.startsWith('0')) {
    return `+81${cleaned.substring(1)}`;
  }
  return phone;
}




