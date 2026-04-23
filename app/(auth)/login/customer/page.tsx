'use client';

import { Suspense } from 'react';
import { LoginForm, LoginFormFallback } from '../_components/login-form';

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm mode="customer" />
    </Suspense>
  );
}
