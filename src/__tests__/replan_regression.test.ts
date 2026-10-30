/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  BudgetCategory,
  ChatMessage,
  Event,
  Expense,
  ReplanProposal,
  TimelineTask,
  Vendor,
} from '../domain/types';
import {
  generateBudgetAllocation,
  applyReplanProposal,
  calculateBudgetMetrics,
  generateReplanProposal,
  generateLocalAssistantResponse,
} from '../services/planning/planningEngine';
import { parseReplanIntent } from '../services/planning/intentParser';
import { StorageService } from '../services/storage/storageService';

describe('ReplanModal Defaults & Baseline Integrity Regression', () => {
  const baseEvent: Event = {
    id: 'evt-test-1',
    name: 'Rohan & Ananya Wedding',
    type: 'wedding',
    date: '2026-12-20',
    location: 'Jaipur, Rajasthan',
    venuePreference: 'mixed',
    guestCount: 200,
    totalBudget: 800000,
    currency: 'INR',
    flexibility: 'moderate',
    planningStage: 'Vendor Booking Phase',
    preferences: {
      style: 'traditional',
      dietaryRequirements: ['Vegetarian'],
      accessibilityNeeds: ['Wheelchair Access'],
      priorityFocus: 'venue_atmosphere', // Saved preference
    },
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  };

  const categories: BudgetCategory[] = generateBudgetAllocation(baseEvent);

  const tasks: TimelineTask[] = [
    {
      id: 'task-1',
      eventId: baseEvent.id,
      title: 'Book Wedding Venue',
      dueDate: '2026-10-15',
      priority: 'urgent',
      status: 'completed', // Completed task
      category: 'Venue & Banquet Catering',
    },
    {
      id: 'task-2',
      eventId: baseEvent.id,
      title: 'Finalize Stage Florals',
      dueDate: '2026-11-20',
      priority: 'high',
      status: 'not_started',
      category: 'Decor, Florals & Ambient Lighting',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      eventId: baseEvent.id,
      categoryId: categories[0].id,
      categoryName: categories[0].name,
      description: 'Venue Advance Deposit',
      amount: 150000,
      date: '2026-10-01',
      paymentStatus: 'paid',
      amountPaid: 150000,
    },
  ];

  const vendors: Vendor[] = [];

  it('1. Opening replan modal without explicit request does NOT automatically reduce budget or shift date', () => {
    // When no request parameters are modified (opening modal default),
    // simulated budget equals current budget, and simulated date equals current date.
    const proposal = generateReplanProposal(
      baseEvent,
      categories,
      expenses,
      tasks,
      vendors,
      {
        newTotalBudget: baseEvent.totalBudget, // Preserved
        newDate: baseEvent.date, // Preserved
        newGuestCount: baseEvent.guestCount, // Preserved
        priorityFocus: baseEvent.preferences.priorityFocus, // Preserved
      }
    );

    expect(proposal.changesSummary.budgetDelta).toBe(0);
    expect(proposal.changesSummary.dateShiftDays).toBe(0);
    expect(proposal.changesSummary.guestDelta).toBe(0);

    // Sum of category allocations must remain equal to the original 800,000
    const totalAllocated = proposal.categoryAdjustments.reduce((sum, c) => sum + c.proposedAllocated, 0);
    expect(totalAllocated).toBe(800000);

    // Completed task must remain completely preserved
    const task1 = proposal.timelineAdjustments.find((t) => t.taskId === 'task-1');
    expect(task1?.newDueDate).toBe('2026-10-15');
    expect(task1?.reason).toContain('already completed');
  });

  it('2. Preserves user priorities when no new priority is specified', () => {
    // The event has priorityFocus = 'venue_atmosphere'.
    // A replan with a budget cut should respect 'venue_atmosphere' and shield venue & decor.
    const proposal = generateReplanProposal(
      baseEvent,
      categories,
      expenses,
      tasks,
      vendors,
      {
        newTotalBudget: 600000,
        // priorityFocus omitted, should fall back to baseEvent.preferences.priorityFocus
      }
    );

    const venueDecorCat = proposal.categoryAdjustments.find((c) =>
      c.categoryName.toLowerCase().includes('venue') || c.categoryName.toLowerCase().includes('decor')
    );
    expect(venueDecorCat?.isProtected).toBe(true);
  });

  it('3. Handles different requested budget amounts dynamically without amount-specific code', () => {
    // Test multiple arbitrary budget amounts
    const testBudgets = [450000, 520000, 715000, 950000, 1500000];

    for (const testBudget of testBudgets) {
      const proposal = generateReplanProposal(
        baseEvent,
        categories,
        expenses,
        tasks,
        vendors,
        {
          newTotalBudget: testBudget,
          newDate: baseEvent.date,
        }
      );

      expect(proposal.changesSummary.budgetDelta).toBe(testBudget - baseEvent.totalBudget);

      // Category allocations must sum exactly to testBudget
      const sum = proposal.categoryAdjustments.reduce((s, c) => s + c.proposedAllocated, 0);
      expect(sum).toBe(testBudget);

      // No category with expenses should be reduced below actual spent (150,000)
      const venueCat = proposal.categoryAdjustments.find((c) => c.categoryId === categories[0].id);
      expect(venueCat!.proposedAllocated).toBeGreaterThanOrEqual(150000);
    }
  });

  it('4. Validates date and guest-count changes accurately', () => {
    // Shift date 10 days earlier and reduce guests to 120
    const proposal = generateReplanProposal(
      baseEvent,
      categories,
      expenses,
      tasks,
      vendors,
      {
        newDate: '2026-12-10',
        newGuestCount: 120,
      }
    );

    expect(proposal.changesSummary.dateShiftDays).toBe(-10);
    expect(proposal.changesSummary.guestDelta).toBe(-80);

    // Unfinished task should shift earlier by 10 days
    const task2 = proposal.timelineAdjustments.find((t) => t.taskId === 'task-2');
    expect(task2?.newDueDate).toBe('2026-11-10'); // was 2026-11-20
  });

  it('5. Cancelling a proposal leaves the saved event and categories completely unchanged', () => {
    const originalEventCopy = JSON.parse(JSON.stringify(baseEvent));
    const originalCategoriesCopy = JSON.parse(JSON.stringify(categories));
    const originalTasksCopy = JSON.parse(JSON.stringify(tasks));

    // Generate proposal simulating a massive reduction
    const proposal = generateReplanProposal(
      baseEvent,
      categories,
      expenses,
      tasks,
      vendors,
      {
        newTotalBudget: 400000,
        newDate: '2026-11-01',
      }
    );

    // Verify generating a proposal did NOT mutate the input models
    expect(baseEvent).toEqual(originalEventCopy);
    expect(categories).toEqual(originalCategoriesCopy);
    expect(tasks).toEqual(originalTasksCopy);

    // Proposal exists, but event remains at 800,000
    expect(baseEvent.totalBudget).toBe(800000);
    expect(baseEvent.date).toBe('2026-12-20');
  });

  it('6. Applying an approved proposal updates the correct event and preserves completed tasks', () => {
    const proposal = generateReplanProposal(
      baseEvent,
      categories,
      expenses,
      tasks,
      vendors,
      {
        newTotalBudget: 680000,
        newDate: '2026-12-06', // 14 days earlier
      }
    );

    const result = applyReplanProposal(baseEvent, categories, tasks, proposal);

    // Updated event has new budget and date
    expect(result.event.totalBudget).toBe(680000);
    expect(result.event.date).toBe('2026-12-06');

    // Completed task remains completed with original due date
    const updatedTask1 = result.tasks.find((t) => t.id === 'task-1')!;
    expect(updatedTask1.status).toBe('completed');
    expect(updatedTask1.dueDate).toBe('2026-10-15');

    // Incomplete task due date has shifted earlier
    const updatedTask2 = result.tasks.find((t) => t.id === 'task-2')!;
    expect(updatedTask2.dueDate).toBe('2026-11-06'); // 14 days earlier than 2026-11-20
  });
});

