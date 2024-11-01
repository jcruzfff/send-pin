import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface CardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export function Card({ title, description, icon: Icon, href }: CardProps) {
  return (
    <Link 
      href={href}
      className="p-6 rounded-lg border border-border hover:border-foreground/20 transition-colors bg-background/50 flex flex-col items-start gap-3 group"
    >
      <Icon className="w-8 h-8 group-hover:text-primary transition-colors" />
      <h2 className="font-semibold text-lg">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
} 