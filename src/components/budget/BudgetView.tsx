/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  Edit2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { BudgetCategory, BudgetMetrics, Event, Expense, PaymentStatus } from '../../domain/types';
import { formatCurrency, generateId, validateExpense } from '../../domain/validation';

interface BudgetViewProps {
  event: Event;
  categories: BudgetCategory[];
  expenses: Expense[];
  budgetMetrics: BudgetMetrics;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateCategory: (category: BudgetCategory) => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  event,
  categories,
  expenses,
  budgetMetrics,
  onAddExpense,
  onDeleteExpense,
  onUpdateCategory,
}) => {
  // Modal state for adding expense
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [amountPaid, setAmountPaid] = useState<number | string>('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Editing category estimate inline
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [tempEstimate, setTempEstimate] = useState<number>(0);

  // Category filter for expenses
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleOpenAdd = () => {
    setDesc('');
    setAmount('');
    setCategoryId(categories[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentStatus('paid');
    setAmountPaid('');
    setExpenseNotes('');
    setErrors({});
    setIsAddExpenseOpen(true);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateExpense({ description: desc, amount, categoryId, date });
    if (!val.isValid) {
      setErrors(val.errors);
      return;
    }

    const numAmount = Math.max(0, Number(amount));
    let numPaid = numAmount;
    if (paymentStatus === 'pending') {
      numPaid = 0;
    } else if (paymentStatus === 'partial') {
      numPaid = amountPaid ? Math.min(numAmount, Math.max(0, Number(amountPaid))) : numAmount / 2;
    }

    const targetCategory = categories.find((c) => c.id === categoryId);

    const newExpense: Expense = {
      id: generateId(),
      eventId: event.id,
      categoryId,
      categoryName: targetCategory?.name || 'General',
      description: desc.trim(),
      amount: numAmount,
      date,
      paymentStatus,
      amountPaid: numPaid,
      notes: expenseNotes.trim() || undefined,
    };

    onAddExpense(newExpense);
    setIsAddExpenseOpen(false);
  };

  const startEditCategory = (cat: BudgetCategory) => {
    setEditingCategoryId(cat.id);
    setTempEstimate(cat.estimatedAmount);
  };

  const saveEditCategory = (cat: BudgetCategory) => {
    onUpdateCategory({
      ...cat,
      estimatedAmount: Math.max(0, Number(tempEstimate)),
    });
    setEditingCategoryId(null);
  };

  const filteredExpenses =
    filterCategory === 'all'
      ? expenses
      : expenses.filter((e) => e.categoryId === filterCategory);

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0f2b20]">
            Financial Management
          </h1>
          <p className="text-xs text-[#52635b] mt-0.5">
            Transparent tracking for planned allocations, vendor commitments, and actual expenditures.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Overspending Warning Banner */}
      {budgetMetrics.isOverspent && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-medium text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Budget Limit Exceeded:</strong> Recorded expenses exceed planned budget by{' '}
              {formatCurrency(budgetMetrics.overspentAmount, event.currency)}.
            </span>
          </div>
          {budgetMetrics.costSavingSuggestions.length > 0 && (
            <div className="pl-6 text-xs text-rose-950 space-y-1">
              <p className="font-semibold text-rose-900">Recommended Cost Rebalancing Actions:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {budgetMetrics.costSavingSuggestions.map((sug, i) => (
                  <li key={i}>{sug}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quantitative Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Planned Budget</span>
          <p className="font-mono text-base font-bold text-[#0f2b20] tabular-nums mt-0.5">
            {formatCurrency(budgetMetrics.totalBudget, event.currency)}
          </p>
        </div>
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Estimated Total</span>
          <p className="font-mono text-base font-bold text-[#143c2c] tabular-nums mt-0.5">
            {formatCurrency(budgetMetrics.totalEstimated, event.currency)}
          </p>
        </div>
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Actual Expenses</span>
          <p className="font-mono text-base font-bold text-[#143c2c] tabular-nums mt-0.5">
            {formatCurrency(budgetMetrics.totalActual, event.currency)}
          </p>
        </div>
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Amount Paid</span>
          <p className="font-mono text-base font-bold text-[#2f7e5f] tabular-nums mt-0.5">
            {formatCurrency(budgetMetrics.totalPaid, event.currency)}
          </p>
        </div>
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Committed (Unpaid)</span>
          <p className="font-mono text-base font-bold text-[#bd9b46] tabular-nums mt-0.5">
            {formatCurrency(budgetMetrics.totalCommitted, event.currency)}
          </p>
        </div>
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Remaining Funds</span>
          <p
            className={`font-mono text-base font-bold tabular-nums mt-0.5 ${
              budgetMetrics.isOverspent ? 'text-rose-700' : 'text-[#0f2b20]'
            }`}
          >
            {formatCurrency(budgetMetrics.remainingBudget, event.currency)}
          </p>
        </div>
      </div>

      {/* Visual Spending Allocation Stacked Bar */}
      <div className="bg-white border border-[#e8dfcf] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <h2 className="font-serif text-base font-semibold text-[#0f2b20]">
            Category Spending Distribution
          </h2>
          <span className="font-mono text-xs text-[#52635b]">
            Utilization: {budgetMetrics.utilizationPercent}%
          </span>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="w-full h-3 bg-[#f2ebe0] rounded-full overflow-hidden flex">
          {categories.map((cat, idx) => {
            const colors = [
              'bg-[#143c2c]',
              'bg-[#2f7e5f]',
              'bg-[#bd9b46]',
              'bg-[#d6b86f]',
              'bg-[#7d8b84]',
              'bg-[#a3b3aa]',
              'bg-[#c8bfae]',
              'bg-[#8e6e30]',
            ];
            const colorClass = colors[idx % colors.length];
            return (
              <div
                key={cat.id}
                className={`${colorClass} h-full transition-all`}
                style={{ width: `${cat.allocatedPercent}%` }}
                title={`${cat.name}: ${cat.allocatedPercent}% (${formatCurrency(
                  cat.allocatedAmount,
                  event.currency
                )})`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-[#52635b]">
          {categories.map((cat) => (
            <span key={cat.id} className="flex items-center gap-1.5">
              <span className="font-medium text-[#2d3b35]">{cat.name}:</span>
              <span className="font-mono text-[#6e7d76]">{cat.allocatedPercent}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* Category Allocations & Estimates Table */}
      <div className="bg-white border border-[#e8dfcf] rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-[#fcfaf6] border-b border-[#e8dfcf] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base font-semibold text-[#0f2b20]">
              Category Allocations & Estimates
            </h2>
            <p className="text-[11px] text-[#6e7d76]">
              Compare initial blueprint targets against custom estimated costs and actual spend
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#52635b]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2f7e5f]" />
            <span>Sum perfectly normalized</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e8dfcf] text-[#6e7d76] bg-[#fbf8f3]">
                <th className="py-2.5 px-4 font-medium">Category</th>
                <th className="py-2.5 px-4 font-medium font-mono text-right">Target (%)</th>
                <th className="py-2.5 px-4 font-medium font-mono text-right">Target Amount</th>
                <th className="py-2.5 px-4 font-medium font-mono text-right">Your Estimate</th>
                <th className="py-2.5 px-4 font-medium font-mono text-right">Actual Spent</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2ebe0]">
              {categories.map((cat) => {
                const isEditing = editingCategoryId === cat.id;
                const variance = (cat.actualSpent || 0) - cat.estimatedAmount;
                const isCatOverspent = variance > 0;

                return (
                  <tr key={cat.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-[#143c2c]">{cat.name}</span>
                      {cat.notes && (
                        <p className="text-[10px] text-[#7d8b84] line-clamp-1">{cat.notes}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right text-[#52635b]">
                      {cat.allocatedPercent}%
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right text-[#143c2c]">
                      {formatCurrency(cat.allocatedAmount, event.currency)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={tempEstimate}
                          onChange={(e) => setTempEstimate(Number(e.target.value))}
                          className="w-24 px-1.5 py-0.5 text-right font-mono bg-white border border-[#143c2c] rounded focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="text-[#0f2b20] font-medium">
                          {formatCurrency(cat.estimatedAmount, event.currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right">
                      <span
                        className={
                          isCatOverspent ? 'text-rose-700 font-semibold' : 'text-[#2f7e5f]'
                        }
                      >
                        {formatCurrency(cat.actualSpent || 0, event.currency)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {isEditing ? (
                        <button
                          onClick={() => saveEditCategory(cat)}
                          className="px-2 py-0.5 text-[11px] font-medium text-white bg-[#143c2c] rounded hover:bg-[#0f2b20]"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="p-1 text-[#6e7d76] hover:text-[#0f2b20] rounded"
                          title="Edit estimate"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recorded Expenses Log */}
      <div className="bg-white border border-[#e8dfcf] rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-[#fcfaf6] border-b border-[#e8dfcf] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-base font-semibold text-[#0f2b20]">
              Recorded Expenses Log
            </h2>
            <p className="text-[11px] text-[#6e7d76]">
              Every confirmed payment and deposit logged to date
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#52635b]">Category Filter:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs py-1 px-2.5 bg-white border border-[#d8cdb8] rounded-md text-[#143c2c] focus:outline-none"
            >
              <option value="all">All Categories ({expenses.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#6e7d76] space-y-2">
            <p>No expenses recorded in this category yet.</p>
            <button
              onClick={handleOpenAdd}
              className="text-xs font-semibold text-[#143c2c] hover:underline"
            >
              + Record an Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e8dfcf] text-[#6e7d76] bg-[#fbf8f3]">
                  <th className="py-2.5 px-4 font-medium">Description</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium font-mono">Date</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium font-mono text-right">Amount</th>
                  <th className="py-2.5 px-4 font-medium text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ebe0]">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-[#143c2c]">{exp.description}</span>
                      {exp.notes && (
                        <p className="text-[10px] text-[#7d8b84] line-clamp-1">{exp.notes}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#52635b]">{exp.categoryName}</td>
                    <td className="py-2.5 px-4 font-mono text-[#52635b]">{exp.date}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-[11px] uppercase tracking-wider font-medium text-[#2d3b35]">
                        {exp.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right text-[#0f2b20] font-semibold">
                      {formatCurrency(exp.amount, event.currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-1 text-[#85968e] hover:text-rose-700 rounded transition-colors"
                        title="Delete expense entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1f16]/60 backdrop-blur-xs">
          <div className="bg-[#fdfbf7] border border-[#e8dfcf] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8f3ea] border-b border-[#e8dfcf]">
              <h3 className="font-serif text-lg font-semibold text-[#0f2b20]">
                Record New Expense
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="p-1 text-[#52635b] hover:text-[#0f2b20] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Lawn Advance Deposit"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                />
                {errors.description && (
                  <p className="text-xs text-rose-700 mt-1">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Amount ({event.currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                  {errors.amount && (
                    <p className="text-xs text-rose-700 mt-1">{errors.amount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                  {errors.date && <p className="text-xs text-rose-700 mt-1">{errors.date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  >
                    <option value="paid">Fully Paid</option>
                    <option value="partial">Partially Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {paymentStatus === 'partial' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                      Paid So Far ({event.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Receipt # / Vendor transaction ID"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8dfcf]">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#52635b] hover:bg-[#ede5d5] rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
