'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Building2, FileText, Layers, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle';
import { useAuth } from '@/lib/auth/context';
import { getSponsorById } from '@/lib/actions/sponsor';
import { SponsorBasicInfoTab } from '@/components/admin/sponsor-basic-info-tab';
import { SponsorContractsTab } from '@/components/admin/sponsor-contracts-tab';
import { SponsorAdSlotsTab } from '@/components/admin/sponsor-ad-slots-tab';
import { SponsorReportsTab } from '@/components/admin/sponsor-reports-tab';
import type { Sponsor } from '@/lib/sponsors/types';

const TABS = [
  { id: 'info', label: '基本情報', icon: Building2 },
  { id: 'contracts', label: '契約管理', icon: FileText },
  { id: 'slots', label: '広告枠', icon: Layers },
  { id: 'reports', label: 'レポート', icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SponsorDetailPage() {
  const { colors: C, isDark } = useAdminTheme();
  const { id } = useParams<{ id: string }>();
  const { profile, accountType } = useAuth();

  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('info');

  const isAdmin = profile?.role === 'admin' && accountType === 'platform';

  useEffect(() => {
    if (!isAdmin || !id) return;
    (async () => {
      setLoading(true);
      const res = await getSponsorById(id);
      if (res.success && res.data) setSponsor(res.data);
      setLoading(false);
    })();
  }, [isAdmin, id]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <p style={{ color: C.textMuted }}>アクセス権限がありません</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <p style={{ color: C.textMuted }}>スポンサーが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(248,250,252,0.85)',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/store/manage/sponsors">
              <motion.div
                whileHover={{ x: -2 }}
                className="p-2 rounded-lg cursor-pointer transition-colors"
                style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
              >
                <ArrowLeft className="w-4 h-4" style={{ color: C.textMuted }} />
              </motion.div>
            </Link>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: C.accentBg, color: C.accent }}
              >
                {sponsor.company_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight" style={{ color: C.text }}>
                  {sponsor.company_name}
                </h1>
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{
                    background: sponsor.is_active ? C.successBg : C.dangerBg,
                    color: sponsor.is_active ? C.success : C.danger,
                  }}
                >
                  {sponsor.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <AdminThemeToggle />
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6">
        <div
          className="flex gap-1 mt-4 p-1 rounded-xl"
          style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
        >
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex-1 justify-center"
              style={{
                background: activeTab === tab.id ? C.accent : 'transparent',
                color: activeTab === tab.id ? '#fff' : C.textMuted,
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6 pb-12">
          {activeTab === 'info' && (
            <SponsorBasicInfoTab
              sponsor={sponsor}
              onUpdate={(updated) => setSponsor(updated)}
            />
          )}
          {activeTab === 'contracts' && (
            <SponsorContractsTab sponsorId={sponsor.id} />
          )}
          {activeTab === 'slots' && (
            <SponsorAdSlotsTab sponsorId={sponsor.id} />
          )}
          {activeTab === 'reports' && (
            <SponsorReportsTab sponsorId={sponsor.id} />
          )}
        </div>
      </div>
    </div>
  );
}
