import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Zap } from 'lucide-react';
import { LeaderboardHeader } from '@/components/ui/leaderboard-header';

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

// Temporary mock data - will be replaced with real data
const mockLeaders = [
  { id: 1, username: "marcosluna", xp: 790, avatar: "/placeholder-avatar.png" },
  { id: 2, username: "viviana98", xp: 788, avatar: "/placeholder-avatar.png" },
  { id: 3, username: "yarrp", xp: 678, avatar: "/placeholder-avatar.png" },
  { id: 4, username: "TMS168", xp: 658, avatar: "/placeholder-avatar.png" },
  { id: 5, username: "MasteraSnackin", xp: 610, avatar: "/placeholder-avatar.png" },
];

export default function LeadersPage() {
  return (
    
    
    <div className="min-h-screen bg-black">
      <LeaderboardHeader />
      
      {/* Content */}
      <div className="px-4 py-8">
        <h1 className={cn("text-[32px] font-bold text-white", oxanium.className)}>
                Leaderboard
                </h1>
            {/* Description */}
            <p className={cn("text-zinc-400 text-sm mt-3 mb-5", oxanium.className)}>
            Submitted a spot? See how you stack up against the legends! The more you contribute, the closer you get to the top!
            </p>

        {/* Stats Card */}
        <div className="bg-zinc-900/50 rounded-3xl p-4 mb-8 border border-zinc-800/50">
          <div className="flex items-center gap-3 mb-12 py-2 px-2">
            <div className="w-16 h-16 rounded-xl bg-black flex items-center justify-center border border-zinc-800">
              <Zap className="w-6 h-6 text-[#B2FF4D]" />
            </div>
            <div className="py- px-2">
              <h2 className={cn("text-[24px] font-bold text-white", oxanium.className)}>
               Contributors
              </h2>
              <div className="flex items-center mt-2 bg-zinc-900/80 rounded-[10px] py-1 px-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#B2FF4D] ml-1 mr-2" />
                <span className="text-[#B2FF4D] ml-1 mr-1">
                  {mockLeaders.length.toLocaleString()}
                </span>
                <span className="text-zinc-400 ml-2">skaters</span>
              </div>
            </div>
          </div>

          {/* Top 3 */}
          <div className="flex justify-center items-center gap-6 mb-12">
            {/* 2nd Place */}
            <div className="relative w-[120px] mt-auto">
              <div className="aspect-square rounded-full overflow-hidden border-2 border-zinc-800">
                <Avatar className="w-full h-full">
                  <AvatarImage
                    src={mockLeaders[1].avatar}
                    alt={mockLeaders[1].username}
                  />
                  <AvatarFallback className="text-2xl">
                    {mockLeaders[1].username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black border border-zinc-800 flex items-center justify-center">
                <span className="text-sm font-bold text-zinc-400">2</span>
              </div>
              <div className="text-center mt-4">
                <p className={cn("text-white text-sm truncate mb-1", oxanium.className)}>
                  {mockLeaders[1].username}
                </p>
                <div className="flex items-center justify-center gap-1 mt-3">
                  <Zap className="w-3 h-3 text-[#B2FF4D]" />
                  <span className={cn("text-[#B2FF4D] text-sm", oxanium.className)}>
                    {mockLeaders[1].xp} XP
                  </span>
                </div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="relative w-[160px] mt-auto">
              <div className="aspect-square rounded-full overflow-hidden border-2 border-[#B2FF4D]">
                <Avatar className="w-full h-full">
                  <AvatarImage
                    src={mockLeaders[0].avatar}
                    alt={mockLeaders[0].username}
                  />
                  <AvatarFallback className="text-3xl">
                    {mockLeaders[0].username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black border border-zinc-800 flex items-center justify-center">
                <span className="text-sm font-bold text-[#B2FF4D]">1</span>
              </div>
              <div className="text-center mt-4">
                <p className={cn("text-white text-sm truncate mb-1", oxanium.className)}>
                  {mockLeaders[0].username}
                </p>
                <div className="flex items-center justify-center gap-1 mt-3">
                  <Zap className="w-3 h-3 text-[#B2FF4D]" />
                  <span className={cn("text-[#B2FF4D] text-sm", oxanium.className)}>
                    {mockLeaders[0].xp} XP
                  </span>
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="relative w-[120px] mt-auto">
              <div className="aspect-square rounded-full overflow-hidden border-2 border-[#CD7F32]">
                <Avatar className="w-full h-full">
                  <AvatarImage
                    src={mockLeaders[2].avatar}
                    alt={mockLeaders[2].username}
                  />
                  <AvatarFallback className="text-2xl">
                    {mockLeaders[2].username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black border border-zinc-800 flex items-center justify-center">
                <span className="text-sm font-bold text-[#CD7F32]">3</span>
              </div>
              <div className="text-center mt-4">
                <p className={cn("text-white text-sm truncate mb-1", oxanium.className)}>
                  {mockLeaders[2].username}
                </p>
                <div className="flex items-center justify-center gap-1 mt-3">
                  <Zap className="w-3 h-3 text-[#B2FF4D]" />
                  <span className={cn("text-[#B2FF4D] text-sm", oxanium.className)}>
                    {mockLeaders[2].xp} XP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* List Container */}
          <div className="bg-zinc-900/80 rounded-3xl overflow-hidden border border-zinc-800/50">
            {/* List Header */}
            <div className="bg-zinc-800/50 px-6 py-4">
              <div className="grid grid-cols-[24px_1fr_120px] gap-4 items-center">
                <span className={cn("text-zinc-400 text-sm", oxanium.className)}>#</span>
                <span className={cn("text-zinc-400 text-sm -ml-2", oxanium.className)}>Skater</span>
                <span className={cn("text-zinc-400 text-sm text-right", oxanium.className)}>XP Earned</span>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-zinc-800/50">
              {mockLeaders.slice(3).map((leader, index) => (
                <div 
                  key={leader.id}
                  className="px-6 py-4 grid grid-cols-[12px_1fr_auto] items-center bg-zinc-900"
                >
                  <span className={cn(
                    "text-zinc-500 font-bold",
                    oxanium.className
                  )}>
                    {index + 4}.
                  </span>
                  <div className="flex items-center pl-3">
                    <Avatar className="w-10 h-10 mr-3">
                      <AvatarImage
                        src={leader.avatar}
                        alt={leader.username}
                      />
                      <AvatarFallback className="text-sm">
                        {leader.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("text-white text-sm", oxanium.className)}>
                      {leader.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pl-4">
                    <Zap className="w-3 h-3 text-[#B2FF4D]" />
                    <span className={cn("text-[#B2FF4D] text-sm", oxanium.className)}>
                      {leader.xp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    
    </div>
  );
} 