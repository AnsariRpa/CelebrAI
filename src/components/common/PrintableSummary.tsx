/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BudgetCategory, BudgetMetrics, Event, TimelineTask, Vendor } from '../../domain/types';
import { formatCurrency } from '../../domain/validation';

interface PrintableSummaryProps {
  event: Event;
  tasks: TimelineTask[];
  vendors: Vendor[];
  categories: BudgetCategory[];
  budgetMetrics: BudgetMetrics;
  onClose: () => void;
}

export const PrintableSummary: React.FC<PrintableSummaryProps> = ({
  event,
  tasks,
  vendors,
  categories,
  budgetMetrics,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 sm:p-12 text-black print:p-0 print:m-0">
      <div className="max-w-4xl mx-auto space-y-8 print:max-w-full">
        {/* Print Controls (Hidden when printing) */}
        <div className="no-print flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="text-xs text-gray-500">
            Printable Run-of-Show & Event Brief · Use your browser's print dialog to save as PDF
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-black rounded hover:bg-gray-800"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Close
            </button>
          </div>
        </div>

        {/* Document Header */}
        <div className="border-b-2 border-black pb-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-black">{event.name}</h1>
            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wider">
              {event.type} Plan Brief · CelebrAI
            </p>
          </div>
          <div className="text-right text-xs font-mono space-y-0.5">
            <p><strong>Date:</strong> {event.date}</p>
            <p><strong>Location:</strong> {event.location}</p>
            <p><strong>Headcount:</strong> {event.guestCount} Guests</p>
          </div>
        </div>

        {/* 1. Essential Parameters & Dietary */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="border p-3 rounded">
            <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
              Venue & Aesthetics
            </p>
            <p className="mt-1"><strong>Setting:</strong> {event.venuePreference} venue</p>
            <p><strong>Style:</strong> {event.preferences.style}</p>
            {event.preferences.themeDescription && (
              <p className="text-gray-600 mt-1 italic">"{event.preferences.themeDescription}"</p>
            )}
          </div>
          <div className="border p-3 rounded">
            <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
              Dietary & Accessibility Protocols
            </p>
            <p className="mt-1">
              <strong>Dietary Requirements:</strong>{' '}
              {event.preferences.dietaryRequirements.join(', ') || 'Standard banquet'}
            </p>
            <p>
              <strong>Accessibility Needs:</strong>{' '}
              {event.preferences.accessibilityNeeds.join(', ') || 'None specified'}
            </p>
          </div>
        </div>

        {/* 2. Financial Overview */}
        <div className="border p-4 rounded text-xs space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider">Budget Status</h2>
          <div className="grid grid-cols-4 gap-2 font-mono">
            <div>
              <span className="text-gray-500 text-[10px]">Total Budget:</span>
              <p className="font-bold">{formatCurrency(budgetMetrics.totalBudget, event.currency)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px]">Recorded Spent:</span>
              <p className="font-bold">{formatCurrency(budgetMetrics.totalActual, event.currency)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px]">Total Paid:</span>
              <p className="font-bold">{formatCurrency(budgetMetrics.totalPaid, event.currency)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px]">Remaining:</span>
              <p className="font-bold">{formatCurrency(budgetMetrics.remainingBudget, event.currency)}</p>
            </div>
          </div>
        </div>

        {/* 3. Confirmed Vendors Roster */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider">Vendor Directory & Contacts</h2>
          <table className="w-full text-left text-xs border border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 border">Service Category</th>
                <th className="p-2 border">Vendor / Partner</th>
                <th className="p-2 border">Contact Info</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border font-mono text-right">Agreed Cost</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b">
                  <td className="p-2 border font-semibold">{v.category}</td>
                  <td className="p-2 border">{v.name}</td>
                  <td className="p-2 border">{v.contactPhoneOrEmail || v.contactPerson || '—'}</td>
                  <td className="p-2 border uppercase text-[10px]">{v.bookingStatus}</td>
                  <td className="p-2 border font-mono text-right">
                    {formatCurrency(v.agreedCost || v.estimatedCost || 0, event.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Timeline Milestones & Run of Show */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider">Milestones & Run of Show</h2>
          <table className="w-full text-left text-xs border border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 border font-mono">Target Date</th>
                <th className="p-2 border">Task Milestone</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="p-2 border font-mono font-medium">{t.dueDate}</td>
                  <td className="p-2 border">
                    <span className="font-semibold">{t.title}</span>
                    {t.description && <p className="text-[10px] text-gray-600">{t.description}</p>}
                  </td>
                  <td className="p-2 border">{t.category}</td>
                  <td className="p-2 border uppercase text-[10px]">{t.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center pt-8 border-t text-[11px] text-gray-400">
          Generated with CelebrAI — Every celebration, beautifully planned.
        </div>
      </div>
    </div>
  );
};
