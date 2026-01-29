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
    // トグルOFF時にすべての入力値をリセット
    if (key === 'isActive' && value === false) {
      onChange(getDefaultCouponFormValues());
      return;
    }
    onChange({ ...values, [key]: value });
  };

  // 割引タイプのアイコン取得
  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed':
        return <DollarSign className="w-4 h-4" />;
      case 'special_price':
        return <Sparkles className="w-4 h-4" />;
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
          {/* 特別価格の場合 */}
          {values.discountType === 'special_price' && values.originalPrice && values.discountedPrice && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg text-gray-400 line-through">
                  ¥{parseInt(values.originalPrice).toLocaleString()}
                </span>
                <span className="text-2xl font-bold text-amber-600">
                  → ¥{parseInt(values.discountedPrice).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-bold text-red-500">
                ¥{(parseInt(values.originalPrice) - parseInt(values.discountedPrice)).toLocaleString()} お得！
              </p>
            </div>
          )}
          {/* %割引の場合 */}
          {values.discountType === 'percentage' && values.discountValue && (
            <p className="text-2xl font-bold text-amber-600">
              {formatDiscountValue(values.discountType as CouponDiscountType, parseFloat(values.discountValue))}
            </p>
          )}
          {/* 定額割引の場合 */}
          {values.discountType === 'fixed' && values.discountValue && (
            <p className="text-2xl font-bold text-amber-600">
              ¥{parseInt(values.discountValue).toLocaleString()} OFF
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
      <div 
        className="w-full p-4 flex items-center justify-between transition-colors"
        style={{
          background: values.isCampaign 
            ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(244, 114, 182, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{
              background: values.isCampaign ? 'rgba(236, 72, 153, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            }}
          >
            <Ticket 
              className="w-5 h-5" 
              style={{ color: values.isCampaign ? '#EC4899' : '#D97706' }}
            />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-800">クーポン設定</h3>
            <p className="text-sm text-gray-500">
              {values.isCampaign ? (
                <span 
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ 
                    background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
                    color: '#FFF',
                  }}
                >
                  キャンペーン連動
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
            <div className="p-6 space-y-6 border-t overflow-hidden">

              {/* タイトル */}
              <div className="space-y-2">
                <Label htmlFor="coupon-title" className="font-bold flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  クーポンタイトル<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="coupon-title"
                  value={values.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="例: 初回来店限定 20%OFF"
                  maxLength={100}
                  disabled={disabled}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-300"
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
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-300"
                  style={{ fontSize: '16px', minHeight: '120px' }}
                />
              </div>

              {/* 割引タイプ */}
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  {getDiscountTypeIcon(values.discountType)}
                  割引タイプ<span className="text-red-500">*</span>
                </Label>
                <Select
                  value={values.discountType}
                  onValueChange={(value) => handleChange('discountType', value as CouponFormValues['discountType'])}
                  disabled={disabled}
                >
                  <SelectTrigger className="font-bold bg-white border-2 border-gray-300 placeholder:text-gray-300">
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
                        定額割引
                      </div>
                    </SelectItem>
                    <SelectItem value="special_price">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        特別価格
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
                {errors.discountType && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.discountType}
                  </p>
                )}
              </div>

              {/* 割引値（%割引の場合） */}
              {values.discountType === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="coupon-discount-value" className="font-bold">
                    割引率 (%)<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="coupon-discount-value"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={values.discountValue}
                    onChange={(e) => handleChange('discountValue', e.target.value)}
                    placeholder="例: 10"
                    disabled={disabled}
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
              )}

              {/* 定額割引の場合 */}
              {values.discountType === 'fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="coupon-discount-value-fixed" className="font-bold">
                    割引額 (円)<span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                    <Input
                      id="coupon-discount-value-fixed"
                      type="number"
                      min="0"
                      step="100"
                      value={values.discountValue}
                      onChange={(e) => handleChange('discountValue', e.target.value)}
                      placeholder="例: 500"
                      disabled={disabled}
                      className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-400 pl-8"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  {errors.discountValue && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.discountValue}
                    </p>
                  )}
                </div>
              )}

              {/* 特別価格の場合: 元の価格 → 特別価格 */}
              {values.discountType === 'special_price' && (
                <div className="space-y-4">
                  <div 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                  >
                    <p className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      特別価格設定
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="original-price" className="text-xs font-medium text-gray-600">
                          元の価格<span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="original-price"
                          type="number"
                          min="0"
                          step="100"
                          value={values.originalPrice}
                          onChange={(e) => handleChange('originalPrice', e.target.value)}
                          placeholder="3500"
                          disabled={disabled}
                          className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-400"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                      <div className="flex-shrink-0 text-2xl font-bold text-amber-500 mt-5">→</div>
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="discounted-price" className="text-xs font-medium text-gray-600">
                          特別価格<span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="discounted-price"
                          type="number"
                          min="0"
                          step="100"
                          value={values.discountedPrice}
                          onChange={(e) => handleChange('discountedPrice', e.target.value)}
                          placeholder="2000"
                          disabled={disabled}
                          className="font-bold bg-white text-amber-700 border-2 border-amber-400 placeholder:text-gray-400"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    </div>
                    
                    {/* 割引額の自動計算表示 */}
                    {values.originalPrice && values.discountedPrice && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-2 rounded-lg text-center"
                        style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
                      >
                        <span className="text-sm font-bold text-amber-700">
                          お得額: ¥{(parseInt(values.originalPrice) - parseInt(values.discountedPrice)).toLocaleString()} OFF
                        </span>
                        {parseInt(values.originalPrice) > 0 && (
                          <span className="text-xs text-amber-600 ml-2">
                            ({Math.round(((parseInt(values.originalPrice) - parseInt(values.discountedPrice)) / parseInt(values.originalPrice)) * 100)}%割引)
                          </span>
                        )}
                      </motion.div>
                    )}
                  </div>
                  
                  {errors.originalPrice && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.originalPrice}
                    </p>
                  )}
                  {errors.discountedPrice && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.discountedPrice}
                    </p>
                  )}
                </div>
              )}

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
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* 期間設定 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-start-date" className="font-bold flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    配布開始日<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="coupon-start-date"
                    type="date"
                    value={values.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300 h-12 placeholder:text-gray-300 w-full max-w-full"
                    style={{ fontSize: '16px' }}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon-expiry-date" className="font-bold flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    有効期限<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="coupon-expiry-date"
                    type="date"
                    value={values.expiryDate}
                    onChange={(e) => handleChange('expiryDate', e.target.value)}
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300 h-12 placeholder:text-gray-300 w-full max-w-full"
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
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-300"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-muted-foreground font-bold">
                  空欄の場合は無制限
                </p>
              </div>

              {/* 追加特典 */}
              <div className="space-y-2">
                <Label htmlFor="coupon-additional-bonus" className="font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  追加特典
                </Label>
                <Textarea
                  id="coupon-additional-bonus"
                  value={values.additionalBonus}
                  onChange={(e) => handleChange('additionalBonus', e.target.value)}
                  placeholder="例：SNSフォローでドリンク1杯サービス"
                  rows={2}
                  disabled={disabled}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-300"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-muted-foreground font-bold">
                  次回利用できるクーポンをここに記載（任意）
                </p>
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
