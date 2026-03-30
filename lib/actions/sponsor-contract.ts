'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { contractFormSchema, type ContractFormValues } from '@/lib/sponsors/schemas';
import type { SponsorContract } from '@/lib/sponsors/types';

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
