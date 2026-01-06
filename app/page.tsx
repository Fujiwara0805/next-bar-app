'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // スプラッシュ画面を廃止し、直接LPへリダイレクト
    router.replace('/landing');
  }, [router]);

  // リダイレクト中の最小限のローディング表示
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#050505' }}
    >
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}
