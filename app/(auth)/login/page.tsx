import { redirect } from 'next/navigation';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { role?: string; redirect?: string };
}) {
  const redirectQuery = searchParams.redirect
    ? `?redirect=${encodeURIComponent(searchParams.redirect)}`
    : '';
  if (searchParams.role === 'customer') {
    redirect(`/login/customer${redirectQuery}`);
  }
  if (searchParams.role === 'store') {
    redirect(`/login/store${redirectQuery}`);
  }
  redirect(`/login/operator${redirectQuery}`);
}
