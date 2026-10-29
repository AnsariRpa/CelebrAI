/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  BudgetCategory,
  Event,
  Expense,
  ReplanProposal,
  TimelineTask,
  Vendor,
  VendorQuote,
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
  applyReplanProposal,
  calculateBudgetMetrics,
  calculateReadinessScore,
  checkTaskDependencies,
  compareVendorQuotes,
  generateBudgetAllocation,
  generateLocalAssistantResponse,
  generatePersonalizedIdeas,
  generateReplanProposal,
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

  it('formats currency correctly for INR, USD, EUR, GBP, CAD, AUD, AED', () => {
    expect(formatCurrency(100000, 'INR')).toBe('₹1,00,000');
    expect(formatCurrency(5000, 'USD')).toBe('$5,000');
    expect(formatCurrency(2500, 'EUR')).toBe('€2,500');
    expect(formatCurrency(1800, 'GBP')).toBe('£1,800');
    expect(formatCurrency(3200, 'CAD')).toBe('CA$3,200');
    expect(formatCurrency(4100, 'AUD')).toBe('A$4,100');
    expect(formatCurrency(15000, 'AED')).toBe('AED 15,000');
  });

  it('answers cost reduction queries while protecting safety and accessibility', () => {
    const budgetMetrics = calculateBudgetMetrics(100000, [], [], []);
    const response = generateLocalAssistantResponse('How can I reduce costs without compromising guest experience?', mockWeddingEvent, [], [], budgetMetrics);

    expect(response.text.toLowerCase()).toContain('cost');
    expect(response.text.toLowerCase()).toContain('accessibility');
  });

  it('answers vendor status query correctly', () => {
    const vendors: Vendor[] = [
      { id: 'v1', eventId: 'e', name: 'Grand Ballroom', category: 'Venue', estimatedCost: 50000, agreedCost: 50000, amountPaid: 25000, bookingStatus: 'booked', paymentStatus: 'partial' },
      { id: 'v2', eventId: 'e', name: 'Master Chef Catering', category: 'Catering', estimatedCost: 30000, agreedCost: 0, amountPaid: 0, bookingStatus: 'negotiating', paymentStatus: 'pending' },
    ];
    const budgetMetrics = calculateBudgetMetrics(100000, [], [], vendors);
    const response = generateLocalAssistantResponse('What vendors do I still need to book?', mockWeddingEvent, [], vendors, budgetMetrics);

    expect(response.text).toContain('Grand Ballroom');
    expect(response.text).toContain('Master Chef Catering');
  });
});

