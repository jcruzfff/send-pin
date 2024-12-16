'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';

const publicPaths = ['/auth', '/login', '/reset-password'];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && !publicPaths.includes(pathname)) {
        router.replace('/login');
      } else if (user && publicPaths.includes(pathname)) {
        router.replace('/');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Allow access to setup page only for authenticated users
  if (pathname === '/setup' && !user) {
    router.replace('/login');
    return null;
  }

  return (
    <div data-supressscrollrestoration="true" style={{ isolation: 'isolate' }}>
      {children}
    </div>
  );
} 