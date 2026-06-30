'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, ClipboardList, Megaphone,
  LogOut, Menu, X, CalendarDays, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminThemeProvider, useAdminTheme } from '@/lib/admin-theme-context';
import { useAuth } from '@/lib/auth/context';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';

const LOGO_URL = 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,c_scale,w_96/v1782798987/ChatGPT_Image_2026%E5%B9%B46%E6%9C%8830%E6%97%A5_14_54_57_tjuisz.png';
const COMPANY_NAME = '株式会社Nobody';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}
interface NavGroup {
  label: string | null;
  items: NavItem[];
}

// freee 風: ナビをグループ見出しで束ねる
const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: '/store/manage', icon: LayoutDashboard, label: 'ダッシュボード', exact: true }],
  },
  {
    label: '加盟店・顧客',
    items: [
      { href: '/store/manage/customers', icon: Users, label: '顧客管理' },
      { href: '/store/manage/applications', icon: ClipboardList, label: '申し込み管理' },
    ],
  },
  {
    label: 'イベント・販促',
    items: [
      { href: '/store/manage/events', icon: CalendarDays, label: 'イベント管理' },
      { href: '/store/manage/sponsors', icon: Megaphone, label: 'スポンサー管理' },
    ],
  },
];

const NAV_ITEMS_FLAT: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function isNavActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}

/** 現在のパスに対応するナビ見出し（freee のパンくず用） */
function useCurrentNavLabel() {
  const pathname = usePathname();
  // exact でないものを優先しつつ、最長一致を採用
  const match = [...NAV_ITEMS_FLAT]
    .filter((i) => isNavActive(i, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? 'ダッシュボード';
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { colors: C } = useAdminTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      // signOut() 内で /login へフルリロード遷移する
      await signOut();
    } catch {
      toast.error('ログアウトに失敗しました', { position: 'top-center' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <img src={LOGO_URL} alt="にけんめぷらす" className="w-7 h-7 rounded-lg" />
        <span className="text-sm font-bold tracking-tight" style={{ color: C.text }}>
          にけんめぷらす
        </span>
        <span
          className="ml-auto font-en text-[9px] font-bold tracking-[0.08em] px-1.5 py-0.5 rounded-full"
          style={{ background: '#ffc82c', color: '#13294b' }}
        >
          ADMIN
        </span>
      </div>

      {/* Navigation（グループ見出し付き） */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className="space-y-0.5">
            {group.label && (
              <p
                className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{ color: C.textSubtle }}
              >
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isNavActive(item, pathname);
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    onNavigate?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all"
                  style={{
                    background: active ? '#13294b' : 'transparent',
                    color: active ? '#F7F3E9' : C.textMuted,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = C.accentBg; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ffc82c' }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-2" style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all"
          style={{ color: C.danger }}
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </div>
    </div>
  );
}

/** freee 風の上部バー（パンくず＋会社名＋稼働ステータス） */
function AdminTopBar() {
  const { colors: C } = useAdminTheme();
  const currentLabel = useCurrentNavLabel();
  return (
    <div
      className="hidden md:flex items-center h-14 px-8 sticky top-0 z-30"
      style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${C.border}`, backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center gap-1.5 text-[13px]">
        <span style={{ color: C.textSubtle }}>ホーム</span>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />
        <span className="font-semibold" style={{ color: C.text }}>{currentLabel}</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: C.successBg, color: C.success }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.success }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: C.success }} />
          </span>
          稼働中
        </span>
        <span className="text-[13px] font-semibold" style={{ color: C.text }}>{COMPANY_NAME}</span>
      </div>
    </div>
  );
}

function ManageLayoutInner({ children }: { children: React.ReactNode }) {
  const { colors: C } = useAdminTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="theme-light min-h-screen flex" style={{ background: C.bg }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:w-[240px] md:flex-shrink-0 fixed inset-y-0 left-0 z-40"
        style={{
          background: '#ffffff',
          borderRight: `1px solid ${C.border}`,
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          borderBottom: `1px solid ${C.border}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg"
          style={{ color: C.text }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-2">
          <img src={LOGO_URL} alt="" className="w-5 h-5 rounded" />
          <span className="text-sm font-semibold" style={{ color: C.text }}>にけんめぷらす</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[260px]"
              style={{
                background: '#ffffff',
                borderRight: `1px solid ${C.border}`,
              }}
            >
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg"
                  style={{ color: C.textSubtle }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-[240px] min-h-screen pt-14 md:pt-0">
        <AdminTopBar />
        {children}
      </main>
    </div>
  );
}

/** 店舗アカウントがログイン後に使うパス（運営ダッシュボードとは別） */
const STORE_SELF_MANAGE_SEGMENTS = /^(update|edit|change-password|scan|broadcast|analytics|engagement|event-benefits|customers|qr)$/;

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, accountType, store, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    // 未ログイン → /login
    if (!accountType) {
      setChecked(false);
      router.replace('/login');
      return;
    }

    // 店舗アカウント: 自分の store id の update / edit / change-password / engagement 等のみ通過
    if (accountType === 'store') {
      if (!store?.id) {
        setChecked(false);
        router.replace('/login');
        return;
      }
      const m = pathname.match(/^\/store\/manage\/([^/]+)\/([^/]+)$/);
      const allowed =
        m &&
        m[1] === store.id &&
        STORE_SELF_MANAGE_SEGMENTS.test(m[2]);
      if (allowed) {
        setChecked(true);
        return;
      }
      setChecked(false);
      if (m && m[1] !== store.id && STORE_SELF_MANAGE_SEGMENTS.test(m[2])) {
        router.replace(`/store/manage/${store.id}/update`);
        return;
      }
      router.replace(`/store/manage/${store.id}/update`);
      return;
    }

    if (profile?.role !== 'admin' || accountType !== 'platform') {
      setChecked(false);
      router.replace('/login');
      return;
    }

    setChecked(true);
  }, [loading, profile, accountType, store, router, pathname]);

  if (loading || !checked) {
    return <LoadingScreen />;
  }

  // 店舗アカウント: 空席更新など店舗向け画面のみ。管理者用サイドバー・テーマは付けない。
  if (accountType === 'store') {
    return <>{children}</>;
  }

  return (
    <AdminThemeProvider>
      <ManageLayoutInner>{children}</ManageLayoutInner>
    </AdminThemeProvider>
  );
}
