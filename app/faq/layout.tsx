import type { Metadata } from 'next';
import { translations } from '@/lib/i18n/translations';

const seo = translations.ja.seo.faq;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: 'https://nikenme.jp/faq',
  },
  openGraph: {
    title: seo.og_title,
    description: seo.og_description,
    url: 'https://nikenme.jp/faq',
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
