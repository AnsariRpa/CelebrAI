/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  Clock,
  Compass,
  CreditCard,
  FolderHeart,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'overview' | 'events' | 'budget' | 'timeline' | 'vendors' | 'ideas' | 'assistant';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingTasksCount: number;
  unbookedVendorsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingTasksCount,
  unbookedVendorsCount,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'events', label: 'My Events', icon: FolderHeart },
    { id: 'budget', label: 'Budget & Expenses', icon: CreditCard },
    { id: 'timeline', label: 'Timeline & Tasks', icon: Clock, badge: pendingTasksCount },
    { id: 'vendors', label: 'Vendors & Checklist', icon: CheckSquare, badge: unbookedVendorsCount },
    { id: 'ideas', label: 'Personalized Ideas', icon: Compass },
    { id: 'assistant', label: 'AI Copilot', icon: Sparkles },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#fbf8f3] border-r border-[#e8dfcf] min-h-[calc(100vh-57px)] p-4 shrink-0">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#143c2c] text-white shadow-xs'
                    : 'text-[#384841] hover:text-[#0f2b20] hover:bg-[#ede5d5]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#e8d3a1]' : 'text-[#61746b]'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-[#0f2b20] text-[#e8d3a1]' : 'bg-[#e2d7c3] text-[#143c2c]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quiet footer with local assurance */}
        <div className="mt-auto pt-6 border-t border-[#e8dfcf] text-[11px] text-[#6e7d76] space-y-1.5">
          <p className="font-medium text-[#1c4b38]">Account-Free Privacy</p>
          <p className="leading-relaxed">
            Data is securely persisted in your browser's private local storage. No tracking or telemetry.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom / Compact Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fdfbf7]/95 backdrop-blur-md border-t border-[#e8dfcf] px-2 py-1.5 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#143c2c]' : 'text-[#61746b] hover:text-[#0f2b20]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#143c2c]' : 'text-[#85968e]'}`} />
              <span className="truncate max-w-[60px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        {/* Direct quick jump to AI Copilot */}
        <button
          onClick={() => onSelectTab('assistant')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium transition-colors ${
            currentTab === 'assistant' ? 'text-[#bd9b46]' : 'text-[#61746b]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#bd9b46]" />
          <span>AI</span>
        </button>
      </nav>
    </>
  );
};
