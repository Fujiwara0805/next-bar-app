/**
 * ============================================
 * APIエンドポイント: /api/store-applications
 * POST: 公開フォームからの申し込み受付（認証不要）
 *       Supabase + Google Spreadsheet に記録
 * GET: 申し込み一覧取得（platform ownerのみ）
 *
 * 環境変数:
 *   GOOGLE_SHEETS_APPLICATION_WEBHOOK_URL - 加盟店申請用 Google Apps Script Web App URL
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const GOOGLE_SHEETS_APPLICATION_WEBHOOK_URL =
  process.env.GOOGLE_SHEETS_APPLICATION_WEBHOOK_URL;

async function sendToGoogleSheets(applicationData: Record<string, unknown>) {
  if (!GOOGLE_SHEETS_APPLICATION_WEBHOOK_URL) {
    console.log('※ GOOGLE_SHEETS_APPLICATION_WEBHOOK_URL を設定するとスプレッドシートに記録されます');
    return;
  }

  try {
    const res = await fetch(GOOGLE_SHEETS_APPLICATION_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicationData),
    });

    if (!res.ok) {
      console.error('Google Sheets webhook error:', res.status);
    }
  } catch (err) {
    console.error('Google Sheets webhook failed:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      store_name,
      description,
      address,
      phone,
      business_hours,
      regular_holiday,
      budget_min,
      budget_max,
      payment_methods,
      facilities,
      contact_email,
      image_urls,
      remarks,
    } = body;

    // バリデーション
    if (!store_name?.trim()) {
      return NextResponse.json({ error: '店舗名を入力してください' }, { status: 400 });
    }
    if (!address?.trim()) {
      return NextResponse.json({ error: '住所を入力してください' }, { status: 400 });
    }
    if (!contact_email?.trim()) {
      return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
    }
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('store_applications')
      .insert({
        store_name: store_name.trim(),
        description: description?.trim() || null,
        address: address.trim(),
        phone: phone?.trim() || null,
        business_hours: business_hours?.trim() || null,
        regular_holiday: regular_holiday?.trim() || null,
        budget_min: budget_min || null,
        budget_max: budget_max || null,
        payment_methods: payment_methods || [],
        facilities: facilities || [],
        contact_email: contact_email.trim(),
        image_urls: image_urls || [],
        terms_agreed: true,
        remarks: remarks?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Store application insert error:', error);
      return NextResponse.json({ error: '申し込みの送信に失敗しました' }, { status: 500 });
    }

    // Google Spreadsheet にも送信（非同期・失敗してもユーザーにはエラーを返さない）
    sendToGoogleSheets({
      timestamp: new Date().toISOString(),
      id: data.id,
      store_name: store_name.trim(),
      description: description?.trim() || '',
      address: address.trim(),
      phone: phone?.trim() || '',
      business_hours: business_hours?.trim() || '',
      regular_holiday: regular_holiday?.trim() || '',
      budget_min: budget_min || 0,
      budget_max: budget_max || 0,
      payment_methods: (payment_methods || []).join(', '),
      facilities: (facilities || []).join(', '),
      contact_email: contact_email.trim(),
      image_urls: (image_urls || []).join(', '),
      remarks: remarks?.trim() || '',
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Store application API error:', error);
    return NextResponse.json({ error: '申し込みの送信に失敗しました' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('store_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Store applications fetch error:', error);
      return NextResponse.json({ error: '申し込み一覧の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Store applications GET error:', error);
    return NextResponse.json({ error: '申し込み一覧の取得に失敗しました' }, { status: 500 });
  }
}
