/**
 * ============================================
 * おごり酒 Stripe Webhook ハンドラー
 * ============================================
 * Stripe からの Webhook イベントを処理し、
 * 決済完了時におごり酒チケットを作成する
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Node.js ランタイムを使用（raw body の読み取りに必要）
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを raw テキストとして読み取る
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Stripe署名が見つかりません' },
        { status: 400 }
      );
    }

    // Webhook シグネチャを検証
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook シグネチャ検証エラー:', err);
      return NextResponse.json(
        { error: 'Webhook シグネチャの検証に失敗しました' },
        { status: 400 }
      );
    }

    // checkout.session.completed イベントを処理
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      if (!metadata) {
        console.error('メタデータが見つかりません:', session.id);
        return NextResponse.json(
          { error: 'メタデータが不足しています' },
          { status: 400 }
        );
      }

      const { storeId, drinkId, drinkName, purchaserId, amount } = metadata;

      const supabase = createServerSupabaseClient();

      // 重複チェック（verify-session で既に作成済みの場合）
      const { data: existing } = await supabase
        .from('ogori_tickets')
        .select('id')
        .eq('stripe_payment_id', session.id)
        .maybeSingle();

      if (existing) {
        console.log('チケット既に作成済み（verify-session経由）:', existing.id);
        return NextResponse.json({ received: true });
      }

      // おごり酒チケットを作成
      const { data: ticket, error: insertError } = await supabase
        .from('ogori_tickets')
        .insert({
          store_id: storeId,
          drink_id: drinkId,
          drink_name: drinkName,
          purchaser_id: purchaserId || null,
          amount: parseInt(amount, 10),
          status: 'available',
          stripe_payment_id: session.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('おごり酒チケット作成エラー:', insertError);
        return NextResponse.json(
          { error: 'チケットの作成に失敗しました' },
          { status: 500 }
        );
      }

      console.log('おごり酒チケット作成完了:', ticket.id);
    }

    // Stripe に成功レスポンスを返す
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook 処理エラー:', error);
    return NextResponse.json(
      { error: 'Webhook 処理に失敗しました' },
      { status: 500 }
    );
  }
}
