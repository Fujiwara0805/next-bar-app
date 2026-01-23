'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Percent,
  DollarSign,
  Gift,
  Calendar,
  Hash,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CouponFormValues,
  CouponDiscountType,
  getDefaultCouponFormValues,
  getDiscountTypeLabel,
  formatDiscountValue,
} from '@/lib/types/coupon';

interface StoreCouponFormProps {
  values: CouponFormValues;
  onChange: (values: CouponFormValues) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
  currentUses?: number;
}

export function StoreCouponForm({
  values,
  onChange,
  disabled = false,
  errors = {},
  currentUses = 0,
}: StoreCouponFormProps) {
  // クーポン設定が有効な時は自動展開
  const isExpanded = values.isActive;

  const handleChange = <K extends keyof CouponFormValues>(
    key: K,
    value: CouponFormValues[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  // 割引タイプのアイコン取得
  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed':
        return <DollarSign className="w-4 h-4" />;
      case 'free_item':
        return <Gift className="w-4 h-4" />;
      default:
        return <Ticket className="w-4 h-4" />;
    }
  };

  // プレビュー表示
  const renderPreview = () => {
    if (!values.title && !values.discountType) return null;

    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-800">クーポンプレビュー</span>
        </div>
        <div className="space-y-1">
          {values.title && (
            <p className="font-bold text-gray-800">{values.title}</p>
          )}
          {values.discountType && values.discountValue && (
            <p className="text-2xl font-bold text-amber-600">
              {formatDiscountValue(values.discountType as CouponDiscountType, parseFloat(values.discountValue))}
            </p>
          )}
          {values.discountType === 'free_item' && (
            <p className="text-2xl font-bold text-amber-600">無料サービス</p>
          )}
          {values.conditions && (
            <p className="text-sm text-gray-600">条件: {values.conditions}</p>
          )}
          {values.expiryDate && (
            <p className="text-xs text-gray-500">
              有効期限: {new Date(values.expiryDate).toLocaleDateString('ja-JP')}まで
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      {/* ヘッダー（ON・OFFスイッチ付き） */}
      <div className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-orange-500/10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Ticket className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-800">クーポン設定</h3>
            <p className="text-sm text-gray-500">
              {values.title && ` ${values.title}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-600">
            {values.isActive ? 'ON' : 'OFF'}
          </span>
          <Switch
            checked={values.isActive}
            onCheckedChange={(checked) => handleChange('isActive', checked)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* フォーム本体 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6 space-y-6 border-t">

              {/* タイトル */}
              <div className="space-y-2">
                <Label htmlFor="coupon-title" className="font-bold flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  クーポンタイトル
                </Label>
                <Input
                  id="coupon-title"
                  value={values.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="例: 初回来店限定 20%OFF"
                  maxLength={100}
                  disabled={disabled}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* 詳細説明 */}
              <div className="space-y-2">
                <Label htmlFor="coupon-description" className="font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  詳細説明
                </Label>
                <Textarea
                  id="coupon-description"
                  value={values.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="クーポンの詳細な説明を入力"
                  rows={5}
                  disabled={disabled}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px', minHeight: '120px' }}
                />
              </div>

              {/* 割引タイプ */}
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  {getDiscountTypeIcon(values.discountType)}
                  割引タイプ
                </Label>
                <Select
                  value={values.discountType}
                  onValueChange={(value) => handleChange('discountType', value as CouponFormValues['discountType'])}
                  disabled={disabled}
                >
                  <SelectTrigger className="font-bold bg-white border-2 border-gray-300">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        %割引
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        固定金額割引
                      </div>
                    </SelectItem>
                    <SelectItem value="free_item">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        無料サービス
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 割引値 */}
              <div className="space-y-2">
                <Label htmlFor="coupon-discount-value" className="font-bold">
                  割引値
                  {values.discountType === 'percentage' && ' (%)'}
                  {values.discountType === 'fixed' && ' (円)'}
                </Label>
                <Input
                  id="coupon-discount-value"
                  type="number"
                  min="0"
                  max={values.discountType === 'percentage' ? 100 : undefined}
                  step={values.discountType === 'fixed' ? 100 : 1}
                  value={values.discountValue}
                  onChange={(e) => handleChange('discountValue', e.target.value)}
                  placeholder={values.discountType === 'percentage' ? '例: 10' : '例: 500'}
                  disabled={disabled || values.discountType === 'free_item'}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-400"
                  style={{ fontSize: '16px' }}
                />
                {errors.discountValue && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.discountValue}
                  </p>
                )}
              </div>

              {/* 利用条件 */}
              <div className="space-y-2">
                <Label htmlFor="coupon-conditions" className="font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  利用条件
                </Label>
                <Textarea
                  id="coupon-conditions"
                  value={values.conditions}
                  onChange={(e) => handleChange('conditions', e.target.value)}
                  placeholder="例: 2名様以上でのご来店時に限る、他クーポンとの併用不可"
                  rows={2}
                  disabled={disabled}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* 期間設定 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-start-date" className="font-bold flex items-center gap-2 ">
                    <Calendar className="w-3 h-3" />
                    配布開始日
                  </Label>
                  <Input
                    id="coupon-start-date"
                    type="date"
                    value={values.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300 h-9"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon-expiry-date" className="font-bold flex items-center gap-2 ">
                    <Calendar className="w-3 h-3" />
                    有効期限
                  </Label>
                  <Input
                    id="coupon-expiry-date"
                    type="date"
                    value={values.expiryDate}
                    onChange={(e) => handleChange('expiryDate', e.target.value)}
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300 h-9"
                    style={{ fontSize: '16px' }}
                  />
                  {errors.expiryDate && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.expiryDate}
                    </p>
                  )}
                </div>
              </div>

              {/* 運用管理 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-max-uses" className="font-bold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    発行上限数
                  </Label>
                  <Input
                    id="coupon-max-uses"
                    type="number"
                    min="0"
                    step="1"
                    value={values.maxUses}
                    onChange={(e) => handleChange('maxUses', e.target.value)}
                    placeholder="無制限"
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-xs text-muted-foreground font-bold">
                    空欄の場合は無制限
                    {currentUses > 0 && ` (現在の利用数: ${currentUses})`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon-code" className="font-bold flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    クーポンコード
                  </Label>
                  <Input
                    id="coupon-code"
                    value={values.code}
                    onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                    placeholder="WELCOME20"
                    maxLength={50}
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300 uppercase"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-xs text-muted-foreground font-bold">
                    店舗での提示用コード
                  </p>
                </div>
              </div>

              {/* プレビュー */}
              {renderPreview()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default StoreCouponForm;