describe('Natural Language Intent Parser & Ambiguity Audit', () => {
  const sampleEvent: Event = {
    id: 'evt-audit',
    name: 'Priya 30th Birthday',
    type: 'birthday',
    date: '2026-11-30',
    location: 'Bengaluru',
    venuePreference: 'indoor',
    guestCount: 100,
    totalBudget: 300000,
    currency: 'INR',
    flexibility: 'strict',
    planningStage: 'Planning',
    preferences: {
      style: 'modern',
      dietaryRequirements: ['Vegan'],
      accessibilityNeeds: [],
      priorityFocus: 'food_guest_experience',
    },
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  };

  it('correctly extracts arbitrary budget amounts without hardcoded figures', () => {
    // Arbitrary number: 220000
    const p1 = parseReplanIntent('Our budget has dropped to 220000, please revise plan', sampleEvent);
    expect(p1.isReplanIntent).toBe(true);
    expect(p1.extractedBudget).toBe(220000);

    // Formatted number with commas: 1,80,000
    const p2 = parseReplanIntent('Budget is now ₹1,80,000 and date is earlier', sampleEvent);
    expect(p2.isReplanIntent).toBe(true);
    expect(p2.extractedBudget).toBe(180000);

    // Percentage cut: 25%
    const p3 = parseReplanIntent('Cut our budget by 25%', sampleEvent);
    expect(p3.isReplanIntent).toBe(true);
    expect(p3.extractedBudget).toBe(225000); // 300,000 * 0.75

    // K suffix: 250k
    const p4 = parseReplanIntent('New budget target is 250k', sampleEvent);
    expect(p4.isReplanIntent).toBe(true);
    expect(p4.extractedBudget).toBe(250000);
  });

  it('correctly extracts arbitrary relative date shifts', () => {
    // 3 weeks earlier
    const p1 = parseReplanIntent('Event is happening 3 weeks earlier', sampleEvent);
    expect(p1.isReplanIntent).toBe(true);
    expect(p1.extractedDate).toBe('2026-11-09'); // 30 minus 21 days

    // Explicit ISO date
    const p2 = parseReplanIntent('The date moved to 2026-11-15, please replan', sampleEvent);
    expect(p2.isReplanIntent).toBe(true);
    expect(p2.extractedDate).toBe('2026-11-15');
  });

  it('correctly extracts guest counts', () => {
    const p1 = parseReplanIntent('Guest count dropped to 65 people', sampleEvent);
    expect(p1.isReplanIntent).toBe(true);
    expect(p1.extractedGuestCount).toBe(65);
  });

  it('identifies ambiguous requests and asks for clarification without inventing numbers', () => {
    // User says "we need to replan" without giving any numbers
    const p1 = parseReplanIntent('Can you help us replan our celebration?', sampleEvent);
    expect(p1.isReplanIntent).toBe(true);
    expect(p1.isAmbiguous).toBe(true);
    expect(p1.hasExplicitParameters).toBe(false);
    expect(p1.extractedBudget).toBeUndefined();
    expect(p1.extractedDate).toBeUndefined();

    // Verify assistant does not invent an arbitrary drop when ambiguous
    const budgetMetrics = calculateBudgetMetrics(sampleEvent.totalBudget, [], [], []);
    const assistantResponse = generateLocalAssistantResponse(
      'Can you help us replan our celebration?',
      sampleEvent,
      [],
      [],
      budgetMetrics
    );

    // Proposal must be undefined so no automatic unapproved replan is applied
    expect(assistantResponse.replanProposal).toBeUndefined();
    // Assistant response text must prompt the user for their numbers
    expect(assistantResponse.text).toContain('please specify your target changes');
    expect(assistantResponse.text).toContain('New Budget');
  });
});

