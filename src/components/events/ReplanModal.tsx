/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  History,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
  X,
} from 'lucide-react';
import {
  BudgetCategory,
  Event,
  Expense,
  ReplanProposal,
  ReplanRequest,
  TimelineTask,
  Vendor,
} from '../../domain/types';
import { formatCurrency } from '../../domain/validation';
import { generateReplanProposal } from '../../services/planning/planningEngine';

interface ReplanModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  categories: BudgetCategory[];
  expenses: Expense[];
  tasks: TimelineTask[];
  vendors: Vendor[];
  initialProposal?: ReplanProposal | null;
  onApplyProposal: (proposal: ReplanProposal) => void;
}

export const ReplanModal: React.FC<ReplanModalProps> = ({
  isOpen,
  onClose,
  event,
  categories,
  expenses,
  tasks,
  vendors,
  initialProposal,
  onApplyProposal,
}) => {
  // Compute default proposed budget and date (e.g. 15% reduction or ₹6.5L, 14 days earlier)
  const defaultBudget = useMemo(() => {
    if (initialProposal) return event.totalBudget + initialProposal.changesSummary.budgetDelta;
    return Math.round(event.totalBudget * 0.8125); // ~18.75% drop
  }, [event.totalBudget, initialProposal]);

  const defaultDate = useMemo(() => {
    if (initialProposal) {
      const d = new Date(event.date + 'T00:00:00');
      d.setDate(d.getDate() + initialProposal.changesSummary.dateShiftDays);
      return d.toISOString().split('T')[0];
    }
    const d = new Date(event.date + 'T00:00:00');
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  }, [event.date, initialProposal]);

  const [targetBudget, setTargetBudget] = useState<number>(defaultBudget);
  const [targetDate, setTargetDate] = useState<string>(defaultDate);
  const [targetGuests, setTargetGuests] = useState<number>(event.guestCount);
  const [priorityFocus, setPriorityFocus] = useState<
    'food_guest_experience' | 'venue_atmosphere' | 'media_memories' | 'balanced'
  >('food_guest_experience');
  const [activeTab, setActiveTab] = useState<'categories' | 'timeline' | 'tradeoffs'>('categories');

  // Synchronize when initialProposal is supplied or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialProposal) {
        setTargetBudget(event.totalBudget + initialProposal.changesSummary.budgetDelta);
        const d = new Date(event.date + 'T00:00:00');
        d.setDate(d.getDate() + initialProposal.changesSummary.dateShiftDays);
        setTargetDate(d.toISOString().split('T')[0]);
      } else {
        setTargetBudget(defaultBudget);
        setTargetDate(defaultDate);
      }
      setTargetGuests(event.guestCount);
      setPriorityFocus('food_guest_experience');
    }
  }, [isOpen, initialProposal, defaultBudget, defaultDate, event.totalBudget, event.date, event.guestCount]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate live proposal based on form parameters
  const proposal: ReplanProposal = useMemo(() => {
    const request: ReplanRequest = {
      newTotalBudget: targetBudget,
      newDate: targetDate,
      newGuestCount: targetGuests,
      priorityFocus,
    };
    return generateReplanProposal(event, categories, expenses, tasks, vendors, request);
  }, [event, categories, expenses, tasks, vendors, targetBudget, targetDate, targetGuests, priorityFocus]);

  if (!isOpen) return null;

  const budgetDelta = proposal.changesSummary.budgetDelta;
  const dateShiftDays = proposal.changesSummary.dateShiftDays;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="replan-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="replan-modal-title" className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                Intelligent Plan Revision Engine
              </h2>
              <p className="text-xs text-stone-400 font-normal">
                Adapt existing plan for {event.name} without starting from scratch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-stone-200">
          {/* Controls Bar */}
          <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl space-y-4">
            <div className="text-xs uppercase tracking-wider text-stone-400 font-medium">
              Simulation Parameters
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Target Budget */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>Revised Total Budget</span>
                  <span className="text-stone-400 font-mono text-[11px]">
                    Current: {formatCurrency(event.totalBudget, event.currency)}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-mono">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="10000"
                    step="10000"
                    value={targetBudget}
                    onChange={(e) => setTargetBudget(Math.max(1000, Number(e.target.value)))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-8 pr-3 py-2 text-sm text-stone-100 font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetBudget(Math.round(event.totalBudget * 0.8125))}
                    className="text-[11px] px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                  >
                    Drop to ₹6.5L (-18.8%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetBudget(Math.round(event.totalBudget * 0.85))}
                    className="text-[11px] px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                  >
                    -15%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetBudget(event.totalBudget)}
                    className="text-[11px] px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>Revised Event Date</span>
                  <span className="text-stone-400 font-mono text-[11px]">Current: {event.date}</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(event.date + 'T00:00:00');
                      d.setDate(d.getDate() - 14);
                      setTargetDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-[11px] px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                  >
                    -2 Weeks Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDate(event.date)}
                    className="text-[11px] px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Priority Focus */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Guiding Priority Protection
                </label>
                <select
                  value={priorityFocus}
                  onChange={(e) =>
                    setPriorityFocus(
                      e.target.value as 'food_guest_experience' | 'venue_atmosphere' | 'media_memories' | 'balanced'
                    )
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:border-amber-400 focus:outline-hidden cursor-pointer"
                >
                  <option value="food_guest_experience">Food Quality & Guest Experience (Protected)</option>
                  <option value="venue_atmosphere">Venue Setting & Decor (Protected)</option>
                  <option value="media_memories">Photography & Cinema (Protected)</option>
                  <option value="balanced">Balanced Proportional Allocation</option>
                </select>
                <p className="mt-1.5 text-[11px] text-stone-400 leading-tight">
                  Protected categories are shielded from budget cuts; non-core items absorb reductions.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics KPI Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl">
              <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Budget Impact
              </div>
              <div
                className={`text-base font-semibold font-mono tabular-nums ${
                  budgetDelta < 0 ? 'text-amber-400' : budgetDelta > 0 ? 'text-emerald-400' : 'text-stone-200'
                }`}
              >
                {budgetDelta === 0
                  ? 'No Change'
                  : `${budgetDelta < 0 ? '-' : '+'}${formatCurrency(Math.abs(budgetDelta), event.currency)}`}
              </div>
              <div className="text-[11px] text-stone-400">
                Target: {formatCurrency(targetBudget, event.currency)}
              </div>
            </div>

            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl">
              <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Timeline Shift
              </div>
              <div
                className={`text-base font-semibold font-mono tabular-nums ${
                  dateShiftDays < 0 ? 'text-amber-400' : 'text-stone-200'
                }`}
              >
                {dateShiftDays === 0
                  ? 'Same Date'
                  : `${Math.abs(dateShiftDays)} Days ${dateShiftDays < 0 ? 'Earlier' : 'Later'}`}
              </div>
              <div className="text-[11px] text-stone-400 font-mono">{targetDate}</div>
            </div>

            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl">
              <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Compressed Tasks
              </div>
              <div className="text-base font-semibold font-mono tabular-nums text-amber-400">
                {proposal.changesSummary.compressedTasksCount} tasks
              </div>
              <div className="text-[11px] text-stone-400">Deadlines brought forward</div>
            </div>

            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl">
              <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Preserved Records
              </div>
              <div className="text-base font-semibold font-mono tabular-nums text-emerald-400">
                100% Intact
              </div>
              <div className="text-[11px] text-stone-400">
                {proposal.preservedItems.completedTasksCount} done · {proposal.preservedItems.actualExpensesCount} paid
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-stone-800 gap-6 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`pb-2.5 font-medium transition-colors cursor-pointer ${
                activeTab === 'categories'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Category Reallocations ({proposal.categoryAdjustments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`pb-2.5 font-medium transition-colors cursor-pointer ${
                activeTab === 'timeline'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Timeline Adjustments ({proposal.timelineAdjustments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tradeoffs')}
              className={`pb-2.5 font-medium transition-colors cursor-pointer ${
                activeTab === 'tradeoffs'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Trade-offs & Preserved Assets
            </button>
          </div>

          {/* Tab 1: Category Reallocations Table */}
          {activeTab === 'categories' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Current Target</th>
                      <th className="py-2.5 px-3 text-right">Actual Spent</th>
                      <th className="py-2.5 px-3 text-right">Proposed Target</th>
                      <th className="py-2.5 px-3 text-right">Variance</th>
                      <th className="py-2.5 px-3">Strategic Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 font-mono tabular-nums">
                    {proposal.categoryAdjustments.map((adj) => {
                      const isProtected = adj.isProtected;
                      const hasSpent = adj.currentSpent > 0;
                      return (
                        <tr key={adj.categoryId} className="hover:bg-stone-800/40">
                          <td className="py-2.5 px-3 font-sans font-medium text-stone-200">
                            {adj.categoryName}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            {isProtected ? (
                              <span className="text-[11px] text-emerald-400 font-medium">
                                Protected
                              </span>
                            ) : hasSpent ? (
                              <span className="text-[11px] text-blue-400 font-medium">
                                Spent floor
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-400 font-medium">
                                Trimmed
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-stone-400">
                            {formatCurrency(adj.currentAllocated, event.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-stone-300">
                            {adj.currentSpent > 0 ? formatCurrency(adj.currentSpent, event.currency) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-stone-100">
                            {formatCurrency(adj.proposedAllocated, event.currency)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-semibold ${
                              adj.delta < 0
                                ? 'text-amber-400'
                                : adj.delta > 0
                                ? 'text-emerald-400'
                                : 'text-stone-400'
                            }`}
                          >
                            {adj.delta === 0
                              ? '0'
                              : `${adj.delta < 0 ? '-' : '+'}${formatCurrency(Math.abs(adj.delta), event.currency)}`}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-stone-300 text-[11px] max-w-xs">
                            {adj.reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-stone-400">
                Note: In strict compliance with financial safety rules, proposed target never falls below already-recorded actual expenses.
              </p>
            </div>
          )}

          {/* Tab 2: Timeline Adjustments */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-2.5 px-3">Milestone Task</th>
                      <th className="py-2.5 px-3">Original Date</th>
                      <th className="py-2.5 px-3">Revised Due Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Priority Shift</th>
                      <th className="py-2.5 px-3">Adjustment Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {proposal.timelineAdjustments.map((t) => (
                      <tr key={t.taskId} className="hover:bg-stone-800/40">
                        <td className="py-2.5 px-3 font-medium text-stone-200">{t.title}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-400">{t.oldDueDate}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-stone-100 flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{t.newDueDate}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {t.isCompressed ? (
                            <span className="text-[11px] text-amber-400 font-medium">
                              Compressed window
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400">Normal</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[11px] font-semibold uppercase ${
                              t.newPriority === 'urgent'
                                ? 'text-red-400'
                                : t.newPriority === 'high'
                                ? 'text-amber-400'
                                : 'text-stone-300'
                            }`}
                          >
                            {t.newPriority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-300 text-[11px] max-w-xs">{t.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Trade-offs & Preserved Assets */}
          {activeTab === 'tradeoffs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Protected & Gained */}
              <div className="p-4 bg-stone-900/80 border border-emerald-500/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  What is Protected & Gained
                </div>
                <ul className="space-y-2 text-xs text-stone-300">
                  {proposal.tradeOffs.gained.map((g, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sacrificed & Streamlined */}
              <div className="p-4 bg-stone-900/80 border border-amber-500/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                  <TrendingDown className="w-4 h-4" />
                  Strategic Reductions & Compromises
                </div>
                <ul className="space-y-2 text-xs text-stone-300">
                  {proposal.tradeOffs.sacrificed.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preserved Data Integrity Guarantee */}
              <div className="md:col-span-2 p-4 bg-stone-950/60 border border-stone-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-stone-200 font-medium text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Data Integrity Guarantee</span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  CelebrAI never wipes your existing event records. Applying this proposal updates the event date and budget targets, recalibrates pending category targets, shifts unfinished milestone deadlines, and preserves all {proposal.preservedItems.completedTasksCount} completed tasks, {proposal.preservedItems.actualExpensesCount} verified expenses, and {proposal.preservedItems.bookedVendorsCount} vendor contracts without data loss.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-800 flex items-center justify-between bg-stone-900/95 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onApplyProposal(proposal);
                onClose();
              }}
              className="px-5 py-2.5 text-sm font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Revised Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
