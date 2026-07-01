'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Loader2, MapPin, Store as StoreIcon, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

const NAVY = '#13294b';
const BRASS = '#ffc82c';
const COPPER = '#B87333';

type VisitRow = {
  id: string;
  store_id: string;
  store_name: string;
  store_image_url: string | null;
  checked_in_at: string;
  source: string;
};

function formatVisitDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * 会員ページ（マイページ）の来店履歴セクション。
 * `/api/me/check-ins` から自分の来店履歴を取得して新しい順で表示する。
 */
export function VisitHistory() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [history, setHistory] = useState<VisitRow[]>([]);
  const [uniqueStoreCount, setUniqueStoreCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError(true);
        return;
      }
      const res = await fetch('/api/me/check-ins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = await res.json();
      setHistory(json.history ?? []);
      setUniqueStoreCount(json.unique_store_count ?? 0);
      setFetched(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // 開いた初回のみ取得（遅延ロードで会員ページを軽く保つ）
  useEffect(() => {
    if (open && !fetched && !loading) {
      fetchHistory();
    }
  }, [open, fetched, loading, fetchHistory]);

  const visible = showAll ? history : history.slice(0, 5);

  return (
    <div
      className="rounded-2xl mb-4 bg-white relative overflow-hidden"
      style={{
        border: `1px solid ${BRASS}33`,
        boxShadow: '0 8px 22px rgba(19, 41, 75, 0.08)',
      }}
    >
      {/* 折りたたみヘッダー（タップで開閉） */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 transition-colors hover:bg-black/[0.02]"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: `${BRASS}18`, border: `1px solid ${BRASS}50` }}
          >
            <History className="w-4 h-4" style={{ color: COPPER }} />
          </span>
          <h3 className="font-bold text-sm" style={{ color: NAVY }}>
            来店履歴を見る
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {fetched && history.length > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${NAVY}0D`, color: NAVY }}
            >
              {history.length}回 / {uniqueStoreCount}店
            </span>
          )}
          <ChevronDown
            className="w-5 h-5 transition-transform"
            style={{ color: COPPER, transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </div>
      </button>

      {open && (
      <div className="px-5 pb-5">
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: COPPER }} />
        </div>
      ) : error ? (
        <p className="text-xs py-4 text-center" style={{ color: 'rgba(19,41,75,0.6)' }}>
          来店履歴を取得できませんでした。
        </p>
      ) : history.length === 0 ? (
        <div className="py-5 text-center">
          <MapPin className="w-6 h-6 mx-auto mb-2" style={{ color: `${COPPER}99` }} />
          <p className="text-xs" style={{ color: 'rgba(19,41,75,0.6)' }}>
            <span className="block">まだ来店履歴がありません。</span>
            <span className="block">会員証を提示してチェックインしよう</span>
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {visible.map((row, index) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.3) }}
                >
                  <Link
                    href={`/store/${row.store_id}`}
                    className="flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-black/[0.03]"
                  >
                    {row.store_image_url ? (
                      <img
                        src={row.store_image_url}
                        alt={row.store_name}
                        className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${NAVY}0D` }}
                      >
                        <StoreIcon className="w-5 h-5" style={{ color: COPPER }} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: NAVY }}>
                        {row.store_name}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(19,41,75,0.55)' }}>
                        {formatVisitDate(row.checked_in_at)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {history.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full mt-3 text-xs font-bold py-2 rounded-lg transition-colors"
              style={{ background: `${NAVY}08`, color: NAVY }}
            >
              {showAll ? '閉じる' : `すべて表示（${history.length}件）`}
            </button>
          )}
        </>
      )}
      </div>
      )}
    </div>
  );
}
