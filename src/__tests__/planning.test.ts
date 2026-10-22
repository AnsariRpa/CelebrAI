/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  BudgetCategory,
  Event,
  Expense,
  TimelineTask,
  Vendor,
} from '../domain/types';
import {
  formatCurrency,
  validateEventBasics,
  validateEventBudgetAndGuests,
  validateExpense,
  validateImportedData,
  validateVendor,
} from '../domain/validation';
import {
  calculateBudgetMetrics,
  calculateReadinessScore,
  generateBudgetAllocation,
  generateLocalAssistantResponse,
  generatePersonalizedIdeas,
  generateTimeline,
  generateVendorChecklist,
} from '../services/planning/planningEngine';

const mockWeddingEvent: Event = {
  id: 'test-wedding-1',
  name: 'Maya & Aarav Wedding',
  type: 'wedding',
  date: '2026-12-15',
  location: 'Goa',
  venuePreference: 'outdoor',
  guestCount: 150,
  totalBudget: 1000000,
  currency: 'INR',
  flexibility: 'moderate',
  planningStage: 'Vendors',
  preferences: {
    style: 'elegant',
    dietaryRequirements: ['Vegetarian', 'Gluten-Free'],
    accessibilityNeeds: ['Step-free access'],
    mustHaveActivities: ['Beach sunset ceremony'],
  },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('Intelligent Planning Engine — Budget Allocations', () => {
  it('allocates budget so categories sum exactly to totalBudget without rounding drift', () => {
    const testBudgets = [1000000, 754321, 50000, 333333, 999999];

    for (const budget of testBudgets) {
      const event: Event = { ...mockWeddingEvent, totalBudget: budget };
      const categories = generateBudgetAllocation(event);

      const sum = categories.reduce((acc, cat) => acc + cat.allocatedAmount, 0);
      expect(sum).toBe(budget);
    }
  });

  it('handles edge case of zero budget gracefully', () => {
    const event: Event = { ...mockWeddingEvent, totalBudget: 0 };
    const categories = generateBudgetAllocation(event);
    const sum = categories.reduce((acc, cat) => acc + cat.allocatedAmount, 0);

    expect(sum).toBe(0);
    expect(categories.length).toBeGreaterThan(0);
  });

  it('provides different blueprints for wedding, birthday, and community event', () => {
    const weddingCats = generateBudgetAllocation({ ...mockWeddingEvent, type: 'wedding' });
    const birthdayCats = generateBudgetAllocation({ ...mockWeddingEvent, type: 'birthday' });
    const communityCats = generateBudgetAllocation({ ...mockWeddingEvent, type: 'community' });

    expect(weddingCats.some((c) => c.name.toLowerCase().includes('attire'))).toBe(true);
    expect(birthdayCats.some((c) => c.name.toLowerCase().includes('cake'))).toBe(true);
    expect(communityCats.some((c) => c.name.toLowerCase().includes('permits'))).toBe(true);
  });
});

describe('Budget Metrics & Overspending Calculations', () => {
  const categories: BudgetCategory[] = [
    {
      id: 'cat-1',
      eventId: 'evt-1',
      name: 'Venue',
      allocatedPercent: 40,
      allocatedAmount: 400000,
      estimatedAmount: 400000,
      actualSpent: 250000,
    },
    {
      id: 'cat-2',
      eventId: 'evt-1',
      name: 'Catering',
      allocatedPercent: 60,
      allocatedAmount: 600000,
      estimatedAmount: 600000,
      actualSpent: 100000,
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      eventId: 'evt-1',
      categoryId: 'cat-1',
      categoryName: 'Venue',
      description: 'Lawn advance',
      amount: 250000,
      amountPaid: 250000,
      paymentStatus: 'paid',
      date: '2026-10-15',
    },
    {
      id: 'exp-2',
      eventId: 'evt-1',
      categoryId: 'cat-2',
      categoryName: 'Catering',
      description: 'Tasting fee',
      amount: 100000,
      amountPaid: 50000,
      paymentStatus: 'partial',
      date: '2026-10-20',
    },
  ];

  const vendors: Vendor[] = [
    {
      id: 'ven-1',
      eventId: 'evt-1',
      name: 'Resort Lawn',
      category: 'Venue',
      estimatedCost: 400000,
      agreedCost: 380000,
      amountPaid: 250000,
      bookingStatus: 'booked',
      paymentStatus: 'partial',
    },
  ];

  it('calculates remaining budget and paid amounts correctly', () => {
    const totalBudget = 1000000;
    const metrics = calculateBudgetMetrics(totalBudget, categories, expenses, vendors);

    expect(metrics.totalActual).toBe(350000);
    expect(metrics.totalPaid).toBe(300000);
    expect(metrics.remainingBudget).toBe(650000);
    expect(metrics.utilizationPercent).toBe(35);
    expect(metrics.isOverspent).toBe(false);
    expect(metrics.totalCommitted).toBe(130000); // 380000 - 250000
  });

  it('detects overspending and generates respectful recommendations', () => {
    const overspentExpenses: Expense[] = [
      ...expenses,
      {
        id: 'exp-3',
        eventId: 'evt-1',
        categoryId: 'cat-1',
        categoryName: 'Venue',
        description: 'Extra lighting surcharge',
        amount: 800000,
        amountPaid: 800000,
        paymentStatus: 'paid',
        date: '2026-10-22',
      },
    ];

    const totalBudget = 1000000;
    const metrics = calculateBudgetMetrics(totalBudget, categories, overspentExpenses, vendors);

    expect(metrics.totalActual).toBe(1150000);
    expect(metrics.isOverspent).toBe(true);
    expect(metrics.overspentAmount).toBe(150000);
    expect(metrics.costSavingSuggestions.length).toBeGreaterThan(0);
    // Protects safety and accessibility
    expect(metrics.costSavingSuggestions.some((s) => s.includes('accessibility'))).toBe(true);
  });
});

describe('Dynamic Timeline & Compressed Lead Times', () => {
  it('generates chronological date-aware tasks with realistic due dates', () => {
    const refDate = new Date('2026-06-01T00:00:00');
    const tasks = generateTimeline(mockWeddingEvent, refDate);

    expect(tasks.length).toBeGreaterThan(5);
    // Due dates must not exceed event date
    tasks.forEach((task) => {
      expect(task.dueDate <= mockWeddingEvent.date).toBe(true);
    });
  });

  it('flags compressed deadlines and compresses task dates when event is in less than 30 days', () => {
    const refDate = new Date('2026-12-05T00:00:00'); // 10 days before 2026-12-15
    const tasks = generateTimeline(mockWeddingEvent, refDate);

    const compressed = tasks.filter((t) => t.isCompressedDeadline);
    expect(compressed.length).toBeGreaterThan(0);

    // No tasks should be scheduled in the past relative to refDate
    const refDateStr = '2026-12-05';
    tasks.forEach((t) => {
      expect(t.dueDate >= refDateStr).toBe(true);
    });
  });

  it('handles past event dates safely without crashing', () => {
    const refDate = new Date('2027-01-01T00:00:00'); // Event in the past
    const tasks = generateTimeline(mockWeddingEvent, refDate);

    expect(tasks.length).toBeGreaterThan(0);
    tasks.forEach((t) => {
      expect(t.dueDate).toBe(mockWeddingEvent.date);
    });
  });
});

describe('Vendor and Operational Checklist Generation', () => {
  it('creates event-specific vendors and verification checklist', () => {
    const { vendors, checklist } = generateVendorChecklist(mockWeddingEvent);

    expect(vendors.length).toBeGreaterThan(3);
    expect(checklist.length).toBeGreaterThan(2);

    // Must include verification advice
    expect(checklist.some((c) => c.title.toLowerCase().includes('verify'))).toBe(true);
  });
});

describe('Personalized Ideas & Dietary Curation', () => {
  it('incorporates stated dietary requirements into catering ideas', () => {
    const ideas = generatePersonalizedIdeas(mockWeddingEvent);

    const menuIdea = ideas.find((i) => i.category === 'menu');
    expect(menuIdea).toBeDefined();
    expect(menuIdea?.description).toContain('Vegetarian');
    expect(menuIdea?.description).toContain('Gluten-Free');
  });

  it('includes rain contingency for outdoor or mixed venues', () => {
    const outdoorIdeas = generatePersonalizedIdeas({ ...mockWeddingEvent, venuePreference: 'outdoor' });
    expect(outdoorIdeas.some((i) => i.category === 'contingency')).toBe(true);

    const indoorIdeas = generatePersonalizedIdeas({ ...mockWeddingEvent, venuePreference: 'indoor' });
    expect(indoorIdeas.some((i) => i.category === 'contingency')).toBe(false);
  });
});

describe('Readiness Score Metric Calculation', () => {
  it('calculates readiness score between 0 and 100', () => {
    const tasks: TimelineTask[] = [
      { id: '1', eventId: 'e', title: 'A', description: '', dueDate: '2026-12-01', priority: 'high', status: 'completed', category: 'Venue' },
      { id: '2', eventId: 'e', title: 'B', description: '', dueDate: '2026-12-05', priority: 'urgent', status: 'not_started', category: 'Catering' },
    ];
    const vendors: Vendor[] = [
      { id: '1', eventId: 'e', name: 'Lawn', category: 'Venue', estimatedCost: 100, agreedCost: 100, amountPaid: 100, bookingStatus: 'booked', paymentStatus: 'paid' },
    ];
    const budgetMetrics = calculateBudgetMetrics(100000, [], [], vendors);

    const readiness = calculateReadinessScore(mockWeddingEvent, tasks, vendors, budgetMetrics);
    expect(readiness.overallScore).toBeGreaterThanOrEqual(0);
    expect(readiness.overallScore).toBeLessThanOrEqual(100);
    expect(readiness.label).toBeDefined();
  });
});

describe('Input Validation & Malformed Data Handling', () => {
  it('validates event basics correctly', () => {
    const valid = validateEventBasics({
      name: 'Rohan Birthday',
      type: 'birthday',
      date: '2026-11-20',
      location: 'Delhi',
    });
    expect(valid.isValid).toBe(true);

    const invalid = validateEventBasics({
      name: '',
      type: 'invalid-type',
      date: 'not-a-date',
      location: '',
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.name).toBeDefined();
    expect(invalid.errors.type).toBeDefined();
    expect(invalid.errors.date).toBeDefined();
    expect(invalid.errors.location).toBeDefined();
  });

  it('validates budget and guest edge cases (zero/negative numbers)', () => {
    const invalidGuests = validateEventBudgetAndGuests({
      guestCount: -5,
      totalBudget: 50000,
      currency: 'INR',
    });
    expect(invalidGuests.isValid).toBe(false);

    const invalidBudget = validateEventBudgetAndGuests({
      guestCount: 100,
      totalBudget: 0,
      currency: 'INR',
    });
    expect(invalidBudget.isValid).toBe(false);
  });

  it('validates imported JSON data and rejects malformed objects', () => {
    const nullCheck = validateImportedData(null);
    expect(nullCheck.isValid).toBe(false);

    const corruptJson = validateImportedData({ random: 123 });
    expect(corruptJson.isValid).toBe(false);

    const validStructure = validateImportedData({
      event: mockWeddingEvent,
      categories: [],
      tasks: [],
    });
    expect(validStructure.isValid).toBe(true);
  });
});

describe('Local Planning Engine Fallback Assistant', () => {
  it('answers urgent tasks question with context from existing tasks', () => {
    const tasks: TimelineTask[] = [
      { id: '1', eventId: 'e', title: 'Book Venue Lawn', description: 'Confirm hall', dueDate: '2026-11-01', priority: 'urgent', status: 'not_started', category: 'Venue' },
    ];
    const budgetMetrics = calculateBudgetMetrics(100000, [], [], []);

    const response = generateLocalAssistantResponse('What are my most urgent tasks?', mockWeddingEvent, tasks, [], budgetMetrics);
    expect(response.text).toContain('Book Venue Lawn');
    expect(response.suggestions.length).toBeGreaterThan(0);
  });

  it('answers rain contingency query for outdoor venue', () => {
    const budgetMetrics = calculateBudgetMetrics(100000, [], [], []);
    const response = generateLocalAssistantResponse('Give me a rain contingency plan', mockWeddingEvent, [], [], budgetMetrics);

    expect(response.text.toLowerCase()).toContain('tent');
    expect(response.text.toLowerCase()).toContain('weather');
  });

  it('formats currency correctly for INR and USD', () => {
    expect(formatCurrency(100000, 'INR')).toBe('₹1,00,000');
    expect(formatCurrency(5000, 'USD')).toBe('$5,000');
  });
});
