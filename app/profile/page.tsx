import { ProfileHeader } from '@/components/profile/ProfileHeader';
import ProfileContent from '@/components/profile/ProfileContent';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <ProfileHeader />
      <ProfileContent />
    </div>
  );
} 