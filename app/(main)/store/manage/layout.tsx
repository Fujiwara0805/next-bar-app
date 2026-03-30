'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Store, PartyPopper, ClipboardList, Megaphone,
  LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import { AdminThemeProvider, useAdminTheme } from '@/lib/admin-theme-context';
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle';
import { useAuth } from '@/lib/auth/context';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';

const LOGO_URL = 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

const NAV_ITEMS = [
  { href: '/store/manage', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/store/manage/campaigns', icon: PartyPopper, label: 'キャンペーン' },
  { href: '/store/manage/applications', icon: ClipboardList, label: '申し込み管理' },
  { href: '/store/manage/sponsors', icon: Megaphone, label: 'スポンサー' },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { colors: C } = useAdminTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました', { position: 'top-center', duration: 1000 });
      router.push('/login');
    } catch {
      toast.error('ログアウトに失敗しました', { position: 'top-center' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <img src={LOGO_URL} alt="NIKENME+" className="w-7 h-7 rounded-lg" />
        <span className="text-sm font-semibold tracking-tight" style={{ color: C.text }}>
          NIKENME+
        </span>
        <span
          className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: C.accentBg, color: C.accent }}
        >
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                onNavigate?.();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all group"
              style={{
                background: active ? C.accentBg : 'transparent',
                color: active ? C.accent : C.textMuted,
              }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {active && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.accent }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-2" style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
        <div className="px-3 py-1">
          <AdminThemeToggle />
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all"
          style={{ color: C.textSubtle }}
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </div>
    </div>
  );
}

function ManageLayoutInner({ children }: { children: React.ReactNode }) {
  const { colors: C, isDark } = useAdminTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: C.bg }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:w-[240px] md:flex-shrink-0 fixed inset-y-0 left-0 z-40"
        style={{
          background: isDark ? '#0c1222' : '#ffffff',
          borderRight: `1px solid ${C.border}`,
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3"
        style={{
          background: C.bg + 'ee',
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
          <span className="text-sm font-semibold" style={{ color: C.text }}>NIKENME+</span>
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
                background: isDark ? '#0c1222' : '#ffffff',
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
        {children}
      </main>
    </div>
  );
}

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, accountType, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!profile?.is_business || accountType !== 'platform') {
      router.push('/login');
      return;
    }

    setChecked(true);
  }, [loading, profile, accountType, router]);

  if (loading || !checked) {
    return <LoadingScreen />;
  }

  return (
    <AdminThemeProvider>
      <ManageLayoutInner>{children}</ManageLayoutInner>
    </AdminThemeProvider>
  );
}
