'use client';

import { useState } from 'react';
import { PlusCircle, Trophy, UserPlus, Flag, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';

export default function ProfileContent() {
  const [activeTab, setActiveTab] = useState('what-to-do');

  const tabs = [
    { id: 'what-to-do', label: 'What to do' },
    { id: 'spot-book', label: 'Spot Book' },
    { id: 'spot-map', label: 'Spot Map' },
  ];

  const actionButtons = [
    { id: 'add-spot', label: 'Add spot', icon: <PlusCircle className="w-6 h-6" /> },
    { id: 'add-trick', label: 'Add trick', icon: <Trophy className="w-6 h-6" /> },
    { id: 'tip-skater', label: 'Tip skater', icon: <UserPlus className="w-6 h-6" /> },
    { id: 'report', label: 'Report', icon: <Flag className="w-6 h-6" /> },
  ];

  const whatToDoListItems = [
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'View your favorite spots and tricks',
      href: '/favorites'
    },
    {
      id: 'let',
      title: 'Lets go back',
      subtitle: 'We gotta go back to this spot',
      href: '/let'
    }
  ];

  const spotCategories = [
    { id: 'stairs', title: 'Stairs', subtitle: 'Find the perfect set of stairs' },
    { id: 'rails', title: 'Rails', subtitle: 'Discover rails and handrails' },
    { id: 'gaps', title: 'Gaps', subtitle: 'Challenge yourself with gaps' },
    { id: 'ledges', title: 'Ledges', subtitle: 'Smooth ledges for grinding' },
    { id: 'manual-pads', title: 'Manual Pads', subtitle: 'Perfect for technical tricks' },
  ];

  const recentlySaved = [
    { id: 1, title: 'Spot 1' },
    { id: 2, title: 'Spot 2' },
    { id: 3, title: 'Spot 3' },
    { id: 4, title: 'Spot 4' },
    { id: 5, title: 'Spot 5' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-[18px]">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex justify-around" aria-label="Profile tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative py-4 text-sm font-medium
                  ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="mt-6">
          {/* What to do tab content */}
          {activeTab === 'what-to-do' && (
            <>
              <div className="flex justify-around mb-8">
                {actionButtons.map((button) => (
                  <button
                    key={button.id}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                      {button.icon}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {button.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* What to do List Items */}
              <div className="space-y-4">
                {whatToDoListItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center p-4 bg-card hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Icon</span>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <h3 className="font-medium text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>

              {/* Recently Saved Section */}
              <div className="mt-8">
                <h2 className="text-lg font-medium mb-4">Recently Saved</h2>
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4">
                    {recentlySaved.map((spot) => (
                      <div
                        key={spot.id}
                        className="flex-none w-[230px] h-[230px] rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center"
                      >
                        <span className="text-muted-foreground">{spot.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Spot Book tab content */}
          {activeTab === 'spot-book' && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search spots..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background hover:bg-accent transition-colors"
                />
              </div>

              {/* Categories List */}
              <div className="space-y-4">
                {spotCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories/${category.id}`}
                    className="flex items-center p-4 bg-card hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Icon</span>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <h3 className="font-medium text-foreground">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{category.subtitle}</p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 