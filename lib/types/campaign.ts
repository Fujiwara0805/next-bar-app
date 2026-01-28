// ============================================
// キャンペーンマスタの型定義
// lib/types/campaign.ts
// ============================================

import { z } from 'zod';

/**
 * キャンペーンマスタのデータベース型
 */
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * キャンペーン作成/更新用のフォーム値型
 */
export interface CampaignMasterFormValues {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  imageUrl: string;
}

/**
 * キャンペーン選択用のオプション型
 * ドロップダウンで使用
 */
export interface CampaignOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  isActive: boolean;
}

/**
 * キャンペーンフォームのZodスキーマ
 */
export const campaignMasterFormSchema = z.object({
  name: z
    .string()
    .min(1, 'キャンペーン名は必須です')
    .max(100, 'キャンペーン名は100文字以内で入力してください'),
  description: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, '開始日は必須です'),
  endDate: z.string().min(1, '終了日は必須です'),
  isActive: z.boolean().default(true),
  imageUrl: z.string().optional().or(z.literal('')),
}).refine((data) => {
  // 終了日は開始日より後である必要がある
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: '終了日は開始日以降の日付を設定してください',
  path: ['endDate'],
});

export type CampaignMasterFormSchema = z.infer<typeof campaignMasterFormSchema>;

/**
 * デフォルトのフォーム値を取得
 */
export function getDefaultCampaignMasterFormValues(): CampaignMasterFormValues {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  return {
    name: '',
    description: '',
    startDate: todayStr,
    endDate: '',
    isActive: true,
    imageUrl: '',
  };
}

/**
 * データベースデータをフォーム値に変換
 */
export function dbDataToCampaignMasterForm(dbData: Campaign | null): CampaignMasterFormValues {
  if (!dbData) {
    return getDefaultCampaignMasterFormValues();
  }
  
  return {
    name: dbData.name,
    description: dbData.description || '',
    startDate: dbData.start_date ? dbData.start_date.split('T')[0] : '',
    endDate: dbData.end_date ? dbData.end_date.split('T')[0] : '',
    isActive: dbData.is_active,
    imageUrl: dbData.image_url || '',
  };
}

/**
 * フォーム値をデータベース形式に変換
 */
export function campaignMasterFormToDbData(formValues: CampaignMasterFormValues): Partial<Campaign> {
  return {
    name: formValues.name,
    description: formValues.description || null,
    start_date: formValues.startDate,
    end_date: formValues.endDate,
    is_active: formValues.isActive,
    image_url: formValues.imageUrl || null,
  };
}

/**
 * キャンペーンが現在有効かどうかをチェック
 * @param campaign キャンペーンデータ
 * @returns 有効な場合true
 */
export function isCampaignValid(campaign: Campaign | CampaignOption): boolean {
  // アクティブフラグをチェック（型によってプロパティ名が異なる）
  // CampaignOption: isActive (キャメルケース)
  // Campaign: is_active (スネークケース)
  const isActive = 'isActive' in campaign ? campaign.isActive : campaign.is_active;
  if (!isActive) return false;
  
  const now = new Date();
  const startDate = new Date('startDate' in campaign ? campaign.startDate : campaign.start_date);
  const endDate = new Date('endDate' in campaign ? campaign.endDate : campaign.end_date);
  
  // 開始日前はまだ有効でない
  if (startDate > now) return false;
  
  // 終了日を過ぎている
  if (endDate < now) return false;
  
  return true;
}

/**
 * キャンペーンの残り日数を計算
 */
export function getCampaignRemainingDays(campaign: Campaign | CampaignOption): number | null {
  const endDateStr = 'endDate' in campaign ? campaign.endDate : campaign.end_date;
  if (!endDateStr) return null;
  
  const endDate = new Date(endDateStr);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
