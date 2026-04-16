import type { Metadata } from 'next';
import { translations } from '@/lib/i18n/translations';

const seo = translations.ja.seo.landing;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: 'https://nikenme.jp/landing',
  },
  openGraph: {
    title: seo.og_title,
    description: seo.og_description,
    url: 'https://nikenme.jp/landing',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
