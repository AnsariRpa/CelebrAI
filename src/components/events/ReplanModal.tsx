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
  Info,
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
  // Opening the replan modal without an explicit user request initializes its proposed values
  // directly from the current event's actual budget, date, guest count, and saved priorities.
  // We do NOT automatically reduce the budget or move the date.
  const baselineBudget = useMemo(() => {
    if (initialProposal) {
      return Math.max(1000, event.totalBudget + initialProposal.changesSummary.budgetDelta);
    }
    return event.totalBudget;
  }, [event.totalBudget, initialProposal]);

  const baselineDate = useMemo(() => {
    if (initialProposal) {
      const d = new Date(event.date + 'T00:00:00');
      d.setDate(d.getDate() + initialProposal.changesSummary.dateShiftDays);
      return d.toISOString().split('T')[0];
    }
    return event.date;
  }, [event.date, initialProposal]);

  const baselineGuests = useMemo(() => {
    if (initialProposal) {
      return Math.max(1, event.guestCount + (initialProposal.changesSummary.guestDelta || 0));
    }
    return event.guestCount;
  }, [event.guestCount, initialProposal]);

  const baselinePriority = useMemo(() => {
    return (
      (event.preferences?.priorityFocus as
        | 'food_guest_experience'
        | 'venue_atmosphere'
        | 'media_memories'
        | 'balanced') || 'food_guest_experience'
    );
  }, [event.preferences?.priorityFocus]);

  const [targetBudget, setTargetBudget] = useState<number>(baselineBudget);
  const [targetDate, setTargetDate] = useState<string>(baselineDate);
  const [targetGuests, setTargetGuests] = useState<number>(baselineGuests);
  const [priorityFocus, setPriorityFocus] = useState<
    'food_guest_experience' | 'venue_atmosphere' | 'media_memories' | 'balanced'
  >(baselinePriority);
  const [activeTab, setActiveTab] = useState<'categories' | 'timeline' | 'tradeoffs'>('categories');

  // Synchronize when initialProposal is supplied or modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetBudget(baselineBudget);
      setTargetDate(baselineDate);
      setTargetGuests(baselineGuests);
      setPriorityFocus(baselinePriority);
    }
  }, [isOpen, initialProposal, baselineBudget, baselineDate, baselineGuests, baselinePriority]);

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

  // Currency symbol resolution
  const currencySymbol = useMemo(() => {
    switch (event.currency?.toUpperCase()) {
      case 'USD':
      case 'CAD':
      case 'AUD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'AED':
        return 'AED ';
      case 'INR':
      default:
        return '₹';
    }
  }, [event.currency]);

  // Generate live proposal based on form parameters
  const proposal: ReplanProposal = useMemo(() => {
    const safeBudget = isNaN(targetBudget) || targetBudget <= 0 ? event.totalBudget : targetBudget;
    const safeDate = targetDate && targetDate.trim().length === 10 ? targetDate : event.date;
    const safeGuests = isNaN(targetGuests) || targetGuests < 1 ? event.guestCount : targetGuests;

    const request: ReplanRequest = {
      newTotalBudget: safeBudget,
      newDate: safeDate,
      newGuestCount: safeGuests,
      priorityFocus,
    };
    return generateReplanProposal(event, categories, expenses, tasks, vendors, request);
  }, [event, categories, expenses, tasks, vendors, targetBudget, targetDate, targetGuests, priorityFocus]);

  if (!isOpen) return null;

  const budgetDelta = proposal.changesSummary.budgetDelta;
  const dateShiftDays = proposal.changesSummary.dateShiftDays;
  const guestDelta = proposal.changesSummary.guestDelta;
  const hasModifications = budgetDelta !== 0 || dateShiftDays !== 0 || guestDelta !== 0 || priorityFocus !== (event.preferences?.priorityFocus || 'food_guest_experience');

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
                Adapt existing celebration plan for {event.name} without starting from scratch
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
          {/* Baseline State Notice */}
          {!hasModifications && (
            <div className="p-3 bg-stone-800/60 border border-stone-700/80 rounded-xl flex items-start gap-2.5 text-xs text-stone-300">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-200">Current Plan Loaded. </span>
                <span>
                  All parameters currently match your active celebration records. Enter a new budget, adjust the date, modify guests, or choose quick percentage adjustments to simulate plan revisions.
                </span>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl space-y-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-stone-400 font-medium">
              <span>Simulation Parameters</span>
              <span className="text-[11px] normal-case text-stone-500">
                Live preview: no changes saved until explicitly approved
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Target Budget */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>Revised Budget</span>
                  <span className="text-stone-400 font-mono text-[10px]">
                    Current: {formatCurrency(event.totalBudget, event.currency)}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-mono">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1000"
                    step="5000"
                    value={targetBudget}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTargetBudget(isNaN(val) ? 0 : val);
                    }}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-7 pr-3 py-2 text-xs text-stone-100 font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                {/* Dynamic Quick Adjustments */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setTargetBudget(Math.round(event.totalBudget * 0.9))}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Simulate 10% budget reduction"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetBudget(Math.round(event.totalBudget * 0.8))}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Simulate 20% budget reduction"
                  >
                    -20%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetBudget(Math.round(event.totalBudget * 1.1))}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Simulate 10% budget expansion"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetBudget(event.totalBudget)}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Reset to current budget"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>Revised Event Date</span>
                  <span className="text-stone-400 font-mono text-[10px]">Current: {event.date}</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-stone-100 font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                {/* Dynamic Date Adjustments */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(event.date + 'T00:00:00');
                      d.setDate(d.getDate() - 7);
                      setTargetDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Move date 1 week earlier"
                  >
                    -1 Wk
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(event.date + 'T00:00:00');
                      d.setDate(d.getDate() - 14);
                      setTargetDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Move date 2 weeks earlier"
                  >
                    -2 Wks
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(event.date + 'T00:00:00');
                      d.setDate(d.getDate() + 14);
                      setTargetDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Postpone date by 2 weeks"
                  >
                    +2 Wks
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDate(event.date)}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Reset to current date"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Guest Count */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>Guest Headcount</span>
                  <span className="text-stone-400 font-mono text-[10px]">Current: {event.guestCount}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={targetGuests}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTargetGuests(isNaN(val) ? 1 : val);
                    }}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-stone-100 font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                {/* Guest Quick Adjustments */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setTargetGuests(Math.max(1, Math.round(event.guestCount * 0.9)))}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Reduce guest count by 10%"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetGuests(Math.max(1, event.guestCount - 25))}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Reduce by 25 guests"
                  >
                    -25
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetGuests(event.guestCount + 25)}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Add 25 guests"
                  >
                    +25
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetGuests(event.guestCount)}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors"
                    title="Reset to current guest count"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Priority Focus */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Guiding Priority
                </label>
                <select
                  value={priorityFocus}
                  onChange={(e) =>
                    setPriorityFocus(
                      e.target.value as 'food_guest_experience' | 'venue_atmosphere' | 'media_memories' | 'balanced'
                    )
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-stone-100 focus:border-amber-400 focus:outline-hidden cursor-pointer"
                >
                  <option value="food_guest_experience">Food & Guest Experience (Protected)</option>
                  <option value="venue_atmosphere">Venue Setting & Decor (Protected)</option>
                  <option value="media_memories">Photography & Cinema (Protected)</option>
                  <option value="balanced">Balanced Proportional Scaling</option>
                </select>
                <p className="mt-1.5 text-[10px] text-stone-400 leading-tight">
                  Protected items are shielded; non-core items absorb cuts.
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
                  dateShiftDays < 0 ? 'text-amber-400' : dateShiftDays > 0 ? 'text-blue-400' : 'text-stone-200'
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
              <div className="text-[11px] text-stone-400">
                {dateShiftDays < 0 ? 'Deadlines brought forward' : 'On revised schedule'}
              </div>
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
                            ) : adj.delta < 0 ? (
                              <span className="text-[11px] text-amber-400 font-medium">
                                Trimmed
                              </span>
                            ) : adj.delta > 0 ? (
                              <span className="text-[11px] text-emerald-400 font-medium">
                                Expanded
                              </span>
                            ) : (
                              <span className="text-[11px] text-stone-400 font-medium">
                                Preserved
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
            </div>
          )}

          {/* Tab 2: Timeline Adjustments Table */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-2.5 px-3">Milestone / Task</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Current Deadline</th>
                      <th className="py-2.5 px-3">Revised Deadline</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Adjustment Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 font-mono text-stone-300">
                    {proposal.timelineAdjustments.map((adj) => {
                      const isCompleted = adj.reason.includes('already completed');
                      return (
                        <tr
                          key={adj.taskId}
                          className={`hover:bg-stone-800/40 ${isCompleted ? 'opacity-60 bg-stone-950/20' : ''}`}
                        >
                          <td className="py-2.5 px-3 font-sans font-medium text-stone-200">
                            {adj.title}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            {isCompleted ? (
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Completed (Preserved)
                              </span>
                            ) : adj.isOverdue ? (
                              <span className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Urgent Recovery
                              </span>
                            ) : adj.isCompressed ? (
                              <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                Compressed Window
                              </span>
                            ) : (
                              <span className="text-[11px] text-blue-400 font-medium">
                                On Schedule
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-stone-400">{adj.oldDueDate}</td>
                          <td className="py-2.5 px-3 font-semibold text-stone-100">
                            {adj.newDueDate}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span
                              className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                                adj.newPriority === 'urgent'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : adj.newPriority === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-stone-800 text-stone-300'
                              }`}
                            >
                              {adj.newPriority}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-stone-400 text-[11px] max-w-xs">
                            {adj.reason}
                          </td>
                        </tr>
                      );
                    })}
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
                  {proposal.tradeOffs.sacrificed.length === 0 && (
                    <li className="text-stone-400 italic">No compromises necessary under current simulation parameters.</li>
                  )}
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
