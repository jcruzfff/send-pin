'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { SplashScreen } from '@/components/ui/splash-screen';
import { OnboardingOverlay } from '@/components/ui/onboarding-overlay';
import { useAuth } from '@/lib/context/auth-context';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Handle splash screen
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Separate effect for handling onboarding
  useEffect(() => {
    console.log('Checking first login status:', {
      user: !!user,
      isFirstLogin: localStorage.getItem('isFirstLogin'),
      showOnboarding
    });

    if (user && localStorage.getItem('isFirstLogin') === 'true') {
      console.log('First time login detected, showing onboarding');
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

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      {children}
      <Navigation />
      {showOnboarding && <OnboardingOverlay onClose={handleOnboardingClose} />}
    </>
  );
} 