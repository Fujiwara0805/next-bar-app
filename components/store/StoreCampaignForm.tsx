'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PartyPopper,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n/context';

export interface CampaignFormValues {
  hasCampaign: boolean;
  campaignName: string;
  campaignStartDate: string;
  campaignEndDate: string;
}

export function getDefaultCampaignFormValues(): CampaignFormValues {
  return {
    hasCampaign: false,
    campaignName: '',
    campaignStartDate: '',
    campaignEndDate: '',
  };
}

// DBデータをフォーム値に変換
export function dbDataToCampaignForm(dbData: {
  has_campaign?: boolean;
  campaign_name?: string | null;
  campaign_start_date?: string | null;
  campaign_end_date?: string | null;
} | null): CampaignFormValues {
  if (!dbData) {
    return getDefaultCampaignFormValues();
  }
  
  return {
    hasCampaign: dbData.has_campaign || false,
    campaignName: dbData.campaign_name || '',
    campaignStartDate: dbData.campaign_start_date ? dbData.campaign_start_date.split('T')[0] : '',
    campaignEndDate: dbData.campaign_end_date ? dbData.campaign_end_date.split('T')[0] : '',
  };
}

// フォーム値をDB形式に変換
export function campaignFormToDbData(formValues: CampaignFormValues): {
  has_campaign: boolean;
  campaign_name: string | null;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
} {
  return {
    has_campaign: formValues.hasCampaign,
    campaign_name: formValues.campaignName || null,
    campaign_start_date: formValues.campaignStartDate || null,
    campaign_end_date: formValues.campaignEndDate || null,
  };
}

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
  
  // キャンペーン設定が有効な時は自動展開
  const isExpanded = values.hasCampaign;

  const handleChange = <K extends keyof CampaignFormValues>(
    key: K,
    value: CampaignFormValues[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <Card className="overflow-hidden border-0 shadow-none bg-transparent">
      {/* ヘッダー */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors rounded-xl"
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
              {values.hasCampaign ? 'キャンペーン実施中' : 'キャンペーンを設定'}
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
          />
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
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
              {/* キャンペーン名 */}
              <div className="space-y-2">
                <Label htmlFor="campaign-name" className="font-bold flex items-center gap-2">
                  <PartyPopper className="w-4 h-4" />
                  {t('campaign.name')}
                </Label>
                <Input
                  id="campaign-name"
                  value={values.campaignName}
                  onChange={(e) => handleChange('campaignName', e.target.value)}
                  placeholder={t('campaign.name_placeholder')}
                  disabled={disabled}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-300"
                  style={{ fontSize: '16px' }}
                />
                {errors.campaignName && (
                  <p className="text-xs text-red-500">{errors.campaignName}</p>
                )}
              </div>

              {/* 期間設定 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-start-date" className="font-bold flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {t('campaign.start_date')}
                  </Label>
                  <Input
                    id="campaign-start-date"
                    type="date"
                    value={values.campaignStartDate}
                    onChange={(e) => handleChange('campaignStartDate', e.target.value)}
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300 h-12 placeholder:text-gray-300 w-full max-w-full"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-end-date" className="font-bold flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {t('campaign.end_date')}
                  </Label>
                  <Input
                    id="campaign-end-date"
                    type="date"
                    value={values.campaignEndDate}
                    onChange={(e) => handleChange('campaignEndDate', e.target.value)}
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300 h-12 placeholder:text-gray-300 w-full max-w-full"
                    style={{ fontSize: '16px' }}
                  />
                  {errors.campaignEndDate && (
                    <p className="text-xs text-red-500">{errors.campaignEndDate}</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default StoreCampaignForm;
