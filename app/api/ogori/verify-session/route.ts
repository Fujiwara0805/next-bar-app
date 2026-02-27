/**
 * ============================================
 * おごり酒 Stripe セッション検証 API
 * ============================================
 * Stripe Checkout 完了後のフォールバック処理。
 * Webhook が未到達の場合でも、セッションIDから
 * 決済状況を確認し、チケットを作成する。
 *
 * ※ 重複防止: stripe_payment_id で既存チケットをチェック
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 既にこのセッションでチケットが作成済みかチェック（重複防止）
    const { data: existing } = await supabase
      .from('ogori_tickets')
      .select('id')
      .eq('stripe_payment_id', sessionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ status: 'already_created', ticketId: existing.id });
    }

    // Stripe からセッション情報を取得
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 決済完了を確認
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: '決済が完了していません', paymentStatus: session.payment_status },
        { status: 400 }
      );
    }

    const metadata = session.metadata;
    if (!metadata?.storeId || !metadata?.drinkId) {
      return NextResponse.json(
        { error: 'セッションメタデータが不足しています' },
        { status: 400 }
      );
    }

    // チケットを作成
    const { data: ticket, error: insertError } = await supabase
      .from('ogori_tickets')
      .insert({
        store_id: metadata.storeId,
        drink_id: metadata.drinkId,
        drink_name: metadata.drinkName || '',
        purchaser_id: metadata.purchaserId || null,
        amount: parseInt(metadata.amount || '1000', 10),
        status: 'available',
        stripe_payment_id: session.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('セッション検証: チケット作成エラー:', insertError);
      return NextResponse.json(
        { error: 'チケットの作成に失敗しました', detail: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'created', ticketId: ticket.id });
  } catch (error) {
    console.error('セッション検証エラー:', error);
    return NextResponse.json(
      { error: 'セッション検証に失敗しました' },
      { status: 500 }
    );
  }
}