describe('Extended Domain Validation & Specialized Timelines', () => {
  it('validates expense creation boundaries', () => {
    const invalidAmount = validateExpense({
      description: 'Lawn fee',
      amount: -100,
      categoryId: 'cat-1',
      date: '2026-11-01',
    });
    expect(invalidAmount.isValid).toBe(false);
    expect(invalidAmount.errors.amount).toBeDefined();

    const missingDesc = validateExpense({
      description: '',
      amount: 500,
      categoryId: 'cat-1',
      date: '2026-11-01',
    });
    expect(missingDesc.isValid).toBe(false);
    expect(missingDesc.errors.description).toBeDefined();
  });

  it('validates vendor creation boundaries', () => {
    const emptyName = validateVendor({
      name: '',
      category: 'Venue',
    });
    expect(emptyName.isValid).toBe(false);
    expect(emptyName.errors.name).toBeDefined();

    const negativeAgreed = validateVendor({
      name: 'Studio',
      category: 'Media',
      agreedCost: -500,
    });
    expect(negativeAgreed.isValid).toBe(false);
    expect(negativeAgreed.errors.agreedCost).toBeDefined();
  });

  it('generates birthday-specific tasks including cake order', () => {
    const bdayEvent: Event = {
      ...mockWeddingEvent,
      type: 'birthday',
      name: 'Rohan 10th Birthday',
    };
    const tasks = generateTimeline(bdayEvent);
    expect(tasks.some((t) => t.title.toLowerCase().includes('cake'))).toBe(true);
  });

  it('generates community-specific tasks including municipal permits and volunteer safety', () => {
    const commEvent: Event = {
      ...mockWeddingEvent,
      type: 'community',
      name: 'Neighborhood Spring Festival',
    };
    const tasks = generateTimeline(commEvent);
    expect(tasks.some((t) => t.title.toLowerCase().includes('permit'))).toBe(true);
    expect(tasks.some((t) => t.title.toLowerCase().includes('safety'))).toBe(true);
  });

  it('calculates celebration ready status when tasks and vendors are completed', () => {
    const allDoneTasks: TimelineTask[] = [
      { id: '1', eventId: 'e', title: 'Task 1', description: '', dueDate: '2026-12-01', priority: 'medium', status: 'completed', category: 'General' },
      { id: '2', eventId: 'e', title: 'Task 2', description: '', dueDate: '2026-12-02', priority: 'high', status: 'completed', category: 'General' },
    ];
    const allBookedVendors: Vendor[] = [
      { id: '1', eventId: 'e', name: 'Vendor 1', category: 'General', estimatedCost: 1000, agreedCost: 1000, amountPaid: 1000, bookingStatus: 'booked', paymentStatus: 'paid' },
    ];
    const budgetMetrics = calculateBudgetMetrics(10000, [], [], allBookedVendors);

    const readiness = calculateReadinessScore(mockWeddingEvent, allDoneTasks, allBookedVendors, budgetMetrics);
    expect(readiness.overallScore).toBeGreaterThanOrEqual(90);
    expect(readiness.label).toBe('Celebration Ready');
  });
});

