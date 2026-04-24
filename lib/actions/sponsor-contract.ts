'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { contractFormSchema, type ContractFormValues } from '@/lib/sponsors/schemas';
import type { PlanType, SponsorContract } from '@/lib/sponsors/types';

export async function getContractsBySponsor(sponsorId: string): Promise<{
  success: boolean;
  data?: SponsorContract[];
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsor_contracts')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .order('start_date', { ascending: false });

    if (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getContractsBySponsor error:', error);
    return { success: false, error: '契約一覧の取得に失敗しました' };
  }
}

export async function createContract(formValues: ContractFormValues): Promise<{
  success: boolean;
  data?: SponsorContract;
  error?: string;
}> {
  try {
    const validation = contractFormSchema.safeParse(formValues);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || '入力値が不正です' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsor_contracts')
      .insert({
        sponsor_id: formValues.sponsor_id,
        plan_type: formValues.plan_type,
        start_date: formValues.start_date,
        end_date: formValues.end_date,
        price: formValues.price,
        notes: formValues.notes || null,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('createContract error:', error);
    return { success: false, error: '契約の作成に失敗しました' };
  }
}

export async function cancelContract(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('sponsor_contracts')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('cancelContract error:', error);
    return { success: false, error: '契約のキャンセルに失敗しました' };
  }
}

interface RenewContractInput {
  plan_type: PlanType;
  start_date: string;
  end_date: string;
  userId: string;
}

export async function renewContract(
  sourceContractId: string,
  input: RenewContractInput
): Promise<{
  success: boolean;
  data?: SponsorContract;
  error?: string;
}> {
  if (!input.start_date || !input.end_date) {
    return { success: false, error: '開始日と終了日を指定してください' };
  }
  if (input.end_date < input.start_date) {
    return { success: false, error: '終了日は開始日以降にしてください' };
  }

  const supabase = createServerSupabaseClient();

  const { data: source, error: sourceError } = await supabase
    .from('sponsor_contracts')
    .select('sponsor_id, plan_type, price, currency, notes')
    .eq('id', sourceContractId)
    .single();

  if (sourceError || !source) {
    return { success: false, error: '元の契約が見つかりません' };
  }

  const today = new Date().toISOString().split('T')[0];
  const status = input.start_date <= today ? 'active' : 'scheduled';

  const { data: newContract, error: insertContractError } = await supabase
    .from('sponsor_contracts')
    .insert({
      sponsor_id: source.sponsor_id,
      plan_type: input.plan_type,
      start_date: input.start_date,
      end_date: input.end_date,
      price: source.price,
      currency: source.currency,
      notes: source.notes,
      status,
      created_by: input.userId,
    })
    .select()
    .single();

  if (insertContractError || !newContract) {
    return { success: false, error: insertContractError?.message || '契約の作成に失敗しました' };
  }

  const rollback = async () => {
    await supabase.from('sponsor_ad_slots').delete().eq('contract_id', newContract.id);
    await supabase.from('sponsor_contracts').delete().eq('id', newContract.id);
  };

  const { data: sourceSlots, error: slotsError } = await supabase
    .from('sponsor_ad_slots')
    .select('id, slot_type, display_priority, is_enabled, schedule_config')
    .eq('contract_id', sourceContractId);

  if (slotsError) {
    await rollback();
    return { success: false, error: '広告枠の取得に失敗しました' };
  }

  for (const slot of sourceSlots || []) {
    const { data: newSlot, error: newSlotError } = await supabase
      .from('sponsor_ad_slots')
      .insert({
        contract_id: newContract.id,
        slot_type: slot.slot_type,
        display_priority: slot.display_priority,
        is_enabled: slot.is_enabled,
        schedule_config: slot.schedule_config,
      })
      .select()
      .single();

    if (newSlotError || !newSlot) {
      await rollback();
      return { success: false, error: '広告枠の複製に失敗しました' };
    }

    const { data: creatives, error: creativesError } = await supabase
      .from('sponsor_ad_creatives')
      .select(
        'image_url, background_image_url, cta_text, cta_url, cta_color, icon_url, icon_position, icon_size, custom_css, display_config, translations, is_active, version'
      )
      .eq('ad_slot_id', slot.id);

    if (creativesError) {
      await rollback();
      return { success: false, error: 'クリエイティブの取得に失敗しました' };
    }

    if (!creatives || creatives.length === 0) continue;

    const creativeRows = creatives.map((c) => ({
      ad_slot_id: newSlot.id,
      image_url: c.image_url,
      background_image_url: c.background_image_url,
      cta_text: c.cta_text,
      cta_url: c.cta_url,
      cta_color: c.cta_color,
      icon_url: c.icon_url,
      icon_position: c.icon_position,
      icon_size: c.icon_size,
      custom_css: c.custom_css,
      display_config: c.display_config,
      translations: c.translations,
      is_active: c.is_active,
      version: c.version,
    }));

    const { error: insertCreativesError } = await supabase
      .from('sponsor_ad_creatives')
      .insert(creativeRows);

    if (insertCreativesError) {
      await rollback();
      return { success: false, error: 'クリエイティブの複製に失敗しました' };
    }
  }

  return { success: true, data: newContract };
}
