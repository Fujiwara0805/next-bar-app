'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PartyPopper,
  Loader2,
  Info,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n/context';
import { CampaignOption, getCampaignRemainingDays } from '@/lib/types/campaign';
import { getActiveCampaigns } from '@/lib/actions/campaign';

// ============================================
// 型定義
// ============================================

export interface CampaignFormValues {
  hasCampaign: boolean;
  campaignId: string | null;      // マスタから選択したキャンペーンID
  campaignName: string;            // 表示用（マスタ選択時のみ）
  campaignStartDate: string;
  campaignEndDate: string;
}

export function getDefaultCampaignFormValues(): CampaignFormValues {
  return {
    hasCampaign: false,
    campaignId: null,
    campaignName: '',
    campaignStartDate: '',
    campaignEndDate: '',
  };
}

// DBデータをフォーム値に変換
export function dbDataToCampaignForm(dbData: {
  has_campaign?: boolean | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  campaign_start_date?: string | null;
  campaign_end_date?: string | null;
} | null): CampaignFormValues {
  if (!dbData) {
    return getDefaultCampaignFormValues();
  }
  
  return {
    hasCampaign: dbData.has_campaign || false,
    campaignId: dbData.campaign_id || null,
    campaignName: dbData.campaign_name || '',
    campaignStartDate: dbData.campaign_start_date ? dbData.campaign_start_date.split('T')[0] : '',
    campaignEndDate: dbData.campaign_end_date ? dbData.campaign_end_date.split('T')[0] : '',
  };
}

// フォーム値をDB形式に変換
export function campaignFormToDbData(formValues: CampaignFormValues): {
  has_campaign: boolean;
  campaign_id: string | null;
  campaign_name: string | null;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
} {
  return {
    has_campaign: formValues.hasCampaign,
    campaign_id: formValues.campaignId || null,
    campaign_name: formValues.campaignName || null,
    campaign_start_date: formValues.campaignStartDate || null,
    campaign_end_date: formValues.campaignEndDate || null,
  };
}

// ============================================
// コンポーネント
// ============================================

interface StoreCampaignFormProps {
  values: CampaignFormValues;
  onChange: (values: CampaignFormValues) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export function StoreCampaignForm({
  values,
  onChange,
  disabled = false,
  errors = {},
}: StoreCampaignFormProps) {
  const { t } = useLanguage();
  
  // キャンペーンマスタの一覧
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  
  // キャンペーン設定が有効な時は自動展開
  const isExpanded = values.hasCampaign;

  // キャンペーンマスタを取得
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        const result = await getActiveCampaigns();
        if (result.success && result.data) {
          setCampaigns(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    if (isExpanded) {
      fetchCampaigns();
    }
  }, [isExpanded]);

  const handleChange = <K extends keyof CampaignFormValues>(
    key: K,
    value: CampaignFormValues[K]
  ) => {
    // トグルOFF時にすべての入力値をリセット
    if (key === 'hasCampaign' && value === false) {
      onChange(getDefaultCampaignFormValues());
      return;
    }
    onChange({ ...values, [key]: value });
  };

  // キャンペーン選択時の処理（マスタから選択のみ）
  const handleCampaignSelect = (campaignId: string) => {
    const selected = campaigns.find(c => c.id === campaignId);
    if (selected) {
      onChange({
        ...values,
        campaignId: selected.id,
        campaignName: selected.name,
        campaignStartDate: selected.startDate,
        campaignEndDate: selected.endDate,
      });
    }
  };

  // 選択されているキャンペーンの残り日数
  const selectedCampaign = campaigns.find(c => c.id === values.campaignId);
  const remainingDays = selectedCampaign ? getCampaignRemainingDays(selectedCampaign) : null;

  return (
    <Card 
      className="overflow-hidden border-0 shadow-none"
      style={{ 
        backgroundColor: values.hasCampaign ? 'rgba(236, 72, 153, 0.08)' : 'rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* ヘッダー */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer transition-colors rounded-xl"
        style={{
          backgroundColor: values.hasCampaign ? 'rgba(236, 72, 153, 0.12)' : 'rgba(15, 23, 42, 0.06)',
        }}
        onClick={() => handleChange('hasCampaign', !values.hasCampaign)}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{
              background: values.hasCampaign
                ? 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)'
                : 'linear-gradient(135deg, #0A1628 0%, #162447 100%)',
            }}
          >
            <PartyPopper
              className="w-5 h-5"
              style={{ color: values.hasCampaign ? '#FFF' : '#C9A86C' }}
            />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{t('campaign.settings')}</h3>
            <p className="text-xs text-gray-500">
              {values.hasCampaign 
                ? values.campaignName 
                  ? `実施中: ${values.campaignName}` 
                  : 'キャンペーンを選択してください'
                : 'キャンペーンを設定'
              }
            </p>
          </div>
        </div>

        <div 
          className="flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={values.hasCampaign}
            onCheckedChange={(checked) => handleChange('hasCampaign', checked)}
            disabled={disabled}
            className="data-[state=checked]:bg-pink-500"
          />
        </div>
      </div>

      {/* 展開コンテンツ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6 space-y-6 border-t overflow-hidden">
              {/* キャンペーン選択（ドロップダウン） */}
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <PartyPopper className="w-4 h-4" />
                  キャンペーンを選択
                </Label>
                
                {loadingCampaigns ? (
                  <div className="flex items-center gap-2 py-3 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">キャンペーンを読み込み中...</span>
                  </div>
                ) : (
                  <Select
                    value={values.campaignId || ''}
                    onValueChange={handleCampaignSelect}
                    disabled={disabled}
                  >
                    <SelectTrigger className="font-bold bg-white border-2 border-gray-300 h-12">
                      <SelectValue placeholder={campaigns.length === 0 ? 'キャンペーンがありません' : 'キャンペーンを選択してください'} />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => {
                        const days = getCampaignRemainingDays(campaign);
                        return (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            <div className="flex items-center gap-2">
                              <span>{campaign.name}</span>
                              {days !== null && days <= 7 && (
                                <span className="text-xs text-pink-500 font-bold">
                                  残り{days}日
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
                
                {/* 選択中のキャンペーン情報 */}
                {selectedCampaign && (
                  <div 
                    className="mt-3 p-3 rounded-lg flex items-start gap-2"
                    style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}
                  >
                    <Info className="w-4 h-4 mt-0.5 text-pink-500 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold text-pink-600">{selectedCampaign.name}</p>
                      <p className="text-gray-600">
                        期間: {new Date(selectedCampaign.startDate).toLocaleDateString('ja-JP')} 〜{' '}
                        {new Date(selectedCampaign.endDate).toLocaleDateString('ja-JP')}
                      </p>
                      {remainingDays !== null && remainingDays > 0 && (
                        <p className="text-pink-500 font-bold mt-1">
                          残り{remainingDays}日
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ヒントメッセージ */}
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(201, 168, 108, 0.1)' }}
              >
                <p className="text-xs text-gray-600">
                  💡 地域のイベントやキャンペーンに参加すると、より多くのお客様に見つけてもらえます。
                  管理者が登録したキャンペーンから選択してください。
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default StoreCampaignForm;
