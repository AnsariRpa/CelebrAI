/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EventType = 'wedding' | 'birthday' | 'anniversary' | 'community' | 'other';

export type BudgetFlexibility = 'strict' | 'moderate' | 'flexible';

export type VenuePreference = 'indoor' | 'outdoor' | 'mixed';

export type EventStyle =
  | 'elegant'
  | 'traditional'
  | 'modern'
  | 'minimalist'
  | 'rustic'
  | 'festive'
  | 'cultural'
  | 'custom';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export type BookingStatus =
  | 'researching'
  | 'contacted'
  | 'negotiating'
  | 'booked'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface EventPreferences {
  style: EventStyle;
  customStyleName?: string;
  themeDescription?: string;
  colorPalette?: string[];
  dietaryRequirements: string[];
  accessibilityNeeds: string[];
  culturalConsiderations?: string;
  mustHaveActivities: string[];
  additionalNotes?: string;
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  date: string; // ISO date 'YYYY-MM-DD'
  endDate?: string; // Optional multi-day end date
  isMultiDay?: boolean;
  location: string;
  venuePreference: VenuePreference;
  guestCount: number;
  totalBudget: number;
  currency: string; // Default 'INR' (₹)
  flexibility: BudgetFlexibility;
  planningStage: string;
  preferences: EventPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  eventId: string;
  name: string;
  allocatedPercent: number; // e.g. 35 for 35%
  allocatedAmount: number; // Computed exact currency amount
  estimatedAmount: number; // User adjustable estimate
  actualSpent: number; // Sum of recorded expenses for this category
  notes?: string;
}

export interface Expense {
  id: string;
  eventId: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  date: string;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  notes?: string;
}

export interface TimelineTask {
  id: string;
  eventId: string;
  title: string;
  description: string;
  dueDate: string; // ISO date 'YYYY-MM-DD'
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  isCompressedDeadline?: boolean;
  notes?: string;
}

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  category: string;
  contactPerson?: string;
  contactPhoneOrEmail?: string;
  estimatedCost: number;
  agreedCost: number;
  amountPaid: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  contractNotes?: string;
  eventNotes?: string;
}

export interface ChecklistItem {
  id: string;
  eventId: string;
  category: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: string;
  notes?: string;
}

export interface SavedIdea {
  id: string;
  eventId: string;
  category: 'theme' | 'decor' | 'menu' | 'entertainment' | 'contingency' | 'sustainability' | 'guest_experience';
  title: string;
  description: string;
  practicalTip: string;
  isSaved: boolean;
  isUsed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  suggestions?: string[];
  isLiveAI?: boolean;
}

export interface BudgetMetrics {
  totalBudget: number;
  totalAllocated: number;
  totalEstimated: number;
  totalActual: number;
  totalPaid: number;
  totalCommitted: number; // Outstanding payments on agreed vendor contracts
  remainingBudget: number;
  utilizationPercent: number;
  isOverspent: boolean;
  overspentAmount: number;
  costSavingSuggestions: string[];
}

export interface ReadinessMetrics {
  overallScore: number; // 0 - 100
  label: string;
  budgetReadiness: number; // 0 - 100
  taskReadiness: number; // 0 - 100
  vendorReadiness: number; // 0 - 100
  daysRemaining: number;
  isPast: boolean;
  isUrgentLeadTime: boolean;
}

export interface EventExportData {
  version: string;
  exportedAt: string;
  event: Event;
  categories: BudgetCategory[];
  expenses: Expense[];
  tasks: TimelineTask[];
  vendors: Vendor[];
  checklist: ChecklistItem[];
  ideas: SavedIdea[];
}
