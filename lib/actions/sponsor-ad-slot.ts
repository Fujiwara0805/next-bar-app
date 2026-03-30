'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { adSlotFormSchema, type AdSlotFormValues } from '@/lib/sponsors/schemas';
import type { SponsorAdSlot } from '@/lib/sponsors/types';

export async function getAdSlotsByContract(contractId: string): Promise<{
  success: boolean;
  data?: SponsorAdSlot[];
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsor_ad_slots')
      .select('*')
      .eq('contract_id', contractId)
      .order('display_priority', { ascending: true });

    if (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getAdSlotsByContract error:', error);
    return { success: false, error: '広告枠一覧の取得に失敗しました' };
  }
}

export async function createAdSlot(formValues: AdSlotFormValues): Promise<{
  success: boolean;
  data?: SponsorAdSlot;
  error?: string;
}> {
  try {
    const validation = adSlotFormSchema.safeParse(formValues);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || '入力値が不正です' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsor_ad_slots')
      .insert({
        contract_id: formValues.contract_id,
        slot_type: formValues.slot_type,
        display_priority: formValues.display_priority,
        schedule_config: formValues.schedule_config,
        is_enabled: formValues.is_enabled,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('createAdSlot error:', error);
    return { success: false, error: '広告枠の作成に失敗しました' };
  }
}

export async function updateAdSlot(id: string, formValues: AdSlotFormValues): Promise<{
  success: boolean;
  data?: SponsorAdSlot;
  error?: string;
}> {
  try {
    const validation = adSlotFormSchema.safeParse(formValues);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || '入力値が不正です' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsor_ad_slots')
      .update({
        slot_type: formValues.slot_type,
        display_priority: formValues.display_priority,
        schedule_config: formValues.schedule_config,
        is_enabled: formValues.is_enabled,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('updateAdSlot error:', error);
    return { success: false, error: '広告枠の更新に失敗しました' };
  }
}

export async function deleteAdSlot(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('sponsor_ad_slots').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteAdSlot error:', error);
    return { success: false, error: '広告枠の削除に失敗しました' };
  }
}
