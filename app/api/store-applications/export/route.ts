/**
 * ============================================
 * APIエンドポイント: /api/store-applications/export
 * GET: CSV形式でエクスポート（platform ownerのみ）
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('store_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Store applications export error:', error);
      return NextResponse.json({ error: 'エクスポートに失敗しました' }, { status: 500 });
    }

    // CSV ヘッダー
    const headers = [
      'ID',
      'ステータス',
      '店舗名',
      '説明',
      '住所',
      '電話番号',
      '営業時間',
      '定休日',
      '最低予算',
      '最高予算',
      '支払い方法',
      '設備・サービス',
      'メールアドレス',
      '画像URL',
      '利用規約同意',
      '備考',
      '管理メモ',
      '申し込み日',
      '更新日',
    ];

    const statusLabels: Record<string, string> = {
      pending: '未確認',
      reviewing: '確認中',
      approved: '承認済',
      rejected: '不承認',
    };

    // CSV 行を生成
    const rows = (data || []).map((row) => [
      row.id,
      statusLabels[row.status] || row.status,
      row.store_name,
      row.description || '',
      row.address,
      row.phone || '',
      row.business_hours || '',
      row.regular_holiday || '',
      row.budget_min || '',
      row.budget_max || '',
      (row.payment_methods || []).join('、'),
      (row.facilities || []).join('、'),
      row.contact_email,
      (row.image_urls || []).join('\n'),
      row.terms_agreed ? 'はい' : 'いいえ',
      row.remarks || '',
      row.admin_notes || '',
      row.created_at ? new Date(row.created_at).toLocaleString('ja-JP') : '',
      row.updated_at ? new Date(row.updated_at).toLocaleString('ja-JP') : '',
    ]);

    // CSV エスケープ
    const escapeCsv = (val: string | number) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n');

    // BOM付きUTF-8でExcel対応
    const BOM = '\uFEFF';
    const date = new Date().toISOString().split('T')[0];

    return new NextResponse(BOM + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="store_applications_${date}.csv"`,
      },
    });
  } catch (error) {
    console.error('Store applications export error:', error);
    return NextResponse.json({ error: 'エクスポートに失敗しました' }, { status: 500 });
  }
}
