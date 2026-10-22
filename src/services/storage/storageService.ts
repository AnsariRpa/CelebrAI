/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BudgetCategory,
  ChecklistItem,
  Event,
  EventExportData,
  Expense,
  SavedIdea,
  TimelineTask,
  Vendor,
} from '../../domain/types';
import { generateId, validateImportedData } from '../../domain/validation';
import {
  generateBudgetAllocation,
  generatePersonalizedIdeas,
  generateTimeline,
  generateVendorChecklist,
} from '../planning/planningEngine';

const STORAGE_KEYS = {
  EVENTS: 'celebr_ai_events_v2',
  ACTIVE_EVENT_ID: 'celebr_ai_active_event_id_v2',
  CATEGORIES: 'celebr_ai_categories_v2',
  EXPENSES: 'celebr_ai_expenses_v2',
  TASKS: 'celebr_ai_tasks_v2',
  VENDORS: 'celebr_ai_vendors_v2',
  CHECKLIST: 'celebr_ai_checklist_v2',
  IDEAS: 'celebr_ai_ideas_v2',
};

// Safe wrapper around window.localStorage
function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err) {
    console.warn(`[CelebrAI Storage] Could not read ${key} from localStorage:`, err);
  }
  return null;
}

function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch (err) {
    console.error(`[CelebrAI Storage] Error saving ${key} to localStorage:`, err);
  }
  return false;
}

/**
 * Seed initial showcase celebration for immediate interactive demonstration
 */
