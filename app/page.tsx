'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 直接LPへリダイレクト
    router.replace('/landing');
  }, [router]);

  // ローディング画面を削除
  return null;
}
