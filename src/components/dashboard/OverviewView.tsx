/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  BudgetCategory,
  BudgetMetrics,
  Event,
  ReadinessMetrics,
  SavedIdea,
  TimelineTask,
  Vendor,
} from '../../domain/types';
import { formatCurrency } from '../../domain/validation';
import { NavTab } from '../layout/Sidebar';

interface OverviewViewProps {
  event: Event | null;
  budgetMetrics: BudgetMetrics;
  readiness: ReadinessMetrics;
  tasks: TimelineTask[];
  vendors: Vendor[];
  categories: BudgetCategory[];
  ideas: SavedIdea[];
  onNavigate: (tab: NavTab) => void;
  onOpenWizard: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  event,
  budgetMetrics,
  readiness,
  tasks,
  vendors,
  categories,
  ideas,
  onNavigate,
  onOpenWizard,
}) => {
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-[#e8dfcf] max-w-xl mx-auto my-12">
        <Sparkles className="w-10 h-10 text-[#bd9b46] mb-3" />
        <h2 className="font-serif text-2xl font-semibold text-[#0f2b20]">No Celebration Selected</h2>
        <p className="text-xs text-[#52635b] mt-1.5 max-w-sm">
          Begin by planning your first wedding, birthday, anniversary, or community gathering.
        </p>
        <button
          onClick={onOpenWizard}
          className="mt-5 px-4 py-2 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md transition-colors shadow-xs"
        >
          Plan a Celebration
        </button>
      </div>
    );
  }

  const upcomingTasks = tasks
    .filter((t) => t.status !== 'completed')
    .slice(0, 4);

  const urgentTasksCount = tasks.filter(
    (t) => t.status !== 'completed' && (t.priority === 'urgent' || t.isCompressedDeadline)
  ).length;

  const bookedVendorsCount = vendors.filter((v) => v.bookingStatus === 'booked').length;

  return (
    <div className="space-y-6">
      {/* Hero Banner with Editorial Style */}
      <div className="bg-[#fcfaf6] border border-[#e8dfcf] rounded-xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            {/* Clean unboxed metadata with dot separators */}
            <div className="flex items-center gap-2 text-xs text-[#52635b] font-medium tracking-wider uppercase">
              <span>{event.type}</span>
              <span aria-hidden="true">·</span>
              <span>{event.preferences.style} Style</span>
              <span aria-hidden="true">·</span>
              <span>{event.venuePreference} venue</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0f2b20] tracking-tight">
              {event.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#384841] pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#52635b]" />
                <span>{event.date}</span>
                {event.isMultiDay && event.endDate && <span> to {event.endDate}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#52635b]" />
                <span>{event.location}</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Users className="w-3.5 h-3.5 text-[#52635b]" />
                <span>{event.guestCount} Guests</span>
              </span>
            </div>
          </div>

          {/* Days Countdown & Readiness Dial */}
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs border border-[#e8dfcf] p-4 rounded-lg shrink-0">
            <div className="text-center px-2">
              <span className="font-mono text-3xl font-bold text-[#143c2c] tabular-nums">
                {readiness.isPast ? 0 : readiness.daysRemaining}
              </span>
              <p className="text-[10px] uppercase tracking-wider text-[#6e7d76] font-medium mt-0.5">
                {readiness.isPast ? 'Celebrated' : 'Days to Go'}
              </p>
            </div>
            <div className="w-[1px] h-10 bg-[#e8dfcf]" />
            <div className="text-center px-2">
              <span className="font-mono text-3xl font-bold text-[#bd9b46] tabular-nums">
                {readiness.overallScore}%
              </span>
              <p className="text-[10px] uppercase tracking-wider text-[#6e7d76] font-medium mt-0.5">
                {readiness.label}
              </p>
            </div>
          </div>
        </div>

        {/* Urgent lead time or compressed deadline alert strip */}
        {readiness.isUrgentLeadTime && (
          <div className="mt-4 pt-3 border-t border-[#e8dfcf] flex items-center justify-between gap-3 text-xs text-[#8a5d1b] bg-[#fbf6ec] p-2.5 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#bd9b46]" />
              <span>
                <strong>Planning Window Notice:</strong> This event is {readiness.daysRemaining} days away. Urgent tasks have been compressed to protect your timeline.
              </span>
            </div>
            <button
              onClick={() => onNavigate('timeline')}
              className="text-xs font-semibold text-[#143c2c] hover:underline whitespace-nowrap"
            >
              View Urgent Tasks →
            </button>
          </div>
        )}
      </div>

      {/* 4 Core Quantitative Metrics (Tabular Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Budget */}
        <div className="bg-white border border-[#e8dfcf] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[#52635b]">
            <span>Planned Budget</span>
            <CreditCard className="w-4 h-4 text-[#7d8b84]" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-[#0f2b20] tabular-nums">
            {formatCurrency(budgetMetrics.totalBudget, event.currency)}
          </div>
          <p className="text-[11px] text-[#6e7d76] mt-1 font-mono">
            Allocated: {formatCurrency(budgetMetrics.totalAllocated, event.currency)}
          </p>
        </div>

        {/* Metric 2: Actual Spent */}
        <div className="bg-white border border-[#e8dfcf] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[#52635b]">
            <span>Recorded Expenses</span>
            <span className="font-mono text-xs text-[#52635b]">{budgetMetrics.utilizationPercent}%</span>
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-[#143c2c] tabular-nums">
            {formatCurrency(budgetMetrics.totalActual, event.currency)}
          </div>
          <p className="text-[11px] text-[#6e7d76] mt-1 font-mono">
            Paid: {formatCurrency(budgetMetrics.totalPaid, event.currency)}
          </p>
        </div>

        {/* Metric 3: Remaining Budget */}
        <div className="bg-white border border-[#e8dfcf] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[#52635b]">
            <span>Remaining Funds</span>
            {budgetMetrics.isOverspent ? (
              <span className="text-[10px] text-rose-700 font-semibold uppercase">Exceeded</span>
            ) : (
              <span className="text-[10px] text-[#1c4b38] font-semibold uppercase">On Budget</span>
            )}
          </div>
          <div
            className={`mt-2 font-mono text-xl font-bold tabular-nums ${
              budgetMetrics.isOverspent ? 'text-rose-700' : 'text-[#0f2b20]'
            }`}
          >
            {formatCurrency(budgetMetrics.remainingBudget, event.currency)}
          </div>
          <p className="text-[11px] text-[#6e7d76] mt-1">
            {budgetMetrics.isOverspent
              ? `Over by ${formatCurrency(budgetMetrics.overspentAmount, event.currency)}`
              : `Committed: ${formatCurrency(budgetMetrics.totalCommitted, event.currency)}`}
          </p>
        </div>

        {/* Metric 4: Tasks Progress */}
        <div className="bg-white border border-[#e8dfcf] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[#52635b]">
            <span>Timeline Completion</span>
            <Clock className="w-4 h-4 text-[#7d8b84]" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-[#0f2b20] tabular-nums">
            {readiness.taskReadiness}%
          </div>
          <p className="text-[11px] text-[#6e7d76] mt-1">
            {tasks.filter((t) => t.status === 'completed').length} of {tasks.length} tasks completed
          </p>
        </div>
      </div>

      {/* 2-Column Split: Tasks & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Immediate Milestones */}
        <div className="lg:col-span-2 bg-white border border-[#e8dfcf] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8dfcf] pb-3">
            <div>
              <h2 className="font-serif text-lg font-semibold text-[#0f2b20]">Upcoming Milestones</h2>
              <p className="text-xs text-[#52635b]">Date-aware tasks prioritized for your timeline</p>
            </div>
            <button
              onClick={() => onNavigate('timeline')}
              className="text-xs font-semibold text-[#143c2c] hover:underline flex items-center gap-1"
            >
              <span>View All ({tasks.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#6e7d76]">
              All tasks are completed. You're ready for celebration day!
            </div>
          ) : (
            <div className="divide-y divide-[#f2ebe0]">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#143c2c]">{task.title}</span>
                      <span className="text-[10px] text-[#7d8b84] font-medium uppercase">
                        · {task.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#52635b] line-clamp-1">{task.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono text-[#143c2c]">{task.dueDate}</span>
                    <p
                      className={`text-[10px] font-semibold uppercase ${
                        task.priority === 'urgent'
                          ? 'text-rose-700'
                          : task.priority === 'high'
                          ? 'text-[#bd9b46]'
                          : 'text-[#6e7d76]'
                      }`}
                    >
                      {task.priority}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: AI Assistant & Vendors Widget */}
        <div className="space-y-6">
          {/* AI Copilot Teaser Box */}
          <div className="bg-[#f9f5ed] border border-[#e8dfcf] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#bd9b46]" />
              <h3 className="font-serif text-base font-semibold text-[#0f2b20]">
                CelebrAI Copilot
              </h3>
            </div>
            <p className="text-xs text-[#384841] leading-relaxed">
              Ask questions about budgeting, weather contingency, vendor negotiations, or personalized dietary menus for {event.guestCount} guests.
            </p>
            <div className="space-y-1.5 pt-1">
              <button
                onClick={() => onNavigate('assistant')}
                className="w-full text-left text-xs px-2.5 py-1.5 bg-white border border-[#e2d7c3] hover:border-[#143c2c] rounded text-[#143c2c] transition-colors"
              >
                "What are my 3 most urgent tasks?" →
              </button>
              <button
                onClick={() => onNavigate('assistant')}
                className="w-full text-left text-xs px-2.5 py-1.5 bg-white border border-[#e2d7c3] hover:border-[#143c2c] rounded text-[#143c2c] transition-colors"
              >
                "How to reduce costs without hurting experience?" →
              </button>
            </div>
            <button
              onClick={() => onNavigate('assistant')}
              className="w-full mt-2 py-1.5 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md transition-colors text-center"
            >
              Open Planning Assistant
            </button>
          </div>

          {/* Vendors Snapshot */}
          <div className="bg-white border border-[#e8dfcf] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#e8dfcf] pb-2">
              <h3 className="font-serif text-base font-semibold text-[#0f2b20]">Vendors Status</h3>
              <span className="text-xs text-[#52635b] font-mono">
                {bookedVendorsCount} / {vendors.length} Booked
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {vendors.slice(0, 3).map((v) => (
                <div key={v.id} className="flex items-center justify-between py-1">
                  <span className="text-[#2d3b35] truncate max-w-[150px]">{v.name}</span>
                  <span className="text-[11px] text-[#6e7d76] uppercase tracking-wider font-medium">
                    {v.bookingStatus}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('vendors')}
              className="w-full pt-2 text-xs font-semibold text-[#143c2c] hover:underline text-center block"
            >
              Manage All Vendors & Checklists →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