describe('Challenge Benchmark: Intelligent Replanning Engine', () => {
  // Scenario: An existing wedding event with budget ₹8,00,000, 150 guests, target date in ~4 months
  const baseEvent: Event = {
    id: 'benchmark-wedding-01',
    name: 'Priya & Rohan Wedding',
    type: 'wedding',
    date: '2026-12-20',
    location: 'Jaipur',
    venuePreference: 'mixed',
    guestCount: 150,
    totalBudget: 800000,
    currency: 'INR',
    flexibility: 'moderate',
    planningStage: 'Vendors',
    preferences: {
      style: 'traditional',
      dietaryRequirements: ['Vegetarian', 'Jain'],
      accessibilityNeeds: ['Wheelchair access'],
      priorityFocus: 'food_guest_experience',
    },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  const initialCategories: BudgetCategory[] = [
    {
      id: 'cat-venue',
      eventId: baseEvent.id,
      name: 'Venue & Logistics',
      allocatedPercent: 30,
      allocatedAmount: 240000,
      estimatedAmount: 240000,
      actualSpent: 120000, // advance deposit paid
    },
    {
      id: 'cat-catering',
      eventId: baseEvent.id,
      name: 'Catering & Beverages',
      allocatedPercent: 35,
      allocatedAmount: 280000,
      estimatedAmount: 280000,
      actualSpent: 0,
    },
    {
      id: 'cat-decor',
      eventId: baseEvent.id,
      name: 'Decor & Florals',
      allocatedPercent: 15,
      allocatedAmount: 120000,
      estimatedAmount: 120000,
      actualSpent: 0,
    },
    {
      id: 'cat-invites',
      eventId: baseEvent.id,
      name: 'Invitations & Stationery',
      allocatedPercent: 5,
      allocatedAmount: 40000,
      estimatedAmount: 40000,
      actualSpent: 0,
    },
    {
      id: 'cat-contingency',
      eventId: baseEvent.id,
      name: 'Contingency & Reserve',
      allocatedPercent: 15,
      allocatedAmount: 120000,
      estimatedAmount: 120000,
      actualSpent: 0,
    },
  ];

  const initialExpenses: Expense[] = [
    {
      id: 'exp-venue-dep',
      eventId: baseEvent.id,
      categoryId: 'cat-venue',
      categoryName: 'Venue & Logistics',
      description: 'Lawn advance booking',
      amount: 120000,
      amountPaid: 120000,
      paymentStatus: 'paid',
      date: '2026-08-15',
    },
  ];

  const initialTasks: TimelineTask[] = [
    {
      id: 'task-1',
      eventId: baseEvent.id,
      title: 'Finalize Guest List & Target Numbers',
      dueDate: '2026-08-15',
      priority: 'high',
      status: 'completed', // completed task
      category: 'Coordination',
    },
    {
      id: 'task-2',
      eventId: baseEvent.id,
      title: 'Confirm & Book Celebration Venue',
      dueDate: '2026-08-30',
      priority: 'urgent',
      status: 'completed', // completed task
      category: 'Venue',
    },
    {
      id: 'task-3',
      eventId: baseEvent.id,
      title: 'Catering Menu & Tasting Selection',
      dueDate: '2026-11-15',
      priority: 'high',
      status: 'not_started',
      category: 'Catering',
      dependsOnTaskId: 'task-2',
    },
    {
      id: 'task-4',
      eventId: baseEvent.id,
      title: 'Finalize Florals & Stage Decor',
      dueDate: '2026-11-30',
      priority: 'medium',
      status: 'not_started',
      category: 'Decor',
    },
  ];

  const initialVendors: Vendor[] = [
    {
      id: 'v-venue',
      eventId: baseEvent.id,
      name: 'Heritage Haveli Grounds',
      category: 'Venue & Logistics',
      estimatedCost: 240000,
      agreedCost: 220000,
      amountPaid: 120000,
      bookingStatus: 'booked',
      paymentStatus: 'partial',
    },
  ];

  it('generates an intelligent revision when budget drops to ₹6,50,000 and date moves 2 weeks earlier', () => {
    // Two weeks earlier than 2026-12-20 is 2026-12-06
    const proposal = generateReplanProposal(
      baseEvent,
      initialCategories,
      initialExpenses,
      initialTasks,
      initialVendors,
      {
        newTotalBudget: 650000,
        newDate: '2026-12-06',
        priorityFocus: 'food_guest_experience',
      }
    );

    // 1. Budget and timeline changes summary
    expect(proposal.changesSummary.budgetDelta).toBe(-150000);
    expect(proposal.changesSummary.dateShiftDays).toBe(-14);
    expect(proposal.preservedItems.completedTasksCount).toBe(2);
    expect(proposal.preservedItems.actualExpensesCount).toBe(1);
    expect(proposal.preservedItems.bookedVendorsCount).toBe(1);

    // 2. Proposed category amounts must sum exactly to new budget (650000)
    const proposedSum = proposal.categoryAdjustments.reduce(
      (sum, adj) => sum + adj.proposedAllocated,
      0
    );
    expect(proposedSum).toBe(650000);

    // 3. Catering & food should be protected and not reduced
    const cateringAdj = proposal.categoryAdjustments.find((a) =>
      a.categoryName.includes('Catering')
    );
    expect(cateringAdj).toBeDefined();
    expect(cateringAdj!.isProtected).toBe(true);
    expect(cateringAdj!.proposedAllocated).toBeGreaterThanOrEqual(cateringAdj!.currentAllocated);

    // 4. Proposed allocated amounts must never drop below actualSpent (venue actual spent: 120000)
    const venueAdj = proposal.categoryAdjustments.find((a) =>
      a.categoryName.includes('Venue')
    );
    expect(venueAdj).toBeDefined();
    expect(venueAdj!.proposedAllocated).toBeGreaterThanOrEqual(120000);

    // 5. Non-core categories absorb the reductions
    const decorAdj = proposal.categoryAdjustments.find((a) =>
      a.categoryName.includes('Decor')
    );
    expect(decorAdj).toBeDefined();
    expect(decorAdj!.proposedAllocated).toBeLessThan(decorAdj!.currentAllocated);

    // 6. Completed tasks are preserved with unchanged due dates and explicit preservation reason
    const task1Adj = proposal.timelineAdjustments.find((t) => t.taskId === 'task-1');
    const task2Adj = proposal.timelineAdjustments.find((t) => t.taskId === 'task-2');
    expect(task1Adj?.newDueDate).toBe(task1Adj?.oldDueDate);
    expect(task1Adj?.reason).toContain('Preserved');
    expect(task2Adj?.newDueDate).toBe(task2Adj?.oldDueDate);
    expect(task2Adj?.reason).toContain('Preserved');

    // 7. Unfinished tasks are shifted forward with compression
    const task3Adj = proposal.timelineAdjustments.find((t) => t.taskId === 'task-3');
    expect(task3Adj).toBeDefined();
    expect(task3Adj!.newDueDate < task3Adj!.oldDueDate).toBe(true);
  });

  it('applies the replan proposal without losing completed tasks or recorded expenses', () => {
    const proposal = generateReplanProposal(
      baseEvent,
      initialCategories,
      initialExpenses,
      initialTasks,
      initialVendors,
      {
        newTotalBudget: 650000,
        newDate: '2026-12-06',
        priorityFocus: 'food_guest_experience',
      }
    );

    const updated = applyReplanProposal(baseEvent, initialCategories, initialTasks, proposal);

    // Event updated
    expect(updated.event.totalBudget).toBe(650000);
    expect(updated.event.date).toBe('2026-12-06');

    // Completed tasks preserved
    const completedTasks = updated.tasks.filter((t) => t.status === 'completed');
    expect(completedTasks.length).toBe(2);
    expect(completedTasks[0].id).toBe('task-1');
    expect(completedTasks[1].id).toBe('task-2');

    // Category actualSpent preserved
    const venueCat = updated.categories.find((c) => c.name.includes('Venue'));
    expect(venueCat!.actualSpent).toBe(120000);
    expect(venueCat!.allocatedAmount).toBeGreaterThanOrEqual(120000);
  });
});

describe('Task Dependency Model & Chronological Conflict Detection', () => {
  it('detects chronological conflict when dependent task is scheduled earlier than prerequisite', () => {
    const tasks: TimelineTask[] = [
      {
        id: 't-prereq',
        eventId: 'evt-1',
        title: 'Book Venue',
        dueDate: '2026-10-15',
        priority: 'urgent',
        status: 'not_started',
        category: 'Venue',
      },
      {
        id: 't-dep',
        eventId: 'evt-1',
        title: 'Catering Menu Tasting',
        dueDate: '2026-10-10', // 5 days earlier than prerequisite!
        priority: 'high',
        status: 'not_started',
        category: 'Catering',
        dependsOnTaskId: 't-prereq',
      },
    ];

    const result = checkTaskDependencies(tasks, new Date('2026-10-01'));
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].taskId).toBe('t-dep');
    expect(result.conflicts[0].prerequisiteId).toBe('t-prereq');
  });

  it('detects downstream delay block when prerequisite is overdue and incomplete', () => {
    const tasks: TimelineTask[] = [
      {
        id: 't-prereq',
        eventId: 'evt-1',
        title: 'Book Venue',
        dueDate: '2026-09-01', // overdue relative to reference date 2026-10-01
        priority: 'urgent',
        status: 'not_started', // not completed
        category: 'Venue',
      },
      {
        id: 't-dep',
        eventId: 'evt-1',
        title: 'Catering Menu Tasting',
        dueDate: '2026-10-15',
        priority: 'high',
        status: 'not_started',
        category: 'Catering',
        dependsOnTaskId: 't-prereq',
      },
    ];

    const result = checkTaskDependencies(tasks, new Date('2026-10-01'));
    expect(result.downstreamDelays.length).toBe(1);
    expect(result.downstreamDelays[0].taskId).toBe('t-dep');
    expect(result.downstreamDelays[0].message).toContain('is blocked because prerequisite');
  });

  it('clears downstream block once the prerequisite is marked completed', () => {
    const tasks: TimelineTask[] = [
      {
        id: 't-prereq',
        eventId: 'evt-1',
        title: 'Book Venue',
        dueDate: '2026-09-01',
        priority: 'urgent',
        status: 'completed', // completed!
        category: 'Venue',
      },
      {
        id: 't-dep',
        eventId: 'evt-1',
        title: 'Catering Menu Tasting',
        dueDate: '2026-10-15',
        priority: 'high',
        status: 'not_started',
        category: 'Catering',
        dependsOnTaskId: 't-prereq',
      },
    ];

    const result = checkTaskDependencies(tasks, new Date('2026-10-01'));
    expect(result.downstreamDelays.length).toBe(0);
    expect(result.conflicts.length).toBe(0);
  });
});

