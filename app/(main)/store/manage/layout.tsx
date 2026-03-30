'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminThemeProvider } from '@/lib/admin-theme-context';
import { useAuth } from '@/lib/auth/context';
import { LoadingScreen } from '@/components/ui/loading-screen';

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

  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
