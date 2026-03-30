import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ActiveAdsResponse, ActiveAdCreative, SlotType, ScheduleConfig } from '@/lib/sponsors/types';

/** Supabase PostgRESTのネストselect結果をフラット化するための中間型 */
interface NestedSlotRow {
  id: string;
  contract_id: string;
  slot_type: SlotType;
  display_priority: number;
  schedule_config: ScheduleConfig | null;
  sponsor_contracts: {
    id: string;
    sponsor_id: string;
    start_date: string;
    end_date: string;
    sponsors: {
      id: string;
      company_name: string;
      company_logo_url: string | null;
    };
  };
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // 現在のJST日付を取得
    const nowJST = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
    );
    const todayStr = nowJST.toISOString().split('T')[0];

    // 契約ステータスをon-demand更新（pg_cronの代替）
    // scheduled → active: 開始日が今日以前
    await supabase
      .from('sponsor_contracts')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('status', 'scheduled')
      .lte('start_date', todayStr);

    // active → expired: 終了日が今日より前
    await supabase
      .from('sponsor_contracts')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'active')
      .lt('end_date', todayStr);

    // active契約 → enabled枠 → activeクリエイティブをJOINで取得
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
      .eq('is_active', true)
      .eq('sponsor_ad_slots.is_enabled', true)
      .eq('sponsor_ad_slots.sponsor_contracts.status', 'active')
      .lte('sponsor_ad_slots.sponsor_contracts.start_date', todayStr)
      .gte('sponsor_ad_slots.sponsor_contracts.end_date', todayStr)
      .eq('sponsor_ad_slots.sponsor_contracts.sponsors.is_active', true);

    if (error) {
      console.error('[sponsors/active] Query error:', error);
      return NextResponse.json(emptyResponse(), { headers: cacheHeaders() });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(emptyResponse(), { headers: cacheHeaders() });
    }

    // フラット化してActiveAdCreative型にマッピング
    const creatives: (ActiveAdCreative & { display_priority: number; start_date: string })[] = [];

    for (const row of data) {
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

    return NextResponse.json(response, { headers: cacheHeaders() });
  } catch (err) {
    console.error('[sponsors/active] Unexpected error:', err);
    return NextResponse.json(emptyResponse(), { headers: cacheHeaders() });
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
