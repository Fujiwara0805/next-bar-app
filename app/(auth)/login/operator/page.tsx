'use client';

import { Suspense } from 'react';
import { LoginForm, LoginFormFallback } from '../_components/login-form';

export default function OperatorLoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm mode="operator" />
    </Suspense>
  );
}
