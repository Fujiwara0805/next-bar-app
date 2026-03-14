'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  CreditCard,
  Settings,
  Camera,
  Mail,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import type { ApplicationFormValues } from '@/lib/types/store-application';
import {
  getDefaultApplicationFormValues,
  validateStep,
  PAYMENT_METHOD_OPTIONS,
  FACILITY_CATEGORIES,
  OTHER_FACILITIES,
  APPLICATION_STEPS,
  getFacilityCategoriesByStoreCategory,
  getOtherFacilitiesByStoreCategory,
} from '@/lib/types/store-application';

// ============================================
// Color Palette
// ============================================
const COLORS = {
  deepNavy: '#0A1628',
  midnightBlue: '#162447',
  royalNavy: '#1F4068',
  champagneGold: '#C9A86C',
  paleGold: '#E8D5B7',
  antiqueGold: '#B8956E',
  charcoal: '#2D3436',
  warmGray: '#636E72',
  platinum: '#DFE6E9',
  ivory: '#FDFBF7',
  luxuryGradient:
    'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient:
    'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
};

// ============================================
// Input Styles
// ============================================
const inputStyles = {
  base: 'w-full px-4 py-3 rounded-xl bg-white text-[#2D3436] border-2 transition-all duration-200 font-medium placeholder:text-gray-400 focus:outline-none',
  focus: 'focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20',
  default: 'border-gray-200 hover:border-gray-300',
};

const inputClassName = `${inputStyles.base} ${inputStyles.focus} ${inputStyles.default}`;

// ============================================
// Sub-components
// ============================================

