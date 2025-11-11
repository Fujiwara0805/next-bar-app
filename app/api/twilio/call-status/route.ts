import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    
    console.log('Call status callback:', { callSid, callStatus });
    
    // 通話SIDで予約を検索
    const { data: reservation, error: fetchError } = await supabase
      .from('quick_reservations')
      .select('*')
      .eq('call_sid', callSid)
      .single();
    
    if (fetchError || !reservation) {
      console.error('Reservation not found for call:', callSid);
      return NextResponse.json({ received: true });
    }
    
    // 通話が完了せず、予約がまだpendingの場合はキャンセル扱い
    if (
      (callStatus === 'no-answer' || 
       callStatus === 'busy' || 
       callStatus === 'failed' ||
       callStatus === 'canceled') &&
      reservation.status === 'pending'
    ) {
      await supabase
        .from('quick_reservations')
        .update({
          status: 'cancelled',
          rejection_reason: `通話失敗: ${callStatus}`,
        })
        .eq('id', reservation.id);
      
      console.log(`Reservation ${reservation.id} cancelled due to call status: ${callStatus}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Call status callback error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}




