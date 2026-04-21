'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function StoreAnalyticsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  useEffect(() => {
    if (!storeId) return;
    router.replace(`/store/manage/${storeId}/broadcast?tab=analytics`);
  }, [router, storeId]);

  return <LoadingScreen size="lg" />;
}
