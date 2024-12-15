'use client';

import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { ProfileView } from '@/components/profile/ProfileView';

export default function UserProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const from = searchParams.get('from');
  const username = params.username as string;

  const handleBack = () => {
    if (from) {
      router.push(from);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="px-[18px] py-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronRight className="h-5 w-5 mr-1 rotate-180" />
            <span className="text-[10px]">Back</span>
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <ProfileView isCurrentUser={false} username={username} />
    </div>
  );
} 