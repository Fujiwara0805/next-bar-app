'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SplashScreen } from '@/components/splash-screen';

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
    router.push('/landing');
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return null;
}
