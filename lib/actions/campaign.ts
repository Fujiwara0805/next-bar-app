'use server';

// ============================================
// キャンペーンマスタのサーバーアクション
// lib/actions/campaign.ts
// ============================================

import {
  Campaign,
  CampaignOption,
  CampaignMasterFormValues,
  campaignMasterFormToDbData,
  campaignMasterFormSchema,
} from '@/lib/types/campaign';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * アクティブなキャンペーン一覧を取得
 * 店舗側のドロップダウン選択用
 * 
 * 取得条件:
 * - is_active = true
 * - 終了日が今日以降（まだ終わっていない）
 * - 開始日は問わない（これから始まるキャンペーンも選択可能）
 */
export async function getActiveCampaigns(): Promise<{
  success: boolean;
  data?: CampaignOption[];
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString().split('T')[0];

    // is_active = true かつ 終了日が今日以降のキャンペーンを取得
    // 開始日の条件は外す（これから始まるキャンペーンも選択可能にする）
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, start_date, end_date, image_url, is_active')
      .eq('is_active', true)
      .gte('end_date', now)
      .order('start_date', { ascending: true });

    if (error) {
      // テーブルが存在しない場合のフォールバック
      if (error.code === '42P01') {
        console.warn('campaigns table does not exist yet.');
        return { success: true, data: [] };
      }
      console.error('Get active campaigns error:', error);
      return { success: false, error: error.message };
    }

    console.log('Fetched campaigns:', data); // デバッグログ

    const options: CampaignOption[] = (data || []).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      imageUrl: campaign.image_url,
      isActive: campaign.is_active,
    }));

    return { success: true, data: options };
  } catch (error) {
    console.error('Get active campaigns error:', error);
    return { success: false, error: 'Failed to get campaigns' };
  }
}

/**
 * すべてのキャンペーンを取得（管理画面用）
 */
export async function getAllCampaigns(): Promise<{
  success: boolean;
  data?: Campaign[];
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return { success: true, data: [] };
      }
      console.error('Get all campaigns error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get all campaigns error:', error);
    return { success: false, error: 'Failed to get campaigns' };
  }
}

/**
 * キャンペーンを作成
 */
export async function createCampaign(
  formValues: CampaignMasterFormValues
): Promise<{
  success: boolean;
  data?: Campaign;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // バリデーション
    const validationResult = campaignMasterFormSchema.safeParse(formValues);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || '入力値が不正です',
      };
    }

    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser();

    const dbData = campaignMasterFormToDbData(formValues);

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        ...dbData,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create campaign error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Create campaign error:', error);
    return { success: false, error: 'Failed to create campaign' };
  }
}

/**
 * キャンペーンを更新
 */
export async function updateCampaign(
  id: string,
  formValues: CampaignMasterFormValues
): Promise<{
  success: boolean;
  data?: Campaign;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // バリデーション
    const validationResult = campaignMasterFormSchema.safeParse(formValues);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || '入力値が不正です',
      };
    }

    const dbData = campaignMasterFormToDbData(formValues);

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        ...dbData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update campaign error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Update campaign error:', error);
    return { success: false, error: 'Failed to update campaign' };
  }
}

/**
 * キャンペーンを削除（物理削除）
 */
export async function deleteCampaign(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // 物理削除（campaignsテーブルから削除）
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete campaign error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete campaign error:', error);
    return { success: false, error: 'Failed to delete campaign' };
  }
}

/**
 * キャンペーンIDからキャンペーン情報を取得
 */
export async function getCampaignById(id: string): Promise<{
  success: boolean;
  data?: Campaign;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'キャンペーンが見つかりません' };
      }
      console.error('Get campaign by id error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Get campaign by id error:', error);
    return { success: false, error: 'Failed to get campaign' };
  }
}
