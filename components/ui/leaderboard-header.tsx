'use client';

import { ProfileHeader } from '@/components/profile/ProfileHeader';

export function LeaderboardHeader() {
  const userXP = 25000; // This will be replaced with actual user XP from the database

  return <ProfileHeader showXP={true} xpAmount={userXP} />;
} 