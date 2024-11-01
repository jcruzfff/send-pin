import { Search } from 'lucide-react';
import { Card } from '@/components/Card';
import { 
  Map, 
  Calendar, 
  Users, 
  Settings, 
  Bell, 
  FileText 
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground px-4">
      <div className="w-full max-w-[700px] space-y-6 py-8">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input 
            type="search"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <h1 className="text-3xl font-bold">What kind of spot do you want to skate today?</h1>

        {/* Grid of Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            title="Ledges"
            description="Butter benches"
            icon={Map}
            href="/map"
          />
          <Card 
            title="Stairs"
            description="Attack this double set yo"
            icon={Calendar}
            href="/schedule"
          />
          <Card 
            title="Rails"
            description="Lets go gnar"
            icon={Users}
            href="/team"
          />
          <Card 
            title="Banks"
            description="Find dope bank spots"
            icon={FileText}
            href="/reports"
          />
          <Card 
            title="Manny Pads"
            description="Balance blocks"
            icon={Bell}
            href="/notifications"
          />
          <Card 
            title="Random Spot"
            description="Find something new"
            icon={Settings}
            href="/settings"
          />
        </div>
      </div>
    </div>
  );
} 