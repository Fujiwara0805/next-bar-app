import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'MachiNow - いますぐ、2軒目へ',
  description: '飲食店の混雑状況をリアルタイムで共有するアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
