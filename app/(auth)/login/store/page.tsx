'use client';

import { Suspense } from 'react';
import { LoginForm, LoginFormFallback } from '../_components/login-form';

export default function StoreLoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm mode="store" />
    </Suspense>
  );
}