function GoldDivider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}40, transparent)` }}
      />
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: COLORS.champagneGold }}
      />
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}40, transparent)` }}
      />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${COLORS.champagneGold}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
      </div>
      <div>
        <h2 className="text-lg font-bold" style={{ color: COLORS.charcoal }}>
          {title}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: COLORS.warmGray }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {APPLICATION_STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <motion.div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: isCompleted
                    ? COLORS.goldGradient
                    : isActive
                      ? COLORS.champagneGold
                      : `${COLORS.champagneGold}15`,
                  color: isCompleted || isActive ? '#fff' : COLORS.warmGray,
                  border: isActive
                    ? `2px solid ${COLORS.champagneGold}`
                    : '2px solid transparent',
                }}
                animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.id}
              </motion.div>
              <span
                className="text-[10px] sm:text-xs font-medium hidden sm:block"
                style={{
                  color: isActive ? COLORS.champagneGold : COLORS.warmGray,
                }}
              >
                {step.label}
              </span>
            </button>
            {index < APPLICATION_STEPS.length - 1 && (
              <div
                className="w-4 sm:w-8 h-0.5 mx-1"
                style={{
                  background: isCompleted
                    ? COLORS.champagneGold
                    : `${COLORS.champagneGold}25`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RequiredBadge() {
  return (
    <span
      className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-semibold"
      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
    >
      必須
    </span>
  );
}

// ============================================
// Step Content Components
// ============================================

function Step1BasicInfo({
  values,
  onChange,
}: {
  values: ApplicationFormValues;
  onChange: (partial: Partial<ApplicationFormValues>) => void;
}) {
  return (
    <div>
      <SectionHeader
        icon={Store}
        title="基本情報"
        description="店舗の基本的な情報を入力してください"
      />

      <div className="space-y-5">
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            <Store className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            店舗名
            <RequiredBadge />
          </Label>
          <Input
            type="text"
            placeholder="例：Bar NIKENME"
            value={values.storeName}
            onChange={(e) => onChange({ storeName: e.target.value })}
            className={inputClassName}
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            <Store className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            店舗カテゴリ
            <RequiredBadge />
          </Label>
          <div className="flex gap-3">
            {([['bar', '夜'], ['cafe', '昼'], ['both', '両方']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ storeCategory: value, facilities: [] })}
                className="flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2"
                style={{
                  borderColor: values.storeCategory === value ? COLORS.champagneGold : COLORS.platinum,
                  backgroundColor: values.storeCategory === value ? `${COLORS.champagneGold}15` : 'white',
                  color: values.storeCategory === value ? COLORS.charcoal : COLORS.warmGray,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            <FileText className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            店舗説明・コンセプト
          </Label>
          <Textarea
            placeholder="お店の特徴やコンセプトをお書きください"
            rows={4}
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className={inputClassName + ' resize-none'}
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            <MapPin className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            住所
            <RequiredBadge />
          </Label>
          <Input
            type="text"
            placeholder="例：大分県大分市中央町1-2-3 ○○ビル 3F"
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className={inputClassName}
          />
          <p className="text-xs mt-1" style={{ color: COLORS.warmGray }}>
            ※ビル名・階数まで正確にご記入ください
          </p>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            <Phone className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            電話番号
          </Label>
          <Input
            type="tel"
            placeholder="例：097-xxx-xxxx"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  );
}

function Step2BusinessInfo({
  values,
  onChange,
}: {
  values: ApplicationFormValues;
  onChange: (partial: Partial<ApplicationFormValues>) => void;
}) {
  const togglePaymentMethod = (method: string) => {
    const current = values.paymentMethods;
    if (current.includes(method)) {
      onChange({ paymentMethods: current.filter((m) => m !== method) });
    } else {
      onChange({ paymentMethods: [...current, method] });
    }
  };

  return (
    <div>
      <SectionHeader
        icon={Clock}
        title="営業情報"
        description="営業時間や予算などの情報を入力してください"
      />

      <div className="space-y-5">
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            <Clock className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            営業時間
          </Label>
          <Textarea
            placeholder="例：月〜土 18:00〜翌2:00 / 日・祝 18:00〜24:00"
            rows={3}
            value={values.businessHours}
            onChange={(e) => onChange({ businessHours: e.target.value })}
            className={inputClassName + ' resize-none'}
          />
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            定休日
          </Label>
          <Input
            type="text"
            placeholder="例：日曜日・祝日"
            value={values.regularHoliday}
            onChange={(e) => onChange({ regularHoliday: e.target.value })}
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
              <DollarSign className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
              最低予算（円）
            </Label>
            <Input
              type="number"
              placeholder="例：2000"
              min={0}
              value={values.budgetMin || ''}
              onChange={(e) =>
                onChange({ budgetMin: e.target.value ? Number(e.target.value) : 0 })
              }
              className={inputClassName}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
              <DollarSign className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
              最高予算（円）
            </Label>
            <Input
              type="number"
              placeholder="例：5000"
              min={0}
              value={values.budgetMax || ''}
              onChange={(e) =>
                onChange({ budgetMax: e.target.value ? Number(e.target.value) : 0 })
              }
              className={inputClassName}
            />
          </div>
        </div>

        <GoldDivider />

        <div>
          <Label className="text-sm font-semibold mb-3 flex items-center" style={{ color: COLORS.charcoal }}>
            <CreditCard className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            支払い方法
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <label
                key={method}
                className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-[#C9A86C]/40"
                style={{
                  background: values.paymentMethods.includes(method)
                    ? `${COLORS.champagneGold}08`
                    : '#fff',
                  borderColor: values.paymentMethods.includes(method)
                    ? COLORS.champagneGold
                    : '#e5e7eb',
                }}
              >
                <Checkbox
                  checked={values.paymentMethods.includes(method)}
                  onCheckedChange={() => togglePaymentMethod(method)}
                />
                <span className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                  {method}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3Facilities({
  values,
  onChange,
}: {
  values: ApplicationFormValues;
  onChange: (partial: Partial<ApplicationFormValues>) => void;
}) {
  const toggleFacility = (item: string) => {
    const current = values.facilities;
    if (current.includes(item)) {
      onChange({ facilities: current.filter((f) => f !== item) });
    } else {
      onChange({ facilities: [...current, item] });
    }
  };

  return (
    <div>
      <SectionHeader
        icon={Settings}
        title="設備・サービス"
        description="お店の設備やサービスを選択してください"
      />

      <div className="space-y-6">
        {(Object.entries(getFacilityCategoriesByStoreCategory(values.storeCategory)) as [string, { title: string; items: readonly string[] }][]).map(([key, category]) => (
          <div key={key}>
            <h3
              className="text-sm font-bold mb-3 flex items-center gap-2"
              style={{ color: COLORS.charcoal }}
            >
              {category.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {category.items.map((item: string) => (
                <label
                  key={item}
                  className="flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-[#C9A86C]/40"
                  style={{
                    background: values.facilities.includes(item)
                      ? `${COLORS.champagneGold}08`
                      : '#fff',
                    borderColor: values.facilities.includes(item)
                      ? COLORS.champagneGold
                      : '#e5e7eb',
                  }}
                >
                  <Checkbox
                    checked={values.facilities.includes(item)}
                    onCheckedChange={() => toggleFacility(item)}
                  />
                  <span className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <GoldDivider />

        <div>
          <h3
            className="text-sm font-bold mb-3 flex items-center gap-2"
            style={{ color: COLORS.charcoal }}
          >
            🏢 その他の設備・特徴
          </h3>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-3 rounded-xl"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', border: '1px solid #e5e7eb' }}
          >
            {getOtherFacilitiesByStoreCategory(values.storeCategory).map((facility) => (
              <label
                key={facility}
                className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white"
              >
                <Checkbox
                  checked={values.facilities.includes(facility)}
                  onCheckedChange={() => toggleFacility(facility)}
                />
                <span className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                  {facility}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4ImagesAccount({
  values,
  onChange,
}: {
  values: ApplicationFormValues;
  onChange: (partial: Partial<ApplicationFormValues>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = values.imageFiles.length + newFiles.length;

    if (totalFiles > 5) {
      toast.error('画像は最大5枚までアップロードできます');
      return;
    }

    for (const file of newFiles) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} のサイズが10MBを超えています`);
        return;
      }
    }

    onChange({ imageFiles: [...values.imageFiles, ...newFiles] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const updated = values.imageFiles.filter((_, i) => i !== index);
    onChange({ imageFiles: updated });
  };

  return (
    <div>
      <SectionHeader
        icon={Camera}
        title="画像・アカウント"
        description="店舗の画像とログイン用メールアドレスを設定してください"
      />

      <div className="space-y-6">
        {/* Image Upload */}
        <div>
          <Label className="text-sm font-semibold mb-3 flex items-center" style={{ color: COLORS.charcoal }}>
            <Camera className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            店舗画像（最大5枚、各10MBまで）
          </Label>

          {/* Image Previews */}
          {values.imageFiles.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
              {values.imageFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 group"
                  style={{ borderColor: `${COLORS.champagneGold}40` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {values.imageFiles.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 rounded-xl border-2 border-dashed transition-all duration-200 hover:border-[#C9A86C] flex flex-col items-center gap-2 group"
              style={{ borderColor: '#d1d5db' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                style={{ background: `${COLORS.champagneGold}15` }}
              >
                <Upload className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
              </div>
              <span className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                クリックして画像を選択
              </span>
              <span className="text-xs" style={{ color: '#9ca3af' }}>
                {values.imageFiles.length}/5 枚アップロード済み
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <GoldDivider />

        {/* Email */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            <Mail className="w-4 h-4 mr-1.5" style={{ color: COLORS.champagneGold }} />
            店舗用メールアドレス
            <RequiredBadge />
          </Label>
          <p className="text-xs mb-2" style={{ color: COLORS.warmGray }}>
            このメールアドレスが店舗管理用のログインアカウントになります
          </p>
          <Input
            type="email"
            placeholder="例：store@example.com"
            value={values.contactEmail}
            onChange={(e) => onChange({ contactEmail: e.target.value })}
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  );
}

function Step5Confirm({
  values,
  onChange,
}: {
  values: ApplicationFormValues;
  onChange: (partial: Partial<ApplicationFormValues>) => void;
}) {
  return (
    <div>
      <SectionHeader
        icon={FileText}
        title="確認・送信"
        description="入力内容をご確認の上、送信してください"
      />

      <div className="space-y-4">
        {/* Summary Cards */}
        <div
          className="p-4 rounded-xl"
          style={{ background: `${COLORS.ivory}`, border: `1px solid ${COLORS.platinum}` }}
        >
          <h4 className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: COLORS.champagneGold }}>
            基本情報
          </h4>
          <div className="space-y-1.5 text-sm" style={{ color: COLORS.charcoal }}>
            <p>
              <span className="font-semibold">店舗名：</span>
              {values.storeName || '未入力'}
            </p>
            <p>
              <span className="font-semibold">カテゴリ：</span>
              {values.storeCategory === 'bar' ? '夜' : values.storeCategory === 'cafe' ? '昼' : '両方'}
            </p>
            <p>
              <span className="font-semibold">住所：</span>
              {values.address || '未入力'}
            </p>
            {values.phone && (
              <p>
                <span className="font-semibold">電話番号：</span>
                {values.phone}
              </p>
            )}
            {values.description && (
              <p>
                <span className="font-semibold">説明：</span>
                {values.description}
              </p>
            )}
          </div>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{ background: `${COLORS.ivory}`, border: `1px solid ${COLORS.platinum}` }}
        >
          <h4 className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: COLORS.champagneGold }}>
            営業情報
          </h4>
          <div className="space-y-1.5 text-sm" style={{ color: COLORS.charcoal }}>
            {values.businessHours && (
              <p>
                <span className="font-semibold">営業時間：</span>
                {values.businessHours}
              </p>
            )}
            {values.regularHoliday && (
              <p>
                <span className="font-semibold">定休日：</span>
                {values.regularHoliday}
              </p>
            )}
            {(values.budgetMin > 0 || values.budgetMax > 0) && (
              <p>
                <span className="font-semibold">予算：</span>
                {values.budgetMin > 0 ? `${values.budgetMin.toLocaleString()}円` : '-'}
                {' 〜 '}
                {values.budgetMax > 0 ? `${values.budgetMax.toLocaleString()}円` : '-'}
              </p>
            )}
            {values.paymentMethods.length > 0 && (
              <p>
                <span className="font-semibold">支払い方法：</span>
                {values.paymentMethods.join('、')}
              </p>
            )}
          </div>
        </div>

        {values.facilities.length > 0 && (
          <div
            className="p-4 rounded-xl"
            style={{ background: `${COLORS.ivory}`, border: `1px solid ${COLORS.platinum}` }}
          >
            <h4 className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: COLORS.champagneGold }}>
              設備・サービス（{values.facilities.length}件）
            </h4>
            {Object.entries(FACILITY_CATEGORIES).map(([key, category]) => {
              const matched = category.items.filter((item) => values.facilities.includes(item));
              if (matched.length === 0) return null;
              return (
                <div key={key} className="mb-2">
                  <p className="text-[11px] font-bold mb-1" style={{ color: COLORS.warmGray }}>
                    {category.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {matched.map((f) => (
                      <span
                        key={f}
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: `${COLORS.champagneGold}15`,
                          color: COLORS.antiqueGold,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {(() => {
              const categoryItems: string[] = Object.values(FACILITY_CATEGORIES).flatMap((c) => [...c.items]);
              const others = values.facilities.filter((f) => !categoryItems.includes(f));
              if (others.length === 0) return null;
              return (
                <div className="mt-2">
                  <p className="text-[11px] font-bold mb-1" style={{ color: COLORS.warmGray }}>
                    🏢 その他の設備・特徴
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {others.map((f) => (
                      <span
                        key={f}
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: `${COLORS.champagneGold}15`,
                          color: COLORS.antiqueGold,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div
          className="p-4 rounded-xl"
          style={{ background: `${COLORS.ivory}`, border: `1px solid ${COLORS.platinum}` }}
        >
          <h4 className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: COLORS.champagneGold }}>
            画像・アカウント
          </h4>
          <div className="space-y-1.5 text-sm" style={{ color: COLORS.charcoal }}>
            <p>
              <span className="font-semibold">画像：</span>
              {values.imageFiles.length}枚
            </p>
            <p>
              <span className="font-semibold">メールアドレス：</span>
              {values.contactEmail || '未入力'}
            </p>
          </div>
          {values.imageFiles.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {values.imageFiles.map((file, index) => (
                <div
                  key={`preview-${index}`}
                  className="aspect-square rounded-lg overflow-hidden border"
                  style={{ borderColor: `${COLORS.champagneGold}30` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <GoldDivider />

        {/* Remarks */}
        <div>
          <Label className="text-sm font-semibold mb-2 flex items-center" style={{ color: COLORS.charcoal }}>
            備考欄
          </Label>
          <Textarea
            placeholder="ご質問やご要望があればお書きください"
            rows={3}
            value={values.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            className={inputClassName + ' resize-none'}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Success Screen
// ============================================

function SuccessScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
        style={{ background: `${COLORS.champagneGold}20` }}
      >
        <Sparkles className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
      </motion.div>

      <h2 className="text-2xl font-bold mb-3" style={{ color: COLORS.ivory }}>
        お申し込みありがとうございます
      </h2>
      <p className="text-base mb-2" style={{ color: `${COLORS.ivory}B3` }}>
        加盟店申請を受け付けました。
      </p>
      <p className="text-sm mb-8" style={{ color: `${COLORS.ivory}80` }}>
        内容を確認の上、ご登録いただいたメールアドレスにご連絡いたします。
      </p>

      <Link href="/landing">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="px-8 py-3.5 rounded-full font-semibold text-sm inline-flex items-center gap-2"
          style={{ background: COLORS.goldGradient, color: COLORS.deepNavy }}
        >
          トップページに戻る
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </Link>
    </motion.div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function PartnerApplyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formValues, setFormValues] = useState<ApplicationFormValues>(
    getDefaultApplicationFormValues()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateFormValues = (partial: Partial<ApplicationFormValues>) => {
    setFormValues((prev) => ({ ...prev, ...partial }));
  };

  const goToStep = (step: number) => {
    if (step < 1 || step > APPLICATION_STEPS.length) return;
    // Only allow navigating to steps that have been visited (current or previous)
    if (step > currentStep) return;
    setCurrentStep(step);
  };

  const handleNext = () => {
    const error = validateStep(currentStep, formValues);
    if (error) {
      toast.error(error);
      return;
    }
    if (currentStep < APPLICATION_STEPS.length) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    const error = validateStep(currentStep, formValues);
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload images to Supabase Storage
      const imageUrls: string[] = [];

      if (formValues.imageFiles.length > 0) {
        const folderUuid = crypto.randomUUID();

        for (let i = 0; i < formValues.imageFiles.length; i++) {
          const file = formValues.imageFiles[i];
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const safeName = `${Date.now()}_${i}.${ext}`;
          const filePath = `${folderUuid}/${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from('store-application-images')
            .upload(filePath, file, {
              contentType: file.type || 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`画像のアップロードに失敗しました: ${file.name}`);
          }

          const { data: urlData } = supabase.storage
            .from('store-application-images')
            .getPublicUrl(filePath);

          imageUrls.push(urlData.publicUrl);
        }
      }

      // 2. POST form data to API
      const payload = {
        store_name: formValues.storeName,
        store_category: formValues.storeCategory,
        description: formValues.description,
        address: formValues.address,
        phone: formValues.phone,
        business_hours: formValues.businessHours,
        regular_holiday: formValues.regularHoliday,
        budget_min: formValues.budgetMin,
        budget_max: formValues.budgetMax,
        payment_methods: formValues.paymentMethods,
        facilities: formValues.facilities,
        image_urls: imageUrls,
        contact_email: formValues.contactEmail,
        remarks: formValues.remarks,
      };

      const res = await fetch('/api/store-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || '送信に失敗しました');
      }

      // 3. Show success
      setIsSubmitted(true);
      toast.success('申請が送信されました');
    } catch (err) {
      const message = err instanceof Error ? err.message : '送信に失敗しました。もう一度お試しください。';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div className="min-h-screen" style={{ background: COLORS.luxuryGradient }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          background: `${COLORS.deepNavy}CC`,
          borderBottom: `1px solid ${COLORS.champagneGold}30`,
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link
            href="/landing"
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105"
            style={{ color: COLORS.champagneGold }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">戻る</span>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-2xl">
        {isSubmitted ? (
          <SuccessScreen />
        ) : (
          <>
            {/* Page Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-6"
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full"
                style={{
                  background: `${COLORS.champagneGold}15`,
                  border: `1px solid ${COLORS.champagneGold}30`,
                }}
              >
                <Store className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                <span
                  className="text-xs font-medium tracking-widest uppercase"
                  style={{ color: COLORS.champagneGold }}
                >
                  Partner Application
                </span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold mb-2"
                style={{ color: COLORS.ivory }}
              >
                加盟店申し込み
              </h1>
              <p className="text-sm" style={{ color: `${COLORS.ivory}80` }}>
                NIKENME+に掲載する店舗情報をご入力ください
              </p>
            </motion.div>

            {/* Step Indicator */}
            <StepIndicator currentStep={currentStep} onStepClick={goToStep} />

            {/* Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl p-5 sm:p-8 shadow-xl"
              style={{
                background: COLORS.cardGradient,
                border: `1px solid ${COLORS.platinum}`,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  {currentStep === 1 && (
                    <Step1BasicInfo values={formValues} onChange={updateFormValues} />
                  )}
                  {currentStep === 2 && (
                    <Step2BusinessInfo values={formValues} onChange={updateFormValues} />
                  )}
                  {currentStep === 3 && (
                    <Step3Facilities values={formValues} onChange={updateFormValues} />
                  )}
                  {currentStep === 4 && (
                    <Step4ImagesAccount values={formValues} onChange={updateFormValues} />
                  )}
                  {currentStep === 5 && (
                    <Step5Confirm values={formValues} onChange={updateFormValues} />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: `1px solid ${COLORS.platinum}` }}>
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrev}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm border-2 transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: `${COLORS.champagneGold}40`,
                      color: COLORS.charcoal,
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    前へ
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < APPLICATION_STEPS.length ? (
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                    }}
                  >
                    次へ
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    whileHover={{ scale: isSubmitting ? 1 : 1.03 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all disabled:opacity-60"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        申請を送信
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Step label for mobile */}
            <div className="text-center mt-4 sm:hidden">
              <span className="text-xs" style={{ color: `${COLORS.ivory}60` }}>
                ステップ {currentStep} / {APPLICATION_STEPS.length}：
                {APPLICATION_STEPS[currentStep - 1].label}
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
