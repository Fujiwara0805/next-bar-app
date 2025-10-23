'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    {
      href: '/map',
      label: 'マップ',
      icon: MapPin,
    },
    {
      href: '/profile',
      label: 'プロフィール',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-bottom">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
