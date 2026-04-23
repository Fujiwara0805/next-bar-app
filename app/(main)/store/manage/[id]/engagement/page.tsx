'use client';

/**
 * 店舗管理「集客設定」メニュー
 * - スキャン / クーポン / 配信分析 / 消込 の 4 メニューで各画面へ遷移
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  QrCode,
  Ticket,
  Megaphone,
  ScanLine,
  Sparkles,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { useAuth } from '@/lib/auth/context';
import { useAppMode } from '@/lib/app-mode-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function StoreEngagementMenuPage() {
  const { colorsB: COLORS } = useAppMode();
  const router = useRouter();
  const params = useParams();
  const { user, accountType } = useAuth();
  const storeId = params.id as string;
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  useEffect(() => {
    if (!user || !storeId || !accountType) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id,name,image_urls,email,owner_id')
          .eq('id', storeId)
          .maybeSingle();
        if (error) throw error;
        if (data) setStore(data as Store);
      } catch (err) {
        console.error('Error fetching store:', err);
        toast.error('店舗情報の取得に失敗しました', { position: 'top-center' });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, storeId, accountType]);

  const items = [
    {
      href: `/store/manage/${storeId}/scan`,
      icon: QrCode,
      title: 'スキャン',
      description: '顧客が表示するQRを読み取ってチェックインを記録',
    },
    {
      href: `/store/manage/${storeId}/coupons`,
      icon: Ticket,
      title: 'クーポン',
      description: 'LINEクーポンの作成・配信',
    },
    {
      href: `/store/manage/${storeId}/broadcast`,
      icon: Megaphone,
      title: '配信・分析',
      description: 'LINEでのお知らせ配信と配信効果の分析',
    },
    {
      href: `/store/manage/${storeId}/redeem`,
      icon: ScanLine,
      title: '消込',
      description: 'クーポン消込（6桁コード入力）',
    },
  ];

  return (
    <div className="min-h-[100dvh] pb-20" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-light tracking-widest" style={{ color: COLORS.ivory }}>
              集客設定
            </h1>
          </div>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={() => router.push(`/store/manage/${storeId}/update`)}
            className="absolute right-4"
            aria-label="閉じる"
          />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            className="p-5 mb-6 rounded-2xl shadow-lg flex items-center gap-4"
            style={{
              background: '#FFFFFF',
              border: `1px solid rgba(201, 168, 108, 0.15)`,
            }}
          >
            {store?.image_urls && store.image_urls.length > 0 ? (
              <img
                src={store.image_urls[0]}
                alt={store.name}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                style={{ border: `1px solid rgba(201, 168, 108, 0.25)` }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(201, 168, 108, 0.08)',
                  border: `1px solid rgba(201, 168, 108, 0.2)`,
                }}
              >
                <Building2 className="w-6 h-6" style={{ color: COLORS.warmGray }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: COLORS.warmGray }}>店舗</p>
              <h2 className="text-base font-bold truncate" style={{ color: COLORS.deepNavy }}>
                {loading ? '読み込み中…' : store?.name || '店舗情報が取得できませんでした'}
              </h2>
            </div>
            <Sparkles className="w-5 h-5 shrink-0" style={{ color: COLORS.champagneGold }} />
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="text-left"
              >
                <Card
                  className="p-5 rounded-2xl shadow-lg flex items-start gap-4 h-full cursor-pointer transition-all"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid rgba(201, 168, 108, 0.15)`,
                  }}
                >
                  <div
                    className="p-3 rounded-xl shrink-0"
                    style={{
                      background: COLORS.goldGradient,
                      boxShadow: '0 2px 8px rgba(201, 168, 108, 0.25)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: COLORS.deepNavy }} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold mb-1" style={{ color: COLORS.deepNavy }}>
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: COLORS.warmGray }}>
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight
                    className="w-5 h-5 shrink-0 mt-1"
                    style={{ color: COLORS.champagneGold }}
                  />
                </Card>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
