import { SponsorProvider } from '@/lib/sponsors/context';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SponsorProvider>
      {children}
    </SponsorProvider>
  );
}