describe('Vendor Quotation Comparison Matrix & Audit', () => {
  const categoryBudget = 400000;
  const quotes: VendorQuote[] = [
    {
      id: 'q-1',
      eventId: 'evt-1',
      vendorName: 'Royal Heritage Banquets',
      category: 'Catering & Beverages',
      quotedAmount: 380000,
      pricePerPerson: 1727,
      servicesIncluded: ['3-Course Royal Buffet', '18 Service Waitstaff', 'Bone China Crockery'],
      paymentTerms: '30% advance, 50% morning, 20% post-event',
      additionalChargesNotes: 'Includes all taxes, service charge, and overtime up to 1:00 AM',
      guestCapacity: 300,
      missingInfo: [],
      createdAt: '2026-10-01',
    },
    {
      id: 'q-2',
      eventId: 'evt-1',
      vendorName: 'Saffron Spice Caterers',
      category: 'Catering & Beverages',
      quotedAmount: 330000,
      pricePerPerson: 1500,
      servicesIncluded: ['Traditional Buffet'],
      missingInfo: ['Overtime charges past 11:30 PM', 'Pure vegetarian kitchen isolation'],
      createdAt: '2026-10-02',
    },
    {
      id: 'q-3',
      eventId: 'evt-1',
      vendorName: 'Maharaja Grand Feast',
      category: 'Catering & Beverages',
      quotedAmount: 480000,
      pricePerPerson: 2181,
      servicesIncluded: ['5-Course Luxury Feast', 'Ice Sculptures'],
      createdAt: '2026-10-03',
    },
  ];

  it('correctly compares multiple quotations against category budget and per-guest targets', () => {
    const analysis = compareVendorQuotes(categoryBudget, quotes, 220);

    expect(analysis.quoteCount).toBe(3);
    expect(analysis.lowestQuote).toBe(330000);
    expect(analysis.highestQuote).toBe(480000);

    // Q1: 380,000 vs 400,000 budget (-20,000 / 95%)
    const q1Comp = analysis.comparisons.find((c) => c.quote.id === 'q-1')!;
    expect(q1Comp.varianceFromBudget).toBe(-20000);
    expect(q1Comp.percentOfBudget).toBe(95);
    expect(q1Comp.missingInformationCount).toBe(0);

    // Q2: Missing information audit
    const q2Comp = analysis.comparisons.find((c) => c.quote.id === 'q-2')!;
    expect(q2Comp.missingInformationCount).toBe(2);
    expect(q2Comp.missingInformationList).toContain('Overtime charges past 11:30 PM');

    // Q3: Over budget
    const q3Comp = analysis.comparisons.find((c) => c.quote.id === 'q-3')!;
    expect(q3Comp.varianceFromBudget).toBe(80000);
    expect(q3Comp.percentOfBudget).toBe(120);
  });
});

