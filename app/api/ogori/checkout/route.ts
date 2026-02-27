/**
 * ============================================
 * おごり酒 Stripe Checkout セッション作成 API
 * ============================================
 * おごり酒の購入時にStripe Checkoutセッションを作成する
 * 金額は1,000円固定（OGORI_FIXED_AMOUNT）
 *
 * JPY は zero-decimal currency のため unit_amount = 1000
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';

/** 固定金額（円） */
const FIXED_AMOUNT = 1000;

export async function POST(request: NextRequest) {
  try {
    const { storeId, drinkId, drinkName, purchaserId } = await request.json();

    // 入力検証（amount は受け取らない - 固定金額を使用）
    if (!storeId || !drinkId || !drinkName) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_BASE_URL が設定されていません');
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // Stripe Checkout セッションを作成（固定金額 1,000円）
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `おごり酒: ${drinkName}`,
              description: `おごり酒チケット（${drinkName}）`,
            },
            unit_amount: FIXED_AMOUNT,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/store/${storeId}?ogori=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/store/${storeId}?ogori=cancel`,
      metadata: {
        storeId,
        drinkId,
        drinkName,
        purchaserId: purchaserId || '',
        amount: String(FIXED_AMOUNT),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('おごり酒チェックアウトエラー:', error);
    return NextResponse.json(
      { error: 'チェックアウトセッションの作成に失敗しました' },
      { status: 500 }
    );
  }
}
