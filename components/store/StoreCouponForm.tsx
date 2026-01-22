'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Percent,
  DollarSign,
  Gift,
  Calendar,
  Image as ImageIcon,
  QrCode,
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
  const [isExpanded, setIsExpanded] = useState(false);

  // クーポンが設定されている場合は自動展開
  useEffect(() => {
    if (values.title || values.discountType || values.isActive) {
      setIsExpanded(true);
    }
  }, []);

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
      {/* ヘッダー（クリックで展開/折りたたみ） */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-colors"
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Ticket className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-800">クーポン設定</h3>
            <p className="text-sm text-gray-500">
              {values.isActive ? (
                <span className="text-green-600 font-bold">● 有効</span>
              ) : (
                <span className="text-gray-400">○ 無効</span>
              )}
              {values.title && ` - ${values.title}`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

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
              {/* 有効/無効スイッチ */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${values.isActive ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <Sparkles className={`w-4 h-4 ${values.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <Label className="font-bold">クーポンを有効にする</Label>
                    <p className="text-xs text-muted-foreground">
                      有効にするとユーザーに表示されます
                    </p>
                  </div>
                </div>
                <Switch
                  checked={values.isActive}
                  onCheckedChange={(checked) => handleChange('isActive', checked)}
                  disabled={disabled}
                />
              </div>

              {/* 基本情報セクション */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  基本情報
                </h4>

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
                    rows={3}
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {/* 割引タイプと値 */}
                <div className="grid grid-cols-2 gap-4">
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
                      placeholder={values.discountType === 'percentage' ? '10' : '500'}
                      disabled={disabled || values.discountType === 'free_item'}
                      className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                      style={{ fontSize: '16px' }}
                    />
                    {errors.discountValue && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.discountValue}
                      </p>
                    )}
                  </div>
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
              </div>

              {/* 期間設定セクション */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  期間設定
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coupon-start-date" className="font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      配布開始日
                    </Label>
                    <Input
                      id="coupon-start-date"
                      type="date"
                      value={values.startDate}
                      onChange={(e) => handleChange('startDate', e.target.value)}
                      disabled={disabled}
                      className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coupon-expiry-date" className="font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      有効期限
                    </Label>
                    <Input
                      id="coupon-expiry-date"
                      type="date"
                      value={values.expiryDate}
                      onChange={(e) => handleChange('expiryDate', e.target.value)}
                      disabled={disabled}
                      className="font-bold bg-white text-gray-700 border-2 border-gray-300"
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
              </div>

              {/* 運用管理セクション */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  運用管理
                </h4>

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

                {/* 画像URL */}
                <div className="space-y-2">
                  <Label htmlFor="coupon-image-url" className="font-bold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    クーポン画像URL
                  </Label>
                  <Input
                    id="coupon-image-url"
                    type="url"
                    value={values.imageUrl}
                    onChange={(e) => handleChange('imageUrl', e.target.value)}
                    placeholder="https://example.com/coupon-image.jpg"
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                    style={{ fontSize: '16px' }}
                  />
                  {errors.imageUrl && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.imageUrl}
                    </p>
                  )}
                  {values.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={values.imageUrl}
                        alt="クーポン画像プレビュー"
                        className="max-w-xs rounded-lg border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* バーコード/QRコードURL */}
                <div className="space-y-2">
                  <Label htmlFor="coupon-barcode-url" className="font-bold flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    バーコード/QRコードURL
                  </Label>
                  <Input
                    id="coupon-barcode-url"
                    type="url"
                    value={values.barcodeUrl}
                    onChange={(e) => handleChange('barcodeUrl', e.target.value)}
                    placeholder="https://example.com/barcode.png"
                    disabled={disabled}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                    style={{ fontSize: '16px' }}
                  />
                  {errors.barcodeUrl && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.barcodeUrl}
                    </p>
                  )}
                  {values.barcodeUrl && (
                    <div className="mt-2">
                      <img
                        src={values.barcodeUrl}
                        alt="バーコードプレビュー"
                        className="max-w-[200px] rounded-lg border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
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
