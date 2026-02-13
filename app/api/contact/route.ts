/**
 * ============================================
 * APIエンドポイント: /api/contact
 * お問い合わせフォームの送信を受け付け、
 * Google Spreadsheet に記録するサーバーサイドAPI
 *
 * Google Apps Script Web App を利用して
 * スプレッドシートに追記する仕組みです。
 *
 * 環境変数:
 *   GOOGLE_SHEETS_WEBHOOK_URL - Google Apps Script の Web App URL
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, category, message, language } = body;

    // バリデーション
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'メールアドレスの形式が正しくありません' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const contactData = {
      timestamp,
      name,
      email,
      category: category || 'general',
      message,
      language: language || 'ja',
    };

    // Google Sheets Webhook が設定されている場合はスプレッドシートに送信
    if (GOOGLE_SHEETS_WEBHOOK_URL) {
      try {
        const sheetsResponse = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData),
        });

        if (!sheetsResponse.ok) {
          console.error('Google Sheets webhook error:', sheetsResponse.status);
        }
      } catch (sheetsError) {
        // スプレッドシートへの送信が失敗してもユーザーにはエラーを返さない
        console.error('Google Sheets webhook failed:', sheetsError);
      }
    } else {
      // Webhook未設定時はコンソールにログ出力
      console.log('=== お問い合わせ受信 ===');
      console.log(JSON.stringify(contactData, null, 2));
      console.log('※ GOOGLE_SHEETS_WEBHOOK_URL を設定するとスプレッドシートに記録されます');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'お問い合わせの送信に失敗しました' },
      { status: 500 }
    );
  }
}
