'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sponsorFormSchema, type SponsorFormValues } from '@/lib/sponsors/schemas';
import type { Sponsor } from '@/lib/sponsors/types';

export async function getAllSponsors(): Promise<{
  success: boolean;
  data?: Sponsor[];
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getAllSponsors error:', error);
    return { success: false, error: 'スポンサー一覧の取得に失敗しました' };
  }
}

export async function getSponsorById(id: string): Promise<{
  success: boolean;
  data?: Sponsor;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { success: false, error: 'スポンサーが見つかりません' };
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error('getSponsorById error:', error);
    return { success: false, error: 'スポンサーの取得に失敗しました' };
  }
}

export async function createSponsor(formValues: SponsorFormValues): Promise<{
  success: boolean;
  data?: Sponsor;
  error?: string;
}> {
  try {
    const validation = sponsorFormSchema.safeParse(formValues);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || '入力値が不正です' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsors')
      .insert({
        company_name: formValues.company_name,
        contact_name: formValues.contact_name || null,
        contact_email: formValues.contact_email || null,
        contact_phone: formValues.contact_phone || null,
        website_url: formValues.website_url || null,
        company_logo_url: formValues.company_logo_url || null,
        notes: formValues.notes || null,
        is_active: formValues.is_active,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('createSponsor error:', error);
    return { success: false, error: 'スポンサーの作成に失敗しました' };
  }
}

export async function updateSponsor(id: string, formValues: SponsorFormValues): Promise<{
  success: boolean;
  data?: Sponsor;
  error?: string;
}> {
  try {
    const validation = sponsorFormSchema.safeParse(formValues);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || '入力値が不正です' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sponsors')
      .update({
        company_name: formValues.company_name,
        contact_name: formValues.contact_name || null,
        contact_email: formValues.contact_email || null,
        contact_phone: formValues.contact_phone || null,
        website_url: formValues.website_url || null,
        company_logo_url: formValues.company_logo_url || null,
        notes: formValues.notes || null,
        is_active: formValues.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('updateSponsor error:', error);
    return { success: false, error: 'スポンサーの更新に失敗しました' };
  }
}

export async function deleteSponsor(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteSponsor error:', error);
    return { success: false, error: 'スポンサーの削除に失敗しました' };
  }
}
