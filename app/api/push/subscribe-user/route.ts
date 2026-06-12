import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// user_push_subscriptions は service_role で操作する（anon素通しRLSを撤廃したため）。
const supabase = createServerSupabaseClient();

export async function POST(request: NextRequest) {
  try {
    const { endpoint, p256dh, auth, latitude, longitude } = await request.json();

    if (!endpoint || !p256dh || !auth || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_push_subscriptions')
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.error('User push subscribe error:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User push subscribe error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
