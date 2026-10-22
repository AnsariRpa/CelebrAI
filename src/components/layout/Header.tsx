/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, ChevronDown, Download, Plus, Printer, Sparkles } from 'lucide-react';
import { Event } from '../../domain/types';

interface HeaderProps {
  activeEvent: Event | null;
  events: Event[];
  onSelectEvent: (eventId: string) => void;
  onOpenWizard: () => void;
  onPrint: () => void;
  onExport: () => void;
  hasGeminiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeEvent,
  events,
  onSelectEvent,
  onOpenWizard,
  onPrint,
  onExport,
  hasGeminiKey,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#e8dfcf]">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="#overview" className="flex items-baseline gap-2.5 group">
          <span className="font-serif text-2xl font-semibold tracking-tight text-[#0f2b20]">
            CelebrAI
          </span>
          <span className="hidden sm:inline text-xs text-[#6e7d76] tracking-wider uppercase font-medium">
            Every celebration, beautifully planned
          </span>
        </a>
      </div>

      {/* Zone 2: Event Selector & Context */}
      <div className="flex items-center gap-4 shrink min-w-0">
        {events.length > 0 && activeEvent && (
          <div className="relative flex items-center">
            <label htmlFor="event-selector" className="sr-only">
              Current Celebration
            </label>
            <div className="relative">
              <select
                id="event-selector"
                value={activeEvent.id}
                onChange={(e) => onSelectEvent(e.target.value)}
                className="appearance-none pl-8 pr-8 py-1.5 text-xs sm:text-sm font-medium text-[#143c2c] bg-[#f5efe4] hover:bg-[#ede5d5] rounded-md border border-[#e2d7c3] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#143c2c] truncate max-w-[200px] sm:max-w-[320px] transition-colors"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.type})
                  </option>
                ))}
              </select>
              <Calendar className="w-3.5 h-3.5 text-[#52635b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-[#52635b] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* AI Engine Status indicator (clean unboxed text with separator) */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#52635b]" title={hasGeminiKey ? 'Gemini 3.8 Flash Active' : 'Deterministic Local Planning Engine Active'}>
          <Sparkles className={`w-3.5 h-3.5 ${hasGeminiKey ? 'text-[#bd9b46]' : 'text-[#7d8b84]'}`} />
          <span>{hasGeminiKey ? 'Gemini AI Active' : 'Local Engine Ready'}</span>
        </div>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {activeEvent && (
          <>
            <button
              onClick={onPrint}
              title="Print Run-of-Show Summary"
              className="p-2 text-xs font-medium text-[#1c4b38] hover:text-[#0f2b20] hover:bg-[#f3ede2] rounded-md transition-colors"
              aria-label="Print event summary"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onExport}
              title="Export JSON Backup"
              className="p-2 text-xs font-medium text-[#1c4b38] hover:text-[#0f2b20] hover:bg-[#f3ede2] rounded-md transition-colors"
              aria-label="Export backup"
            >
              <Download className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          onClick={onOpenWizard}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Plan Celebration</span>
        </button>
      </div>
    </header>
  );
};
