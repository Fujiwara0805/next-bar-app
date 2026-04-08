import { SponsorProvider } from '@/lib/sponsors/context';
import { UserPushSubscription } from '@/components/user-push-subscription';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SponsorProvider>
      {children}
      <UserPushSubscription />
    </SponsorProvider>
  );
}
