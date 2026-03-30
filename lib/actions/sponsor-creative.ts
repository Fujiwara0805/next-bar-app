'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { creativeFormSchema, type CreativeFormValues } from '@/lib/sponsors/schemas';
import type { SponsorAdCreative } from '@/lib/sponsors/types';

export async function getCreativesBySlot(adSlotId: string): Promise<{
  success: boolean;
  data?: SponsorAdCreative[];
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsor_ad_creatives')
      .select('*')
      .eq('ad_slot_id', adSlotId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getCreativesBySlot error:', error);
    return { success: false, error: 'クリエイティブ一覧の取得に失敗しました' };
  }
}

export async function createCreative(formValues: CreativeFormValues): Promise<{
  success: boolean;
  data?: SponsorAdCreative;
  error?: string;
}> {
  try {
    const validation = creativeFormSchema.safeParse(formValues);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || '入力値が不正です' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsor_ad_creatives')
      .insert({
        ad_slot_id: formValues.ad_slot_id,
        title: formValues.title || null,
        description: formValues.description || null,
        image_url: formValues.image_url || null,
        background_image_url: formValues.background_image_url || null,
        cta_text: formValues.cta_text || null,
        cta_url: formValues.cta_url || null,
        cta_color: formValues.cta_color,
        icon_url: formValues.icon_url || null,
        icon_position: formValues.icon_position,
        icon_size: formValues.icon_size,
        display_config: formValues.display_config,
        translations: formValues.translations,
        is_active: formValues.is_active,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('createCreative error:', error);
    return { success: false, error: 'クリエイティブの作成に失敗しました' };
  }
}

export async function updateCreative(id: string, formValues: CreativeFormValues): Promise<{
  success: boolean;
  data?: SponsorAdCreative;
  error?: string;
}> {
  try {
    const validation = creativeFormSchema.safeParse(formValues);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || '入力値が不正です' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsor_ad_creatives')
      .update({
        title: formValues.title || null,
        description: formValues.description || null,
        image_url: formValues.image_url || null,
        background_image_url: formValues.background_image_url || null,
        cta_text: formValues.cta_text || null,
        cta_url: formValues.cta_url || null,
        cta_color: formValues.cta_color,
        icon_url: formValues.icon_url || null,
        icon_position: formValues.icon_position,
        icon_size: formValues.icon_size,
        display_config: formValues.display_config,
        translations: formValues.translations,
        is_active: formValues.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('updateCreative error:', error);
    return { success: false, error: 'クリエイティブの更新に失敗しました' };
  }
}

export async function deleteCreative(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('sponsor_ad_creatives').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteCreative error:', error);
    return { success: false, error: 'クリエイティブの削除に失敗しました' };
  }
}
