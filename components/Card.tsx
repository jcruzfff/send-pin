'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Oxanium } from 'next/font/google';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

interface CardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
}

export default function Card({
  title,
  description,
  icon: Icon,
  onClick,
  className = "",
  iconClassName = ""
}: CardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 p-6 rounded-lg border text-left",
        "transition-all duration-200 hover:scale-[1.02]",
        className
      )}
    >
      <Icon className={cn("w-8 h-8", iconClassName)} />
      <div className="space-y-1">
        <h3 className={cn(
          "font-semibold text-[15px]",
          oxanium.className
        )}>{title}</h3>
        <p className="text-sm text-zinc-400">{description}</p>
      </div>
    </button>
  );
} 