import { redirect } from 'next/navigation';

export default function OperatorLoginRedirect({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const q = searchParams.redirect ? `?redirect=${encodeURIComponent(searchParams.redirect)}` : '';
  redirect(`/login${q}`);
}
