'use client';

/**
 * おごり酒設定フォームコンポーネント
 *
 * 店舗作成・編集ページで使用する管理フォーム。
 * StoreCouponForm と同じ UI パターン（トグル付きカード、展開アニメーション）を踏襲。
 * カラーパレットは既存画面（店舗詳細画面）のデザインを踏襲（champagneGold系）。
 * フォームはローカル state のみを管理し、DB 保存は親コンポーネントが担当する。
 *
 * 金額は1杯1,000円固定。ドリンクは名前のみ（価格なし）。
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wine,
  Plus,
  X,
  GlassWater,
  Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  OgoriFormValues,
  OgoriDrink,
  getDefaultOgoriFormValues,
  createEmptyDrink,
  OGORI_FIXED_AMOUNT,
} from '@/lib/types/ogori';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/context';

// アプリ共通カラーパレット（店舗詳細画面と統一）
const COLORS = {
  champagneGold: '#C9A86C',
};

/** コンポーネント Props */
interface StoreOgoriFormProps {
  /** フォーム値 */
  values: OgoriFormValues;
  /** 値変更時のコールバック */
  onChange: (values: OgoriFormValues) => void;
  /** 店舗ID（編集モード時：既存データをDBから読み込む） */
  storeId?: string;
  /** 無効状態 */
  disabled?: boolean;
}

/**
 * おごり酒設定フォーム
 *
 * - ヘッダー: ON/OFFトグルスイッチ
 * - 固定金額表示: 1杯1,000円
 * - ドリンクメニュー: ドリンク名の追加・削除
 */
export function StoreOgoriForm({
  values,
  onChange,
  storeId,
  disabled = false,
}: StoreOgoriFormProps) {
  const { t } = useLanguage();

  /** おごり酒が有効な時は自動展開 */
  const isExpanded = values.isEnabled;

  // ----------------------------------------------------------------
  // 編集モード: 既存データをDBから読み込み
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!storeId) return;

    const loadExistingData = async () => {
      const { data: drinksData } = await supabase
        .from('ogori_drinks')
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order');

      const drinks: OgoriDrink[] = (drinksData ?? []).map((d: any) => ({
        id: d.id,
        name: d.name ?? '',
        imageUrl: d.image_url ?? null,
        isActive: d.is_active ?? true,
      }));

      onChange({
        ...values,
        drinks,
      });
    };

    loadExistingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // ----------------------------------------------------------------
  // 汎用変更ハンドラ
  // ----------------------------------------------------------------
  const handleChange = <K extends keyof OgoriFormValues>(
    key: K,
    value: OgoriFormValues[K]
  ) => {
    // トグルOFF時にすべてリセット
    if (key === 'isEnabled' && value === false) {
      onChange(getDefaultOgoriFormValues());
      return;
    }
    onChange({ ...values, [key]: value });
  };

  // ----------------------------------------------------------------
  // ドリンクメニュー ハンドラ
  // ----------------------------------------------------------------
  /** ドリンク追加 */
  const addDrink = () => {
    handleChange('drinks', [...values.drinks, createEmptyDrink()]);
  };

  /** ドリンク削除 */
  const removeDrink = (id: string) => {
    handleChange(
      'drinks',
      values.drinks.filter((d) => d.id !== id)
    );
  };

  /** ドリンク名更新 */
  const updateDrinkName = (id: string, name: string) => {
    handleChange(
      'drinks',
      values.drinks.map((d) => (d.id === id ? { ...d, name } : d))
    );
  };

  // ----------------------------------------------------------------
  // レンダリング
  // ----------------------------------------------------------------
  return (
    <Card className="overflow-hidden">
      {/* ヘッダー（ON・OFFスイッチ付き）— StoreCouponFormと同じパターン */}
      <div
        className="w-full p-4 flex items-center justify-between transition-colors"
        style={{
          background: 'linear-gradient(135deg, rgba(201, 168, 108, 0.1) 0%, rgba(201, 168, 108, 0.06) 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: 'rgba(201, 168, 108, 0.2)' }}
          >
            <Wine className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-800">{t('store_detail.ogori_settings_title')}</h3>
            <p className="text-sm text-gray-500">
              {t('store_detail.ogori_settings_subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={values.isEnabled}
            onCheckedChange={(checked) => handleChange('isEnabled', checked)}
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
              {/* ===== 固定金額の案内 ===== */}
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(201, 168, 108, 0.08)',
                  color: '#8B7355',
                }}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  {t('store_detail.ogori_fixed_amount_note').replace('{amount}', OGORI_FIXED_AMOUNT.toLocaleString('ja-JP'))}
                </span>
              </div>

              {/* ===== ドリンクメニュー ===== */}
              <div className="space-y-3">
                <Label className="font-bold flex items-center gap-2">
                  <GlassWater className="w-4 h-4" />
                  {t('store_detail.ogori_drink_menu')}
                </Label>

                {values.drinks.map((drink) => (
                  <motion.div
                    key={drink.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      type="text"
                      value={drink.name}
                      onChange={(e) => updateDrinkName(drink.id, e.target.value)}
                      placeholder={t('store_detail.ogori_drink_name_placeholder')}
                      disabled={disabled}
                      className="font-bold bg-white text-gray-700 border-2 border-gray-300 placeholder:text-gray-300 flex-1"
                      style={{ fontSize: '16px' }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDrink(drink.id)}
                      disabled={disabled}
                      className="shrink-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}

                {/* ドリンク追加ボタン — ライトカラー（champagneGold系） */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDrink}
                  disabled={disabled}
                  className="w-full border-dashed border-2 font-bold"
                  style={{
                    borderColor: 'rgba(201, 168, 108, 0.5)',
                    color: COLORS.champagneGold,
                    background: 'rgba(201, 168, 108, 0.05)',
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('store_detail.ogori_add_drink')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default StoreOgoriForm;
