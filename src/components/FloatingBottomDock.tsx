import React from 'react';
import { motion } from 'motion/react';
import { Compass, Flame, Home, Plus, User } from 'lucide-react';
import type { ActiveTab } from '../types';

interface FloatingBottomDockProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenCreate: () => void;
}

export const FloatingBottomDock: React.FC<FloatingBottomDockProps> = ({
  activeTab,
  onSelectTab,
  onOpenCreate,
}) => {
  const navItems: { id: ActiveTab | 'create'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'create', label: 'Create', icon: Plus },
    { id: 'sparks', label: 'Sparks', icon: Flame },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="pointer-events-none absolute bottom-4 inset-x-4 z-40 flex justify-center"
    >
      <div className="pointer-events-auto glass-dock rounded-full px-2.5 py-2 flex items-center justify-between gap-1 w-full max-w-[368px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.id === 'create') {
            return (
              <button
                key="create"
                type="button"
                onClick={onOpenCreate}
                aria-label="Create post or story"
                className="w-12 h-12 rounded-full vibe-gradient-bg text-white flex items-center justify-center shadow-[0_0_24px_-2px_rgba(255,46,147,0.7)] hover:brightness-110 active:scale-90 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-6 h-6" strokeWidth={2.6} />
              </button>
            );
          }

          const tabId: ActiveTab = item.id;
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => onSelectTab(tabId)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative min-w-[54px] h-11 rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
            >
              {isActive && (
                <motion.span
                  layoutId="vibegram_dock_indicator"
                  transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FF6B35]/20 via-[#FF2E93]/18 to-[#7B2CBF]/22 border border-[#FF2E93]/35"
                />
              )}
              <Icon
                className={`relative z-10 w-[20px] h-[20px] transition-colors ${
                  isActive ? 'text-[#FF6B35]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              />
              <span
                className={`relative z-10 text-[10px] font-medium tracking-tight ${
                  isActive ? 'text-white' : 'text-zinc-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