function createInitialShowcaseEvent(): {
  event: Event;
  categories: BudgetCategory[];
  tasks: TimelineTask[];
  vendors: Vendor[];
  checklist: ChecklistItem[];
  ideas: SavedIdea[];
  expenses: Expense[];
} {
  // Target date 3 months in future
  const future = new Date();
  future.setDate(future.getDate() + 92);
  const targetDateStr = future.toISOString().split('T')[0];

  const event: Event = {
    id: 'demo-showcase-wedding-01',
    name: 'Aria & Kabir’s Royal Garden Wedding',
    type: 'wedding',
    date: targetDateStr,
    isMultiDay: true,
    endDate: targetDateStr,
    location: 'Udaipur, Rajasthan',
    venuePreference: 'mixed',
    guestCount: 220,
    totalBudget: 1500000,
    currency: 'INR',
    flexibility: 'moderate',
    planningStage: 'Vendors Research & Booking',
    preferences: {
      style: 'traditional',
      themeDescription: 'Regal Rajputana heritage meets ethereal botanical chandeliers, warm brass candle lanterns, and fragrant mogra & tuberose florals.',
      colorPalette: ['#1c4b38', '#d4af37', '#fdfbf7', '#c08081'],
      dietaryRequirements: ['Vegetarian', 'Jain options', 'Gluten-free counter'],
      accessibilityNeeds: ['Step-free lawn ramps for grandparents', 'Priority golf cart shuttles from parking'],
      culturalConsiderations: 'Traditional Sangeet musical evening preceding Vedic wedding pheras.',
      mustHaveActivities: ['Heritage courtyard welcome with shehnai', 'Live artisanal sweet jalebi counter', 'Vintage photo booth lounge'],
      additionalNotes: 'Catering requires pure vegetarian separate kitchen preparation.',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const categories = generateBudgetAllocation(event);
  const tasks = generateTimeline(event);
  const { vendors, checklist } = generateVendorChecklist(event);
  const ideas = generatePersonalizedIdeas(event);

  // Seed two realistic recorded expenses
  const venueCat = categories.find((c) => c.name.includes('Venue')) || categories[0];
  const photoCat = categories.find((c) => c.name.includes('Photography')) || categories[1];

  const expenses: Expense[] = [
    {
      id: generateId(),
      eventId: event.id,
      categoryId: venueCat.id,
      categoryName: venueCat.name,
      description: 'Lawn & Heritage Courtyard Advance Booking',
      amount: 300000,
      amountPaid: 300000,
      paymentStatus: 'paid',
      date: new Date().toISOString().split('T')[0],
      notes: 'Initial 50% reservation deposit confirmed.',
    },
    {
      id: generateId(),
      eventId: event.id,
      categoryId: photoCat.id,
      categoryName: photoCat.name,
      description: 'Lead Cinematographer Retainer',
      amount: 75000,
      amountPaid: 75000,
      paymentStatus: 'paid',
      date: new Date().toISOString().split('T')[0],
      notes: 'Booking advance for 2-day candid coverage.',
    },
  ];

  // Update category actuals
  venueCat.actualSpent = 300000;
  photoCat.actualSpent = 75000;

  // Mark one vendor as booked
  if (vendors.length > 0) {
    vendors[0].bookingStatus = 'booked';
    vendors[0].agreedCost = 420000;
    vendors[0].amountPaid = 300000;
    vendors[0].paymentStatus = 'partial';
  }

  // Mark first two tasks completed for realism
  if (tasks.length > 1) {
    tasks[0].status = 'completed';
    tasks[1].status = 'in_progress';
  }

  return { event, categories, tasks, vendors, checklist, ideas, expenses };
}

export class StorageService {
  /**
   * Initializes storage with showcase data if empty
   */
  static init(): void {
    const existing = safeGetItem(STORAGE_KEYS.EVENTS);
    if (!existing || existing === '[]') {
      const initial = createInitialShowcaseEvent();
      this.saveEvents([initial.event]);
      this.setActiveEventId(initial.event.id);
      this.saveCategories(initial.categories);
      this.saveTasks(initial.tasks);
      this.saveVendors(initial.vendors);
      this.saveChecklist(initial.checklist);
      this.saveIdeas(initial.ideas);
      this.saveExpenses(initial.expenses);
    }
  }

  // --- EVENTS ---
  static getEvents(): Event[] {
    const raw = safeGetItem(STORAGE_KEYS.EVENTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveEvents(events: Event[]): void {
    safeSetItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }

  static getActiveEventId(): string | null {
    const id = safeGetItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
    if (id) return id;
    const events = this.getEvents();
    return events.length > 0 ? events[0].id : null;
  }

  static setActiveEventId(id: string): void {
    safeSetItem(STORAGE_KEYS.ACTIVE_EVENT_ID, id);
  }

  static getActiveEvent(): Event | null {
    const events = this.getEvents();
    const activeId = this.getActiveEventId();
    if (!activeId) return events[0] || null;
    return events.find((e) => e.id === activeId) || events[0] || null;
  }

  static createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event {
    const newEvent: Event = {
      ...eventData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const events = this.getEvents();
    events.unshift(newEvent);
    this.saveEvents(events);
    this.setActiveEventId(newEvent.id);

    // Generate initial intelligent plan
    const categories = generateBudgetAllocation(newEvent);
    const tasks = generateTimeline(newEvent);
    const { vendors, checklist } = generateVendorChecklist(newEvent);
    const ideas = generatePersonalizedIdeas(newEvent);

    // Append to existing entity collections
    const allCategories = this.getCategories().concat(categories);
    const allTasks = this.getTasks().concat(tasks);
    const allVendors = this.getVendors().concat(vendors);
    const allChecklist = this.getChecklist().concat(checklist);
    const allIdeas = this.getIdeas().concat(ideas);

    this.saveCategories(allCategories);
    this.saveTasks(allTasks);
    this.saveVendors(allVendors);
    this.saveChecklist(allChecklist);
    this.saveIdeas(allIdeas);

    return newEvent;
  }

  static updateEvent(updatedEvent: Event): void {
    const events = this.getEvents().map((e) =>
      e.id === updatedEvent.id ? { ...updatedEvent, updatedAt: new Date().toISOString() } : e
    );
    this.saveEvents(events);
  }

  static deleteEvent(eventId: string): void {
    const events = this.getEvents().filter((e) => e.id !== eventId);
    this.saveEvents(events);

    // Clean up associated children
    this.saveCategories(this.getCategories().filter((c) => c.eventId !== eventId));
    this.saveExpenses(this.getExpenses().filter((e) => e.eventId !== eventId));
    this.saveTasks(this.getTasks().filter((t) => t.eventId !== eventId));
    this.saveVendors(this.getVendors().filter((v) => v.eventId !== eventId));
    this.saveChecklist(this.getChecklist().filter((c) => c.eventId !== eventId));
    this.saveIdeas(this.getIdeas().filter((i) => i.eventId !== eventId));

    if (this.getActiveEventId() === eventId) {
      this.setActiveEventId(events.length > 0 ? events[0].id : '');
    }
  }

  // --- CATEGORIES ---
  static getCategories(eventId?: string): BudgetCategory[] {
    const raw = safeGetItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) return [];
    try {
      const all: BudgetCategory[] = JSON.parse(raw);
      return eventId ? all.filter((c) => c.eventId === eventId) : all;
    } catch {
      return [];
    }
  }

  static saveCategories(categories: BudgetCategory[]): void {
    safeSetItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  static updateCategory(category: BudgetCategory): void {
    const all = this.getCategories().map((c) => (c.id === category.id ? category : c));
    this.saveCategories(all);
  }

  // --- EXPENSES ---
  static getExpenses(eventId?: string): Expense[] {
    const raw = safeGetItem(STORAGE_KEYS.EXPENSES);
    if (!raw) return [];
    try {
      const all: Expense[] = JSON.parse(raw);
      return eventId ? all.filter((e) => e.eventId === eventId) : all;
    } catch {
      return [];
    }
  }

  static saveExpenses(expenses: Expense[]): void {
    safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }

  static addExpense(expense: Expense): void {
    const all = this.getExpenses();
    all.unshift(expense);
    this.saveExpenses(all);

    // Update category actual spent
    const categories = this.getCategories();
    const cat = categories.find((c) => c.id === expense.categoryId);
    if (cat) {
      cat.actualSpent = (cat.actualSpent || 0) + expense.amount;
      this.saveCategories(categories);
    }
  }

  static deleteExpense(expenseId: string): void {
    const all = this.getExpenses();
    const target = all.find((e) => e.id === expenseId);
    if (!target) return;

    const filtered = all.filter((e) => e.id !== expenseId);
    this.saveExpenses(filtered);

    // Adjust category actual spent
    const categories = this.getCategories();
    const cat = categories.find((c) => c.id === target.categoryId);
    if (cat) {
      cat.actualSpent = Math.max(0, (cat.actualSpent || 0) - target.amount);
      this.saveCategories(categories);
    }
  }

  // --- TASKS ---
  static getTasks(eventId?: string): TimelineTask[] {
    const raw = safeGetItem(STORAGE_KEYS.TASKS);
    if (!raw) return [];
    try {
      const all: TimelineTask[] = JSON.parse(raw);
      return eventId ? all.filter((t) => t.eventId === eventId) : all;
    } catch {
      return [];
    }
  }

  static saveTasks(tasks: TimelineTask[]): void {
    safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  static updateTask(task: TimelineTask): void {
    const all = this.getTasks().map((t) => (t.id === task.id ? task : t));
    this.saveTasks(all);
  }

  static addTask(task: TimelineTask): void {
    const all = this.getTasks();
    all.push(task);
    this.saveTasks(all);
  }

  static deleteTask(taskId: string): void {
    const all = this.getTasks().filter((t) => t.id !== taskId);
    this.saveTasks(all);
  }

  // --- VENDORS ---
  static getVendors(eventId?: string): Vendor[] {
    const raw = safeGetItem(STORAGE_KEYS.VENDORS);
    if (!raw) return [];
    try {
      const all: Vendor[] = JSON.parse(raw);
      return eventId ? all.filter((v) => v.eventId === eventId) : all;
    } catch {
      return [];
    }
  }

  static saveVendors(vendors: Vendor[]): void {
    safeSetItem(STORAGE_KEYS.VENDORS, JSON.stringify(vendors));
  }

  static updateVendor(vendor: Vendor): void {
    const all = this.getVendors().map((v) => (v.id === vendor.id ? vendor : v));
    this.saveVendors(all);
  }

  static addVendor(vendor: Vendor): void {
    const all = this.getVendors();
    all.push(vendor);
    this.saveVendors(all);
  }

  static deleteVendor(vendorId: string): void {
    const all = this.getVendors().filter((v) => v.id !== vendorId);
    this.saveVendors(all);
  }

  // --- CHECKLIST ---
  static getChecklist(eventId?: string): ChecklistItem[] {
    const raw = safeGetItem(STORAGE_KEYS.CHECKLIST);
    if (!raw) return [];
    try {
      const all: ChecklistItem[] = JSON.parse(raw);
      return eventId ? all.filter((c) => c.eventId === eventId) : all;
    } catch {
      return [];
    }
  }

  static saveChecklist(items: ChecklistItem[]): void {
    safeSetItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(items));
  }

  static toggleChecklistItem(itemId: string): void {
    const all = this.getChecklist().map((item) =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    this.saveChecklist(all);
  }

  static addChecklistItem(item: ChecklistItem): void {
    const all = this.getChecklist();
    all.push(item);
    this.saveChecklist(all);
  }

  static deleteChecklistItem(itemId: string): void {
    const all = this.getChecklist().filter((c) => c.id !== itemId);
    this.saveChecklist(all);
  }

  // --- IDEAS ---
  static getIdeas(eventId?: string): SavedIdea[] {
    const raw = safeGetItem(STORAGE_KEYS.IDEAS);
    if (!raw) return [];
    try {
      const all: SavedIdea[] = JSON.parse(raw);
      return eventId ? all.filter((i) => i.eventId === eventId) : all;
    } catch {
      return [];
    }
  }

  static saveIdeas(ideas: SavedIdea[]): void {
    safeSetItem(STORAGE_KEYS.IDEAS, JSON.stringify(ideas));
  }

  static toggleIdeaSaved(ideaId: string): void {
    const all = this.getIdeas().map((i) => (i.id === ideaId ? { ...i, isSaved: !i.isSaved } : i));
    this.saveIdeas(all);
  }

  static toggleIdeaUsed(ideaId: string): void {
    const all = this.getIdeas().map((i) => (i.id === ideaId ? { ...i, isUsed: !i.isUsed } : i));
    this.saveIdeas(all);
  }

  // --- EXPORT & IMPORT ---
  static exportEventBackup(eventId: string): string | null {
    const event = this.getEvents().find((e) => e.id === eventId);
    if (!event) return null;

    const data: EventExportData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      event,
      categories: this.getCategories(eventId),
      expenses: this.getExpenses(eventId),
      tasks: this.getTasks(eventId),
      vendors: this.getVendors(eventId),
      checklist: this.getChecklist(eventId),
      ideas: this.getIdeas(eventId),
    };

    return JSON.stringify(data, null, 2);
  }

  static importEventBackup(jsonString: string): { success: boolean; eventId?: string; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = validateImportedData(parsed);
      if (!validation.isValid || !validation.data) {
        return { success: false, error: validation.error || 'Invalid backup structure.' };
      }

      const imported = validation.data;
      // Assign fresh ID to avoid collisions
      const newEventId = generateId();
      const newEvent: Event = {
        ...imported.event,
        id: newEventId,
        name: `${imported.event.name} (Restored)`,
        updatedAt: new Date().toISOString(),
      };

      const remapEventId = <T extends { eventId: string; id: string }>(items: T[]): T[] =>
        items.map((it) => ({ ...it, id: generateId(), eventId: newEventId }));

      const newCategories = remapEventId(imported.categories || []);
      const newExpenses = remapEventId(imported.expenses || []);
      const newTasks = remapEventId(imported.tasks || []);
      const newVendors = remapEventId(imported.vendors || []);
      const newChecklist = remapEventId(imported.checklist || []);
      const newIdeas = remapEventId(imported.ideas || []);

      // Save into collections
      const events = this.getEvents();
      events.unshift(newEvent);
      this.saveEvents(events);
      this.setActiveEventId(newEventId);

      this.saveCategories(this.getCategories().concat(newCategories));
      this.saveExpenses(this.getExpenses().concat(newExpenses));
      this.saveTasks(this.getTasks().concat(newTasks));
      this.saveVendors(this.getVendors().concat(newVendors));
      this.saveChecklist(this.getChecklist().concat(newChecklist));
      this.saveIdeas(this.getIdeas().concat(newIdeas));

      return { success: true, eventId: newEventId };
    } catch (err) {
      return { success: false, error: 'Malformed JSON file: ' + (err instanceof Error ? err.message : String(err)) };
    }
  }
}
