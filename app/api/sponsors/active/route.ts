import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ActiveAdsResponse, ActiveAdCreative, SlotType, ScheduleConfig } from '@/lib/sponsors/types';

export const dynamic = 'force-dynamic';

/** Supabase PostgRESTのネストselect結果をフラット化するための中間型 */
interface NestedSlotRow {
  id: string;
  contract_id: string;
  slot_type: SlotType;
  display_priority: number;
  is_enabled: boolean;
  schedule_config: ScheduleConfig | null;
  sponsor_contracts: {
    id: string;
    sponsor_id: string;
    start_date: string;
    end_date: string;
    status: string;
    sponsors: {
      id: string;
      company_name: string;
      company_logo_url: string | null;
      is_active: boolean;
    };
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';
  const debugInfo: Record<string, unknown> = {};

  try {
    const supabase = createServerSupabaseClient();

    if (debug) {
      debugInfo.supabaseUrlSuffix = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').slice(-20);
      debugInfo.hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
      debugInfo.hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      debugInfo.serverTimeUTC = new Date().toISOString();
    }

    // 現在のJST日付を取得
    const nowJST = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
    );
    const todayStr = nowJST.toISOString().split('T')[0];
    if (debug) debugInfo.todayStr = todayStr;

    // 契約ステータスをon-demand更新（pg_cronの代替）
    // scheduled → active: 開始日が今日以前
    const upd1 = await supabase
      .from('sponsor_contracts')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('status', 'scheduled')
      .lte('start_date', todayStr);

    // active → expired: 終了日が今日より前
    const upd2 = await supabase
      .from('sponsor_contracts')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'active')
      .lt('end_date', todayStr);

    if (debug) {
      debugInfo.update1Error = upd1.error ? { message: upd1.error.message, code: upd1.error.code } : null;
      debugInfo.update2Error = upd2.error ? { message: upd2.error.message, code: upd2.error.code } : null;
    }

    // クリエイティブを JOIN で取得（トップレベル条件のみ指定し、ネスト条件は JS 側でフィルタ）
    // 理由: PostgREST の3段ネスト embedded filter は環境によって挙動が不安定なため、
    //       クライアント側でフィルタしたほうが確実。データ件数は数十件程度なので性能問題なし。
    const { data, error } = await supabase
      .from('sponsor_ad_creatives')
      .select(`
        id,
        ad_slot_id,
        image_url,
        background_image_url,
        cta_text,
        cta_url,
        cta_color,
        icon_url,
        icon_position,
        icon_size,
        display_config,
        translations,
        is_active,
        sponsor_ad_slots!inner (
          id,
          contract_id,
          slot_type,
          display_priority,
          is_enabled,
          schedule_config,
          sponsor_contracts!inner (
            id,
            sponsor_id,
            start_date,
            end_date,
            status,
            sponsors!inner (
              id,
              company_name,
              company_logo_url,
              is_active
            )
          )
        )
      `)
      .eq('is_active', true);

    if (debug) {
      debugInfo.queryError = error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null;
      debugInfo.rawRowCount = Array.isArray(data) ? data.length : null;
    }

    if (error) {
      console.error('[sponsors/active] Query error:', error);
      const payload = debug ? { ...emptyResponse(), _debug: debugInfo } : emptyResponse();
      return NextResponse.json(payload, { headers: cacheHeaders() });
    }

    if (!data || data.length === 0) {
      const payload = debug ? { ...emptyResponse(), _debug: debugInfo } : emptyResponse();
      return NextResponse.json(payload, { headers: cacheHeaders() });
    }

    // JS 側で「枠 is_enabled / 契約 active / 期間内 / スポンサー is_active」で絞り込み
    const filtered = data.filter((row) => {
      const slot = row.sponsor_ad_slots as unknown as NestedSlotRow | null;
      if (!slot) return false;
      if (!slot.is_enabled) return false;
      const contract = slot.sponsor_contracts;
      if (!contract) return false;
      if (contract.status !== 'active') return false;
      if (contract.start_date > todayStr) return false;
      if (contract.end_date < todayStr) return false;
      const sponsor = contract.sponsors;
      if (!sponsor) return false;
      if (!sponsor.is_active) return false;
      return true;
    });

