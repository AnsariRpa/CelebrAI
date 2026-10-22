/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, EventExportData, EventType } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateEventBasics(data: {
  name: string;
  type: string;
  date: string;
  location: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Celebration name is required.';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Celebration name must not exceed 100 characters.';
  }

  const validTypes: EventType[] = ['wedding', 'birthday', 'anniversary', 'community', 'other'];
  if (!data.type || !validTypes.includes(data.type as EventType)) {
    errors.type = 'Please select a valid celebration type.';
  }

  if (!data.date) {
    errors.date = 'Event date is required.';
  } else {
    const timestamp = Date.parse(data.date);
    if (isNaN(timestamp)) {
      errors.date = 'Please provide a valid calendar date.';
    }
  }

  if (!data.location || data.location.trim().length === 0) {
    errors.location = 'City or location is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateEventBudgetAndGuests(data: {
  guestCount: number | string;
  totalBudget: number | string;
  currency: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const guests = typeof data.guestCount === 'string' ? parseInt(data.guestCount, 10) : data.guestCount;
  if (isNaN(guests) || guests < 0) {
    errors.guestCount = 'Guest count must be a non-negative number.';
  } else if (guests > 100000) {
    errors.guestCount = 'Guest count cannot exceed 100,000.';
  }

  const budget = typeof data.totalBudget === 'string' ? parseFloat(data.totalBudget) : data.totalBudget;
  if (isNaN(budget) || budget <= 0) {
    errors.totalBudget = 'Total budget must be a positive number.';
  } else if (!isFinite(budget)) {
    errors.totalBudget = 'Please enter a valid numeric budget.';
  }

  if (!data.currency || data.currency.trim().length === 0) {
    errors.currency = 'Currency selection is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateExpense(data: {
  description: string;
  amount: number | string;
  categoryId: string;
  date: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Expense description is required.';
  }

  const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
  if (isNaN(amount) || amount <= 0) {
    errors.amount = 'Expense amount must be greater than zero.';
  }

  if (!data.categoryId) {
    errors.categoryId = 'Please select a valid budget category.';
  }

  if (!data.date) {
    errors.date = 'Expense date is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateVendor(data: {
  name: string;
  category: string;
  estimatedCost?: number | string;
  agreedCost?: number | string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Vendor name or service is required.';
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.category = 'Vendor category is required.';
  }

  if (data.estimatedCost !== undefined && data.estimatedCost !== '') {
    const est = typeof data.estimatedCost === 'string' ? parseFloat(data.estimatedCost) : data.estimatedCost;
    if (isNaN(est) || est < 0) {
      errors.estimatedCost = 'Estimated cost must be non-negative.';
    }
  }

  if (data.agreedCost !== undefined && data.agreedCost !== '') {
    const agreed = typeof data.agreedCost === 'string' ? parseFloat(data.agreedCost) : data.agreedCost;
    if (isNaN(agreed) || agreed < 0) {
      errors.agreedCost = 'Agreed cost must be non-negative.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateImportedData(raw: unknown): { isValid: boolean; error?: string; data?: EventExportData } {
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, error: 'Uploaded file is not a valid JSON object.' };
  }

  const candidate = raw as Partial<EventExportData>;

  if (!candidate.event || typeof candidate.event !== 'object') {
    return { isValid: false, error: 'Backup is missing event header information.' };
  }

  const event = candidate.event as Partial<Event>;
  if (!event.id || !event.name || !event.type || !event.date) {
    return { isValid: false, error: 'Invalid event definition inside backup file.' };
  }

  if (!Array.isArray(candidate.categories) || !Array.isArray(candidate.tasks)) {
    return { isValid: false, error: 'Backup file is missing required categories or timeline tasks.' };
  }

  return {
    isValid: true,
    data: candidate as EventExportData,
  };
}

/**
 * Currency formatter with locale and symbol precision
 */
export function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  if (isNaN(amount) || !isFinite(amount)) return `${currencyCode} 0`;
  
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
    AED: 'AED ',
  };

  const symbol = symbols[currencyCode] || `${currencyCode} `;
  
  // Format with commas according to Indian or International numbering
  if (currencyCode === 'INR') {
    return `${symbol}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
  }

  return `${symbol}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
}

/**
 * Generate standard UUID v4
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'uuid-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}