describe('CelebrAI Assistant Specialized Fallback Domains', () => {
  const birthdayEvent: Event = {
    id: 'evt-bday-test',
    name: 'Aarav 5th Birthday Adventure',
    type: 'birthday',
    date: '2026-11-20',
    location: 'Mumbai',
    venuePreference: 'indoor',
    guestCount: 30,
    totalBudget: 75000,
    currency: 'INR',
    flexibility: 'moderate',
    planningStage: 'Planning',
    preferences: {
      style: 'festive',
      dietaryRequirements: ['Nut-Free'],
      accessibilityNeeds: [],
    },
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  const weddingEvent: Event = {
    id: 'evt-wedding-test',
    name: 'Aria & Rohan Wedding',
    type: 'wedding',
    date: '2026-12-25',
    location: 'Udaipur',
    venuePreference: 'outdoor',
    guestCount: 150,
    totalBudget: 1500000,
    currency: 'INR',
    flexibility: 'strict',
    planningStage: 'Vendors',
    preferences: {
      style: 'elegant',
      customStyleName: 'royal',
      dietaryRequirements: ['Vegetarian'],
      accessibilityNeeds: [],
    },
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  const mockMetrics = calculateBudgetMetrics(75000, [], [], []);

  it('answers birthday cake flavor recommendations with specialized cake advice rather than generic budget copy', () => {
    const res = generateLocalAssistantResponse(
      'Recommend 3 cake flavors for a 5-year-old birthday party',
      birthdayEvent,
      [],
      [],
      mockMetrics
    );

    expect(res.text.toLowerCase()).toContain('cake');
    expect(res.text).toContain('Confetti Cloud');
    expect(res.text).toContain('Portioning Guide');
    expect(res.replanProposal).toBeUndefined();
  });

  it('answers wedding cake flavor recommendations with tiered luxury pastry suggestions', () => {
    const res = generateLocalAssistantResponse(
      'What are some elegant cake flavors for our wedding?',
      weddingEvent,
      [],
      [],
      calculateBudgetMetrics(1500000, [], [], [])
    );

    expect(res.text.toLowerCase()).toContain('cake');
    expect(res.text).toContain('Pistachio & Rose Water Cardamom');
    expect(res.text).toContain('Logistics Tip');
  });

  it('provides specialized floral and ambient lighting advice when asked about decor', () => {
    const res = generateLocalAssistantResponse(
      'Can you recommend florals and ambient lighting ideas?',
      weddingEvent,
      [],
      [],
      mockMetrics
    );

    expect(res.text).toContain('Atmosphere & Decor Concept');
    expect(res.text).toContain('Warm Ambient Illuminations');
    expect(res.text).toContain('Budget Strategy');
  });

  it('provides specialized photography shotlists when asked about photos and video', () => {
    const res = generateLocalAssistantResponse(
      'What shots should our photographer and videographer capture?',
      weddingEvent,
      [],
      [],
      mockMetrics
    );

    expect(res.text).toContain('Photography & Visual Coverage Strategy');
    expect(res.text).toContain('Golden Hour Portrait Window');
    expect(res.text).toContain('Audit Tip');
  });

  it('provides specialized attire and dress code guidance when asked about styling', () => {
    const res = generateLocalAssistantResponse(
      'What attire and dress code should we specify for guests?',
      weddingEvent,
      [],
      [],
      mockMetrics
    );

    expect(res.text).toContain('Celebration Styling Guide');
    expect(res.text).toContain('Color Harmony');
    expect(res.text).toContain('Fitting Timeline');
  });
});

describe('StorageService Per-Event Chat History Isolation', () => {
  const eventAId = 'evt-chat-alpha';
  const eventBId = 'evt-chat-beta';

  const mockMessagesA: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      text: 'Recommend birthday cakes',
      timestamp: '2026-10-30T10:00:00.000Z',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      text: 'Here are 3 cake flavors: Confetti Cloud, Chocolate Fudge, Strawberry Shortcake',
      timestamp: '2026-10-30T10:00:01.000Z',
      modelUsed: 'gemini-3.1-flash-lite',
    },
  ];

  const mockMessagesB: ChatMessage[] = [
    {
      id: 'msg-3',
      role: 'user',
      text: 'What is our wedding timeline?',
      timestamp: '2026-10-30T11:00:00.000Z',
    },
  ];

  it('saves and restores chat history per event independently without leaking', () => {
    // Save for Event A
    StorageService.saveChatHistory(eventAId, mockMessagesA);
    // Save for Event B
    StorageService.saveChatHistory(eventBId, mockMessagesB);

    // Retrieve A
    const historyA = StorageService.getChatHistory(eventAId);
    expect(historyA).toHaveLength(2);
    expect(historyA[0].text).toBe('Recommend birthday cakes');
    expect(historyA[1].modelUsed).toBe('gemini-3.1-flash-lite');

    // Retrieve B
    const historyB = StorageService.getChatHistory(eventBId);
    expect(historyB).toHaveLength(1);
    expect(historyB[0].text).toBe('What is our wedding timeline?');

    // Unrelated event has empty history
    const historyC = StorageService.getChatHistory('evt-chat-gamma');
    expect(historyC).toEqual([]);
  });

  it('clears chat history for a specific event while retaining other events', () => {
    StorageService.clearChatHistory(eventAId);

    expect(StorageService.getChatHistory(eventAId)).toEqual([]);
    expect(StorageService.getChatHistory(eventBId)).toHaveLength(1);
  });
});

