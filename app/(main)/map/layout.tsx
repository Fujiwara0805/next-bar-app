import type { Metadata } from 'next';
import { translations } from '@/lib/i18n/translations';

const seo = translations.ja.seo.map;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: 'https://nikenme.jp/map',
  },
  openGraph: {
    title: seo.og_title,
    description: seo.og_description,
    url: 'https://nikenme.jp/map',
  },
  twitter: {
    card: 'summary_large_image',
    title: seo.og_title,
    description: seo.og_description,
  },
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
