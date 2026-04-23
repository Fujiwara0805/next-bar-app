'use client';

import { Suspense } from 'react';
import { LoginForm, LoginFormFallback } from './_components/login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
