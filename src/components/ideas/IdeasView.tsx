/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Compass,
  Lightbulb,
  Sparkles,
  Utensils,
  Wind,
} from 'lucide-react';
import { Event, SavedIdea } from '../../domain/types';

interface IdeasViewProps {
  event: Event;
  ideas: SavedIdea[];
  onToggleSaved: (ideaId: string) => void;
  onToggleUsed: (ideaId: string) => void;
}

export const IdeasView: React.FC<IdeasViewProps> = ({
  event,
  ideas,
  onToggleSaved,
  onToggleUsed,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredIdeas =
    categoryFilter === 'all'
      ? ideas
      : ideas.filter((i) => i.category === categoryFilter);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'menu':
        return Utensils;
      case 'contingency':
        return Wind;
      case 'theme':
      case 'decor':
        return Sparkles;
      default:
        return Lightbulb;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0f2b20]">
          Personalized Curation & Concepts
        </h1>
        <p className="text-xs text-[#52635b] mt-0.5">
          Context-specific recommendations tailored to {event.name} ({event.guestCount} guests, {event.preferences.style} style).
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#f0eae1] rounded-lg max-w-fit">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            categoryFilter === 'all'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          All Concepts ({ideas.length})
        </button>
        <button
          onClick={() => setCategoryFilter('theme')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            categoryFilter === 'theme'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Theme & Scenography
        </button>
        <button
          onClick={() => setCategoryFilter('menu')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            categoryFilter === 'menu'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Menu & Dining
        </button>
        <button
          onClick={() => setCategoryFilter('contingency')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            categoryFilter === 'contingency'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Contingency
        </button>
        <button
          onClick={() => setCategoryFilter('guest_experience')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            categoryFilter === 'guest_experience'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Guest Engagement
        </button>
        <button
          onClick={() => setCategoryFilter('sustainability')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            categoryFilter === 'sustainability'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Eco-Conscious
        </button>
      </div>

      {/* Ideas Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredIdeas.map((idea) => {
          const Icon = getCategoryIcon(idea.category);

          return (
            <div
              key={idea.id}
              className={`bg-white border rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs transition-colors ${
                idea.isUsed ? 'border-[#a3b3aa] bg-[#fbfaf7]' : 'border-[#e8dfcf] hover:border-[#d8cdb8]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#f5efe4] text-[#143c2c] rounded-md shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] text-[#6e7d76] uppercase tracking-wider font-semibold">
                      {idea.category.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onToggleSaved(idea.id)}
                      className={`p-1.5 rounded transition-colors ${
                        idea.isSaved
                          ? 'text-[#bd9b46] hover:bg-[#fbf6ec]'
                          : 'text-[#a3b3aa] hover:text-[#143c2c]'
                      }`}
                      title={idea.isSaved ? 'Saved to plan' : 'Save concept'}
                    >
                      {idea.isSaved ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="font-serif text-lg font-semibold text-[#0f2b20] leading-snug">
                  {idea.title}
                </h3>

                <p className="text-xs text-[#384841] leading-relaxed">{idea.description}</p>
              </div>

              {/* Practical Tip Callout */}
              <div className="p-3 bg-[#fcfaf6] border border-[#e8dfcf] rounded-lg text-xs space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#143c2c] block">
                  Implementation Advisory:
                </span>
                <p className="text-[11px] text-[#52635b] leading-relaxed">{idea.practicalTip}</p>
              </div>

              {/* Card Footer: Used toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f2ebe0]">
                <button
                  onClick={() => onToggleUsed(idea.id)}
                  className={`text-xs flex items-center gap-1.5 transition-colors font-medium ${
                    idea.isUsed ? 'text-[#2f7e5f]' : 'text-[#6e7d76] hover:text-[#143c2c]'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${idea.isUsed ? 'text-[#2f7e5f]' : 'text-[#a3b3aa]'}`} />
                  <span>{idea.isUsed ? 'Applied to Celebration Plan' : 'Mark as Applied'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