    if (debug) {
      debugInfo.filteredRowCount = filtered.length;
      debugInfo.rawSample = data.slice(0, 3).map((row) => {
        const slot = row.sponsor_ad_slots as unknown as NestedSlotRow | null;
        const contract = slot?.sponsor_contracts;
        const sponsor = contract?.sponsors;
        return {
          creative_id: row.id,
          slot_type: slot?.slot_type,
          is_enabled: slot?.is_enabled,
          contract_status: contract?.status,
          start_date: contract?.start_date,
          end_date: contract?.end_date,
          sponsor_active: sponsor?.is_active,
        };
      });
    }

    if (filtered.length === 0) {
      const payload = debug ? { ...emptyResponse(), _debug: debugInfo } : emptyResponse();
      return NextResponse.json(payload, { headers: cacheHeaders() });
    }

    // フラット化してActiveAdCreative型にマッピング
    const creatives: (ActiveAdCreative & { display_priority: number; start_date: string })[] = [];

    for (const row of filtered) {
      const slot = row.sponsor_ad_slots as unknown as NestedSlotRow;

      const contract = slot.sponsor_contracts;
      const sponsor = contract.sponsors;

      creatives.push({
        creative_id: row.id,
        ad_slot_id: slot.id,
        contract_id: contract.id,
        sponsor_id: sponsor.id,
        slot_type: slot.slot_type,
        image_url: row.image_url,
        background_image_url: row.background_image_url,
        cta_text: row.cta_text,
        cta_url: row.cta_url,
        cta_color: row.cta_color || '#C9A86C',
        icon_url: row.icon_url,
        icon_position: (row.icon_position as unknown as { top: string; left: string }) || { top: '16px', left: '16px' },
        icon_size: row.icon_size || 48,
        display_config: (row.display_config as unknown as ActiveAdCreative['display_config']) || {
          show_close_button: true,
          auto_close_seconds: null,
          animation: 'slideUp',
          frequency_cap_per_session: 1,
        },
        translations: (row.translations as unknown as ActiveAdCreative['translations']) || {},
        schedule_config: (slot.schedule_config as unknown as ActiveAdCreative['schedule_config']) || null,
        company_name: sponsor.company_name,
        company_logo_url: sponsor.company_logo_url,
        display_priority: slot.display_priority,
        start_date: contract.start_date,
      });
    }

    // priority DESC, start_date DESC でソート
    creatives.sort((a, b) => {
      if (b.display_priority !== a.display_priority) {
        return b.display_priority - a.display_priority;
      }
      return b.start_date.localeCompare(a.start_date);
    });

    // slot_type別にグルーピング
    const response: ActiveAdsResponse = {
      modal: creatives.find((c) => c.slot_type === 'modal') || null,
      cta_button: creatives.find((c) => c.slot_type === 'cta_button') || null,
      map_icons: creatives.filter((c) => c.slot_type === 'map_icon').slice(0, 3),
      campaign_banner: creatives.find((c) => c.slot_type === 'campaign_banner') || null,
    };

    const payload = debug ? { ...response, _debug: debugInfo } : response;
    return NextResponse.json(payload, { headers: cacheHeaders() });
  } catch (err) {
    console.error('[sponsors/active] Unexpected error:', err);
    const message = err instanceof Error ? err.message : String(err);
    const payload = debug ? { ...emptyResponse(), _debug: { ...debugInfo, caughtError: message } } : emptyResponse();
    return NextResponse.json(payload, { headers: cacheHeaders() });
  }
}

function emptyResponse(): ActiveAdsResponse {
  return { modal: null, cta_button: null, map_icons: [], campaign_banner: null };
}

function cacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
}
