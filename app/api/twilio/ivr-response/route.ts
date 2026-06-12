import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { verifyTwilioRequest } from '@/lib/twilio/verify';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const VoiceResponse = twilio.twiml.VoiceResponse;

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
    // Twilio 署名検証（第三者による予約承認/拒否の偽造を防止）。
    // formData は verify 内で消費し、結果の params を再利用する。
    const verified = await verifyTwilioRequest(request);
    if (!verified.ok) {
      console.warn('[twilio/ivr-response] signature rejected:', verified.reason);
      return new NextResponse('Forbidden', { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const reservationId = searchParams.get('reservationId');

    const digits = verified.params['Digits']; // 押されたボタン: "1", "2", "3"

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

        // 音声応答
        twiml.say(
          { language: 'ja-JP', voice: 'Polly.Mizuki' },
          `予約を承認しました。
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

        // 音声応答
        twiml.say(
          { language: 'ja-JP', voice: 'Polly.Mizuki' },
          '予約をお断りしました。'
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
