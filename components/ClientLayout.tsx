'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { OnboardingOverlay } from '@/components/ui/onboarding-overlay';
import { useAuth } from '@/lib/context/auth-context';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();

  // Separate effect for handling onboarding
  useEffect(() => {
    if (user && localStorage.getItem('isFirstLogin') === 'true') {
      setShowOnboarding(true);
      // Clear the first login flag
      localStorage.removeItem('isFirstLogin');
    }
  }, [user]);

  const handleOnboardingClose = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
    setShowOnboarding(false);
  };

  return (
    <>
      {children}
      <Navigation />
      {showOnboarding && <OnboardingOverlay onClose={handleOnboardingClose} />}
    </>
  );
} 