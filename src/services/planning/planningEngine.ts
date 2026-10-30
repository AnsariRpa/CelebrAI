/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BudgetCategory,
  BudgetMetrics,
  ChecklistItem,
  Event,
  EventType,
  Expense,
  ReadinessMetrics,
  ReplanProposal,
  ReplanRequest,
  SavedIdea,
  TaskPriority,
  TimelineTask,
  Vendor,
  VendorQuote,
} from '../../domain/types';
import { generateId, formatCurrency } from '../../domain/validation';
import { parseReplanIntent } from './intentParser';

/**
 * Category allocation blueprints by event type
 */
const BUDGET_BLUEPRINTS: Record<EventType, Array<{ name: string; percent: number; notes: string }>> = {
  wedding: [
    { name: 'Venue & Banquet Catering', percent: 40, notes: 'Main hall/lawn, multi-course feast, welcome drinks' },
    { name: 'Photography & Cinematography', percent: 12, notes: 'Candid, traditional portraits, drone, highlight film' },
    { name: 'Attire, Jewelry & Styling', percent: 10, notes: 'Ceremonial outfits, hair, makeup, accessories' },
    { name: 'Decor, Florals & Ambient Lighting', percent: 12, notes: 'Stage, mandap/altar, table centerpieces, entryway' },
    { name: 'Invitations & Ceremony Essentials', percent: 5, notes: 'Stationery, e-invites, officiant, ritual items' },
    { name: 'Sound, DJ & Live Entertainment', percent: 7, notes: 'Sound engineer, live performers, dance floor setup' },
    { name: 'Logistics, Transport & Hospitality', percent: 6, notes: 'Guest shuttles, stay coordination, welcome hampers' },
    { name: 'Emergency Contingency Reserve', percent: 8, notes: 'Buffer for unexpected guest surges, extra hour fees' },
  ],
  birthday: [
    { name: 'Food, Beverages & Catering', percent: 30, notes: 'Appetizers, main dinner, specialty drinks' },
    { name: 'Venue Booking / Space Rental', percent: 22, notes: 'Party hall, club room, or outdoor pavilion' },
    { name: 'Designer Cake & Sweet Table', percent: 10, notes: 'Tiered centerpiece cake, cupcakes, dessert styling' },
    { name: 'Theme Decor, Balloons & Backdrop', percent: 14, notes: 'Custom photobooth, arch, lighting, tableware' },
    { name: 'Host, DJ, Games & Performers', percent: 10, notes: 'Emcee, magician/entertainer, sound equipment' },
    { name: 'Photography & Memory Keepsakes', percent: 8, notes: 'Photographer coverage, instant prints' },
    { name: 'Return Favors & Contingency', percent: 6, notes: 'Curated gift bags and reserve fund' },
  ],
  anniversary: [
    { name: 'Dining, Cuisine & Fine Beverage', percent: 36, notes: 'Gourmet dinner, signature cocktails, curated tasting' },
    { name: 'Venue & Intimate Atmosphere', percent: 24, notes: 'Private dining room, boutique estate, or scenic terrace' },
    { name: 'Floral Art, Lighting & Styling', percent: 14, notes: 'Candlelight, premium florals, personalized signage' },
    { name: 'Photographer & Legacy Video', percent: 10, notes: 'Couple session, family tributes, memory archive' },
    { name: 'Acoustic Music / Ensemble', percent: 8, notes: 'Strings, jazz trio, or subtle ambient playlist' },
    { name: 'Contingency & Custom Touches', percent: 8, notes: 'Anniversary cake, guestbook, surprise elements' },
  ],
  community: [
    { name: 'Community Feast & Refreshment Stations', percent: 26, notes: 'Hygienic catering, tea/snack stalls, drinking water' },
    { name: 'Sound, Lighting & Stage AV Gear', percent: 24, notes: 'Microphones, public address system, stage trusses' },
    { name: 'Venue Grounds & Municipal Permits', percent: 18, notes: 'Ground rental, safety licenses, local clearances' },
    { name: 'Publicity, Signage & Registration', percent: 10, notes: 'Banners, volunteer t-shirts, badges, web portal' },
    { name: 'Sanitation, First-Aid & Security', percent: 10, notes: 'Waste collection, paramedical kit, barricades' },
    { name: 'Contingency & Incident Reserve', percent: 12, notes: 'Power generators, weather cover, volunteer backup' },
  ],
  other: [
    { name: 'Primary Venue & Facilities', percent: 30, notes: 'Main space rental and amenities' },
    { name: 'Food & Beverage Service', percent: 30, notes: 'Full food service and refreshments' },
    { name: 'Decor, Signage & Setup', percent: 15, notes: 'Thematic elements, visual markers' },
    { name: 'Audio, Visual & Technical', percent: 10, notes: 'Microphones, screens, sound setup' },
    { name: 'Coordination & Operational Staff', percent: 5, notes: 'Day-of support and execution helpers' },
    { name: 'Contingency Fund', percent: 10, notes: 'Buffer for unforeseen additions' },
  ],
};

/**
 * Generates balanced budget categories where allocated amounts sum exactly to totalBudget
 */
export function generateBudgetAllocation(event: Event): BudgetCategory[] {
  const blueprint = BUDGET_BLUEPRINTS[event.type] || BUDGET_BLUEPRINTS.other;
  const totalBudget = Math.max(0, Math.round(event.totalBudget));

  let remainingToDistribute = totalBudget;
  const categories: BudgetCategory[] = [];

  blueprint.forEach((item, index) => {
    const isLast = index === blueprint.length - 1;
    // Calculate category portion using integer rounding
    let allocatedAmount = Math.round((totalBudget * item.percent) / 100);

    // Ensure the last item absorbs any rounding remainder
    if (isLast) {
      allocatedAmount = Math.max(0, remainingToDistribute);
    } else {
      allocatedAmount = Math.min(allocatedAmount, remainingToDistribute);
      remainingToDistribute -= allocatedAmount;
    }

    categories.push({
      id: generateId(),
      eventId: event.id,
      name: item.name,
      allocatedPercent: item.percent,
      allocatedAmount,
      estimatedAmount: allocatedAmount,
      actualSpent: 0,
      notes: item.notes,
    });
  });

  return categories;
}

/**
 * Calculates budget summaries, paid vs committed, remaining, and cost-saving suggestions
 */
export function calculateBudgetMetrics(
  totalBudget: number,
  categories: BudgetCategory[],
  expenses: Expense[],
  vendors: Vendor[]
): BudgetMetrics {
  const totalAllocated = categories.reduce((sum, c) => sum + (c.allocatedAmount || 0), 0);
  const totalEstimated = categories.reduce((sum, c) => sum + (c.estimatedAmount || 0), 0);
  
  // Sum of recorded expenses
  const totalActual = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // Sum of amounts paid
  const totalPaid = expenses.reduce((sum, e) => {
    if (e.paymentStatus === 'paid') return sum + e.amount;
    return sum + (e.amountPaid || 0);
  }, 0);

  // Outstanding commitments to vendors (agreed cost minus amount paid on booked/negotiating vendors)
  // that have not yet been logged as paid expenses
  const totalCommitted = vendors.reduce((sum, v) => {
    if (v.bookingStatus === 'booked' || v.bookingStatus === 'negotiating') {
      const outstanding = Math.max(0, (v.agreedCost || v.estimatedCost || 0) - (v.amountPaid || 0));
      return sum + outstanding;
    }
    return sum;
  }, 0);

  const remainingBudget = totalBudget - totalActual;
  const isOverspent = totalActual > totalBudget;
  const overspentAmount = isOverspent ? totalActual - totalBudget : 0;
  const utilizationPercent = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

  // Generate actionable, respectful cost-saving suggestions if spending is high
  const costSavingSuggestions: string[] = [];

  if (utilizationPercent > 85 || isOverspent) {
    costSavingSuggestions.push(
      'Review decor rentals: Opt for in-season local blooms and warm candle clusters over imported floral structures.'
    );
    costSavingSuggestions.push(
      'Streamline food menus: Consolidate live food stations into a cohesive 4-course curated feast to cut plate wastage.'
    );
    costSavingSuggestions.push(
      'Digital invitation suite: Switch remaining guest announcements to animated digital RSVPs to save on paper & courier costs.'
    );
    costSavingSuggestions.push(
      'Negotiate bundled vendor packages (e.g., combined photography + drone videography or DJ + stage ambient lights).'
    );
    costSavingSuggestions.push(
      'Note: Essential safety measures, guest accessibility accommodations, and food hygiene must remain fully funded.'
    );
  }

  return {
    totalBudget,
    totalAllocated,
    totalEstimated,
    totalActual,
    totalPaid,
    totalCommitted,
    remainingBudget,
    utilizationPercent,
    isOverspent,
    overspentAmount,
    costSavingSuggestions,
  };
}

/**
 * Generates a realistic, date-aware chronological timeline of planning tasks with explicit dependencies
 */
export function generateTimeline(event: Event, referenceDate: Date = new Date()): TimelineTask[] {
  const eventDate = new Date(event.date + 'T00:00:00');
  const now = new Date(referenceDate);
  now.setHours(0, 0, 0, 0);

  const diffTime = eventDate.getTime() - now.getTime();
  const totalDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isCompressed = totalDaysRemaining < 30 && totalDaysRemaining >= 0;

  // Helper to format ISO date
  const addDays = (base: Date, days: number): string => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Safe due date calculator: never assigns a due date in the past
  const calculateDueDate = (targetDaysBeforeEvent: number): string => {
    if (totalDaysRemaining <= 0) {
      return event.date;
    }

    if (totalDaysRemaining <= targetDaysBeforeEvent) {
      const fractionalOffset = Math.max(1, Math.floor(totalDaysRemaining * 0.4));
      return addDays(now, Math.min(fractionalOffset, totalDaysRemaining));
    }

    return addDays(eventDate, -targetDaysBeforeEvent);
  };

  const tasks: TimelineTask[] = [];

  if (event.type === 'wedding') {
    const t1Id = `task-venue-${event.id}`;
    const t2Id = `task-photo-${event.id}`;
    const t3Id = `task-tasting-${event.id}`;
    const t4Id = `task-invites-${event.id}`;
    const t5Id = `task-attire-${event.id}`;
    const t6Id = `task-access-${event.id}`;
    const t7Id = `task-seating-${event.id}`;
    const t8Id = `task-walkthrough-${event.id}`;
    const t9Id = `task-execution-${event.id}`;

    tasks.push({
      id: t1Id,
      eventId: event.id,
      title: 'Finalize & Reserve Main Celebration Venue',
      description: 'Review hall capacity for ' + event.guestCount + ' guests, air-conditioning, backup generators, and curfew times.',
      dueDate: calculateDueDate(120),
      priority: 'urgent',
      status: 'not_started',
      category: 'Venue & Facilities',
      isCompressedDeadline: isCompressed,
      downstreamTaskIds: [t3Id, t4Id, t6Id],
    });

    tasks.push({
      id: t2Id,
      eventId: event.id,
      title: 'Book Lead Photographer & Cinematographer',
      description: 'Confirm coverage hours, drone clearance, deliverables timeline, and review portfolio albums.',
      dueDate: calculateDueDate(90),
      priority: 'high',
      status: 'not_started',
      category: 'Media',
      isCompressedDeadline: isCompressed,
    });

    tasks.push({
      id: t3Id,
      eventId: event.id,
      title: 'Menu Tasting & Catering Finalization',
      description: 'Finalize menu items honoring dietary preferences (' + (event.preferences.dietaryRequirements.join(', ') || 'Standard') + ').',
      dueDate: calculateDueDate(60),
      priority: 'high',
      status: 'not_started',
      category: 'Catering',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: t1Id,
      dependencyNote: 'Requires venue kitchen & layout confirmation first.',
    });

    tasks.push({
      id: t4Id,
      eventId: event.id,
      title: 'Send Save-the-Dates & Digital RSVPs',
      description: 'Dispatch invitations to ' + event.guestCount + ' estimated guests with venue map and accommodations info.',
      dueDate: calculateDueDate(45),
      priority: 'medium',
      status: 'not_started',
      category: 'Invitations',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: t1Id,
      downstreamTaskIds: [t7Id],
      dependencyNote: 'Requires venue location to print/send maps.',
    });

    tasks.push({
      id: t5Id,
      eventId: event.id,
      title: 'Ceremonial Attire & Wardrobe Fittings',
      description: 'Schedule final fittings for primary outfits, shoes, and matching accessories.',
      dueDate: calculateDueDate(30),
      priority: 'medium',
      status: 'not_started',
      category: 'Attire',
      isCompressedDeadline: isCompressed,
    });

    tasks.push({
      id: t6Id,
      eventId: event.id,
      title: 'Verify Accessibility Accommodations',
      description: 'Confirm step-free ramps, priority seating, and mobility assistance at the entrance.',
      dueDate: calculateDueDate(20),
      priority: 'high',
      status: 'not_started',
      category: 'Accessibility',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: t1Id,
    });

    tasks.push({
      id: t7Id,
      eventId: event.id,
      title: 'Final Guest Count & Seating Chart',
      description: 'Lock in head count with caterer and provide designated VIP/family table layout.',
      dueDate: calculateDueDate(10),
      priority: 'urgent',
      status: 'not_started',
      category: 'Coordination',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: t4Id,
      downstreamTaskIds: [t8Id],
      dependencyNote: 'Requires RSVP confirmations.',
    });

    tasks.push({
      id: t8Id,
      eventId: event.id,
      title: 'Day-Before Vendor Walkthrough & Run of Show',
      description: 'Conduct sound-check, review timeline with emcee, and confirm vendor arrival slots.',
      dueDate: calculateDueDate(1),
      priority: 'urgent',
      status: 'not_started',
      category: 'Logistics',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: t7Id,
      downstreamTaskIds: [t9Id],
    });

    tasks.push({
      id: t9Id,
      eventId: event.id,
      title: 'Day-Of Celebration Coordination',
      description: 'Supervise vendor load-in, coordinate couple entry, and oversee guest banquet flow.',
      dueDate: event.date,
      priority: 'urgent',
      status: 'not_started',
      category: 'Execution',
      isCompressedDeadline: false,
      dependsOnTaskId: t8Id,
    });
  } else if (event.type === 'birthday') {
    const b1Id = `task-bvenue-${event.id}`;
    const b2Id = `task-bcake-${event.id}`;
    const b3Id = `task-binvites-${event.id}`;
    const b4Id = `task-bperform-${event.id}`;
    const b5Id = `task-bdecor-${event.id}`;
    const b6Id = `task-bday-${event.id}`;

    tasks.push({
      id: b1Id,
      eventId: event.id,
      title: 'Reserve Birthday Party Venue / Hall',
      description: 'Book space suitable for ' + event.guestCount + ' guests with space for activities.',
      dueDate: calculateDueDate(30),
      priority: 'urgent',
      status: 'not_started',
      category: 'Venue',
      isCompressedDeadline: isCompressed,
      downstreamTaskIds: [b3Id, b5Id],
    });

    tasks.push({
      id: b2Id,
      eventId: event.id,
      title: 'Order Custom Designer Cake',
      description: 'Choose flavor, custom theme toppers, and confirm dietary safety (nut-free / eggless if required).',
      dueDate: calculateDueDate(14),
      priority: 'high',
      status: 'not_started',
      category: 'Bakery',
      isCompressedDeadline: isCompressed,
    });

    tasks.push({
      id: b3Id,
      eventId: event.id,
      title: 'Send Party Invitations & Gather RSVPs',
      description: 'Collect headcounts and allergies from guests.',
      dueDate: calculateDueDate(12),
      priority: 'high',
      status: 'not_started',
      category: 'Invitations',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: b1Id,
      dependencyNote: 'Requires venue location.',
    });

    tasks.push({
      id: b4Id,
      eventId: event.id,
      title: 'Confirm Entertainment & Game Master',
      description: 'Book magician, DJ, or interactive activity leader.',
      dueDate: calculateDueDate(8),
      priority: 'medium',
      status: 'not_started',
      category: 'Entertainment',
      isCompressedDeadline: isCompressed,
    });

    tasks.push({
      id: b5Id,
      eventId: event.id,
      title: 'Procure Theme Decor & Return Favors',
      description: 'Gather photo backdrop, balloon garland, and curated gift boxes.',
      dueDate: calculateDueDate(4),
      priority: 'medium',
      status: 'not_started',
      category: 'Decor',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: b1Id,
    });

    tasks.push({
      id: b6Id,
      eventId: event.id,
      title: 'Day-Of Party Setup & Celebration',
      description: 'Decorate venue 2 hours prior, coordinate cake cutting, and host fun games.',
      dueDate: event.date,
      priority: 'urgent',
      status: 'not_started',
      category: 'Execution',
      isCompressedDeadline: false,
      dependsOnTaskId: b5Id,
    });
  } else if (event.type === 'community') {
    const c1Id = `task-cpermit-${event.id}`;
    const c2Id = `task-cvolunteers-${event.id}`;
    const c3Id = `task-cgear-${event.id}`;
    const c4Id = `task-csafety-${event.id}`;
    const c5Id = `task-cday-${event.id}`;

    tasks.push({
      id: c1Id,
      eventId: event.id,
      title: 'Secure Civic Venue & Mandatory Permits',
      description: 'File noise permits, municipal ground approvals, and emergency egress notifications.',
      dueDate: calculateDueDate(60),
      priority: 'urgent',
      status: 'not_started',
      category: 'Permits',
      isCompressedDeadline: isCompressed,
      downstreamTaskIds: [c3Id, c4Id],
    });

    tasks.push({
      id: c2Id,
      eventId: event.id,
      title: 'Form Volunteer Committee & Assign Roles',
      description: 'Designate team leads for registration, crowd flow, waste management, and hospitality.',
      dueDate: calculateDueDate(40),
      priority: 'high',
      status: 'not_started',
      category: 'Volunteers',
      isCompressedDeadline: isCompressed,
    });

    tasks.push({
      id: c3Id,
      eventId: event.id,
      title: 'Contract Sound, Stage & Power Generators',
      description: 'Ensure adequate microphones, outdoor PA amplification, and backup power switch.',
      dueDate: calculateDueDate(25),
      priority: 'high',
      status: 'not_started',
      category: 'Equipment',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: c1Id,
      dependencyNote: 'Requires municipal permit approval.',
    });

    tasks.push({
      id: c4Id,
      eventId: event.id,
      title: 'Deploy First-Aid & Emergency Safety Station',
      description: 'Confirm presence of certified first-responder and hydration / water stations.',
      dueDate: calculateDueDate(10),
      priority: 'urgent',
      status: 'not_started',
      category: 'Safety',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: c1Id,
    });

    tasks.push({
      id: c5Id,
      eventId: event.id,
      title: 'Day-Of Execution & Grounds Cleanup',
      description: 'Oversee stage schedule, ensure zero-waste litter cleanup, and wrap up.',
      dueDate: event.date,
      priority: 'urgent',
      status: 'not_started',
      category: 'Execution',
      isCompressedDeadline: false,
    });
  } else {
    // Anniversary or generic
    const g1Id = `task-gvenue-${event.id}`;
    const g2Id = `task-gcater-${event.id}`;
    const g3Id = `task-ginvites-${event.id}`;
    const g4Id = `task-gday-${event.id}`;

    tasks.push({
      id: g1Id,
      eventId: event.id,
      title: 'Confirm Event Venue Reservation',
      description: 'Lock in event space and confirm guest seating capacity for ' + event.guestCount + ' people.',
      dueDate: calculateDueDate(30),
      priority: 'urgent',
      status: 'not_started',
      category: 'Venue',
      isCompressedDeadline: isCompressed,
      downstreamTaskIds: [g2Id, g3Id],
    });

    tasks.push({
      id: g2Id,
      eventId: event.id,
      title: 'Finalize Food & Beverage Catering',
      description: 'Review catering order with consideration for ' + (event.preferences.dietaryRequirements.join(', ') || 'all guests') + '.',
      dueDate: calculateDueDate(15),
      priority: 'high',
      status: 'not_started',
      category: 'Catering',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: g1Id,
    });

    tasks.push({
      id: g3Id,
      eventId: event.id,
      title: 'Send Invitations & Confirm Attendees',
      description: 'Distribute invitations and confirm headcount.',
      dueDate: calculateDueDate(10),
      priority: 'medium',
      status: 'not_started',
      category: 'Invitations',
      isCompressedDeadline: isCompressed,
      dependsOnTaskId: g1Id,
    });

    tasks.push({
      id: g4Id,
      eventId: event.id,
      title: 'Day-Of Celebration Execution',
      description: 'Coordinate with hosts, welcome guests, and enjoy the celebration.',
      dueDate: event.date,
      priority: 'urgent',
      status: 'not_started',
      category: 'Execution',
      isCompressedDeadline: false,
      dependsOnTaskId: g3Id,
    });
  }

  return tasks;
}

/**
 * Checks timeline tasks for chronological order conflicts and identifies downstream tasks affected by overdue items
 */
export function checkTaskDependencies(
  tasks: TimelineTask[],
  referenceDate: Date = new Date()
): {
  conflicts: Array<{ taskId: string; prerequisiteId: string; message: string }>;
  downstreamDelays: Array<{ taskId: string; prerequisiteId: string; message: string }>;
} {
  const taskMap = new Map<string, TimelineTask>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  const conflicts: Array<{ taskId: string; prerequisiteId: string; message: string }> = [];
  const downstreamDelays: Array<{ taskId: string; prerequisiteId: string; message: string }> = [];

  const todayStr = referenceDate.toISOString().split('T')[0];

  tasks.forEach((task) => {
    if (!task.dependsOnTaskId) return;

    const prereq = taskMap.get(task.dependsOnTaskId);
    if (!prereq) return;

    // Conflict: Dependent task is due earlier than its prerequisite
    if (task.dueDate < prereq.dueDate) {
      conflicts.push({
        taskId: task.id,
        prerequisiteId: prereq.id,
        message: `Task "${task.title}" is scheduled on ${task.dueDate}, which is earlier than its prerequisite "${prereq.title}" (${prereq.dueDate}).`,
      });
    }

    // Downstream Delay: Prerequisite is overdue and not completed, blocking this task
    if (prereq.status !== 'completed' && prereq.dueDate < todayStr) {
      downstreamDelays.push({
        taskId: task.id,
        prerequisiteId: prereq.id,
        message: `Downstream impact: "${task.title}" is blocked because prerequisite "${prereq.title}" is overdue (was due ${prereq.dueDate}).`,
      });
    }
  });

  return { conflicts, downstreamDelays };
}

/**
 * Compares multiple vendor quotations against category budget and guest count
 */
export function compareVendorQuotes(
  categoryBudget: number,
  quotes: VendorQuote[],
  guestCount?: number
): {
  categoryBudget: number;
  quoteCount: number;
  lowestQuote: number;
  highestQuote: number;
  bestValueQuoteId?: string;
  comparisons: Array<{
    quote: VendorQuote;
    varianceFromBudget: number;
    percentOfBudget: number;
    perGuestCost?: number;
    missingInformationCount: number;
    missingInformationList: string[];
  }>;
} {
  if (quotes.length === 0) {
    return {
      categoryBudget,
      quoteCount: 0,
      lowestQuote: 0,
      highestQuote: 0,
      comparisons: [],
    };
  }

  let lowestQuote = quotes[0].quotedAmount;
  let highestQuote = quotes[0].quotedAmount;
  let bestValueQuoteId = quotes[0].id;
  let maxScore = -Infinity;

  const comparisons = quotes.map((quote) => {
    if (quote.quotedAmount < lowestQuote) lowestQuote = quote.quotedAmount;
    if (quote.quotedAmount > highestQuote) highestQuote = quote.quotedAmount;

    const varianceFromBudget = quote.quotedAmount - categoryBudget;
    const percentOfBudget = categoryBudget > 0 ? Math.round((quote.quotedAmount / categoryBudget) * 100) : 0;
    const perGuestCost = guestCount && guestCount > 0 ? Math.round(quote.quotedAmount / guestCount) : undefined;

    // Audit missing essential information
    const missingInformationList: string[] = [];
    if (quote.missingInfo !== undefined) {
      missingInformationList.push(...quote.missingInfo);
    } else {
      if (!quote.paymentTerms || quote.paymentTerms.trim() === '') {
        missingInformationList.push('Missing explicit payment / advance deposit terms');
      }
      if (!quote.additionalChargesNotes || quote.additionalChargesNotes.trim() === '') {
        missingInformationList.push('Missing overtime / tax / travel surcharge disclosure');
      }
      if (guestCount && (!quote.guestCapacity || quote.guestCapacity < guestCount)) {
        missingInformationList.push(`Unverified guest capacity (event has ${guestCount} guests)`);
      }
    }

    // Score based on value (within budget + inclusions count - missing info penalty)
    const isUnderBudget = quote.quotedAmount <= categoryBudget;
    const score = (isUnderBudget ? 100 : 50) + (quote.servicesIncluded.length * 10) - (missingInformationList.length * 15);
    if (score > maxScore) {
      maxScore = score;
      bestValueQuoteId = quote.id;
    }

    return {
      quote,
      varianceFromBudget,
      percentOfBudget,
      perGuestCost,
      missingInformationCount: missingInformationList.length,
      missingInformationList,
    };
  });

  return {
    categoryBudget,
    quoteCount: quotes.length,
    lowestQuote,
    highestQuote,
    bestValueQuoteId,
    comparisons,
  };
}

/**
 * Intelligent Replanning Engine:
 * Re-evaluates an existing celebration plan when budget decreases, date shifts earlier, or guest count changes.
 * Preserves completed tasks, recorded actual expenses, and booked vendors.
 */
export function generateReplanProposal(
  event: Event,
  categories: BudgetCategory[],
  expenses: Expense[],
  tasks: TimelineTask[],
  vendors: Vendor[],
  request: ReplanRequest,
  referenceDate: Date = new Date()
): ReplanProposal {
  const currentBudget = event.totalBudget;
  const newBudget = request.newTotalBudget !== undefined ? Math.max(0, request.newTotalBudget) : currentBudget;
  const budgetDelta = newBudget - currentBudget;

  const currentDateObj = new Date(event.date + 'T00:00:00');
  const newDateStr = request.newDate || event.date;
  const newDateObj = new Date(newDateStr + 'T00:00:00');
  const dateShiftDays = Math.round((newDateObj.getTime() - currentDateObj.getTime()) / (1000 * 60 * 60 * 24));

  const currentGuests = event.guestCount;
  const newGuests = request.newGuestCount !== undefined ? Math.max(1, request.newGuestCount) : currentGuests;
  const guestDelta = newGuests - currentGuests;

  const priorityFocus = request.priorityFocus || event.preferences.priorityFocus || 'food_guest_experience';

  // 1. Calculate Category Adjustments
  const totalActualSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categorySpentMap = new Map<string, number>();
  categories.forEach((c) => categorySpentMap.set(c.id, c.actualSpent || 0));

  // Determine which categories are protected
  // If priority is food_guest_experience: Venue & Catering is protected
  // If priority is venue_atmosphere: Venue & Decor are protected
  // If priority is media_memories: Photography & Cinematography are protected
  const categoryAdjustments: ReplanProposal['categoryAdjustments'] = [];
  let remainingBudgetToDistribute = newBudget;

  // Clone categories to prepare reallocation
  const workingCats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    currentAllocated: c.allocatedAmount,
    currentSpent: c.actualSpent || 0,
    isProtected: false,
    weight: 1.0,
  }));

  workingCats.forEach((c) => {
    const nameLower = c.name.toLowerCase();
    if (priorityFocus === 'food_guest_experience') {
      if (nameLower.includes('catering') || nameLower.includes('food') || nameLower.includes('dining')) {
        c.isProtected = true;
        c.weight = 1.35; // Priority boost
      } else if (nameLower.includes('decor') || nameLower.includes('floral')) {
        c.weight = 0.65; // Flexible reduction candidate
      } else if (nameLower.includes('invitation')) {
        c.weight = 0.50; // Switch to digital
      } else if (nameLower.includes('logistics') || nameLower.includes('transport')) {
        c.weight = 0.70;
      }
    } else if (priorityFocus === 'venue_atmosphere') {
      if (nameLower.includes('venue') || nameLower.includes('decor')) {
        c.isProtected = true;
        c.weight = 1.30;
      } else {
        c.weight = 0.75;
      }
    } else if (priorityFocus === 'media_memories') {
      if (nameLower.includes('photo') || nameLower.includes('video') || nameLower.includes('media')) {
        c.isProtected = true;
        c.weight = 1.40;
      } else {
        c.weight = 0.80;
      }
    }
  });

  // Calculate total weighted base
  const totalWeight = workingCats.reduce((s, c) => s + (c.currentAllocated * c.weight), 0);

  workingCats.forEach((cat, index) => {
    const isLast = index === workingCats.length - 1;
    let proposed = Math.round((newBudget * (cat.currentAllocated * cat.weight)) / (totalWeight || 1));

    // Must never be less than actual spent
    if (proposed < cat.currentSpent) {
      proposed = cat.currentSpent;
    }

    if (isLast) {
      proposed = Math.max(cat.currentSpent, remainingBudgetToDistribute);
    } else {
      proposed = Math.min(proposed, remainingBudgetToDistribute);
      remainingBudgetToDistribute -= proposed;
    }

    const delta = proposed - cat.currentAllocated;
    let reason = 'Proportionally scaled to match revised budget.';
    if (cat.isProtected) {
      reason = 'Protected category: prioritized according to your stated preference for food and guest experience.';
    } else if (delta < 0) {
      if (cat.name.toLowerCase().includes('decor')) {
        reason = 'Reduced decorative scope: recommend local seasonal florals and ambient warm candlelight.';
      } else if (cat.name.toLowerCase().includes('invitation')) {
        reason = 'Digital RSVP suite: saves on physical stationery and courier fees.';
      } else if (cat.name.toLowerCase().includes('sound') || cat.name.toLowerCase().includes('dj')) {
        reason = 'Package bundling: negotiate combined lighting and sound with a single operator.';
      }
    }

    categoryAdjustments.push({
      categoryId: cat.id,
      categoryName: cat.name,
      currentAllocated: cat.currentAllocated,
      proposedAllocated: proposed,
      currentSpent: cat.currentSpent,
      delta,
      reason,
      isProtected: cat.isProtected,
    });
  });

  // 2. Calculate Timeline Adjustments with Dependency Awareness
  const now = new Date(referenceDate);
  now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().split('T')[0];

  const timelineAdjustments: ReplanProposal['timelineAdjustments'] = [];

  tasks.forEach((task) => {
    // If task is completed, keep due date and priority intact
    if (task.status === 'completed') {
      timelineAdjustments.push({
        taskId: task.id,
        title: task.title,
        oldDueDate: task.dueDate,
        newDueDate: task.dueDate,
        oldPriority: task.priority,
        newPriority: task.priority,
        isOverdue: false,
        isCompressed: false,
        reason: 'Preserved: Task is already completed.',
      });
      return;
    }

    // Shift uncompleted task due dates proportionally to the new event date
    const oldDueObj = new Date(task.dueDate + 'T00:00:00');
    const oldEventObj = new Date(event.date + 'T00:00:00');
    const daysBeforeOld = Math.round((oldEventObj.getTime() - oldDueObj.getTime()) / (1000 * 60 * 60 * 24));

    // Shifted target date
    const newTargetDueObj = new Date(newDateObj);
    newTargetDueObj.setDate(newTargetDueObj.getDate() - daysBeforeOld);

    let newDueDate = newTargetDueObj.toISOString().split('T')[0];
    let isCompressed = false;
    let isOverdue = false;

    // If new due date is past today or compressed
    if (newDueDate < todayStr) {
      isOverdue = true;
      // Do not leave in past without explanation; push to today + 2 days as an urgent recovery task
      const recoveryDate = new Date(now);
      recoveryDate.setDate(recoveryDate.getDate() + 2);
      newDueDate = recoveryDate.toISOString().split('T')[0];
    } else {
      const daysUntilDue = Math.round((new Date(newDueDate + 'T00:00:00').getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 14) {
        isCompressed = true;
      }
    }

    // Adjust priority if window is compressed
    let newPriority: TaskPriority = task.priority;
    if (isOverdue || isCompressed) {
      if (task.priority === 'low' || task.priority === 'medium') newPriority = 'high';
      if (task.priority === 'high' && isOverdue) newPriority = 'urgent';
    }

    timelineAdjustments.push({
      taskId: task.id,
      title: task.title,
      oldDueDate: task.dueDate,
      newDueDate,
      oldPriority: task.priority,
      newPriority,
      isOverdue,
      isCompressed,
      reason: dateShiftDays < 0
        ? `Shifted earlier due to event moving forward by ${Math.abs(dateShiftDays)} days.`
        : 'Aligned with revised event timeline.',
    });
  });

  // 3. Guest Impact Notes
  const guestImpactNotes: string[] = [];
  if (guestDelta !== 0) {
    const perGuestEstimate = Math.round((event.totalBudget * 0.35) / (event.guestCount || 1));
    const cateringImpact = Math.abs(guestDelta) * perGuestEstimate;
    if (guestDelta < 0) {
      guestImpactNotes.push(
        `Guest count reduced by ${Math.abs(guestDelta)}. Estimated catering and beverage savings: ~${formatCurrency(cateringImpact, event.currency)} (based on estimated ${formatCurrency(perGuestEstimate, event.currency)}/guest).`
      );
    } else {
      guestImpactNotes.push(
        `Guest count increased by ${guestDelta}. Estimated catering surcharge: ~${formatCurrency(cateringImpact, event.currency)} (ensure venue capacity allows ${newGuests} guests).`
      );
    }
  }

  // 4. Trade-Offs (What is gained and sacrificed)
  const gained: string[] = [];
  const sacrificed: string[] = [];

  if (budgetDelta < 0) {
    gained.push(`Maintains complete financial solvency within the revised budget of ${formatCurrency(newBudget, event.currency)}.`);
    if (priorityFocus === 'food_guest_experience') {
      gained.push('Banquet food quality and multi-course culinary experience remain fully protected.');
      sacrificed.push('Elaborate floral structures and imported flowers replaced by seasonal local blooms and ambient candle styling.');
      sacrificed.push('Physical printed invitation paper suites converted to animated digital RSVP suites.');
    }
  } else if (budgetDelta > 0) {
    gained.push(`Additional ${formatCurrency(budgetDelta, event.currency)} buffer available to upgrade guest hospitality or live performers.`);
  } else if (budgetDelta === 0 && dateShiftDays === 0 && guestDelta === 0) {
    gained.push('Preserves all existing category allocations, vendor commitments, and milestone deadlines.');
  }

  if (dateShiftDays < 0) {
    sacrificed.push(`Planning window tightened by ${Math.abs(dateShiftDays)} days; immediate action required on venue walkthrough and vendor contracts.`);
  }

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const bookedVendorsCount = vendors.filter((v) => v.bookingStatus === 'booked').length;

  return {
    id: generateId(),
    eventId: event.id,
    timestamp: new Date().toISOString(),
    summary: `Replan Proposal for ${event.name}: Budget adjusted by ${formatCurrency(budgetDelta, event.currency)}, event date shifted by ${dateShiftDays} days, prioritizing ${priorityFocus.replace(/_/g, ' ')}.`,
    changesSummary: {
      budgetDelta,
      dateShiftDays,
      guestDelta,
      affectedCategoriesCount: categoryAdjustments.filter((c) => c.delta !== 0).length,
      compressedTasksCount: timelineAdjustments.filter((t) => t.isCompressed || t.isOverdue).length,
    },
    categoryAdjustments,
    timelineAdjustments,
    guestImpactNotes,
    tradeOffs: { gained, sacrificed },
    preservedItems: {
      completedTasksCount,
      actualExpensesCount: expenses.length,
      bookedVendorsCount,
    },
  };
}

/**
 * Applies an approved replan proposal to the existing event, categories, and tasks
 */
export function applyReplanProposal(
  event: Event,
  arg2: ReplanProposal | BudgetCategory[],
  arg3: BudgetCategory[] | TimelineTask[],
  arg4?: TimelineTask[] | ReplanProposal
): {
  event: Event;
  categories: BudgetCategory[];
  tasks: TimelineTask[];
  updatedEvent: Event;
  updatedCategories: BudgetCategory[];
  updatedTasks: TimelineTask[];
} {
  let proposal: ReplanProposal;
  let currentCategories: BudgetCategory[];
  let currentTasks: TimelineTask[];

  if (arg2 && typeof arg2 === 'object' && 'changesSummary' in arg2) {
    proposal = arg2 as ReplanProposal;
    currentCategories = (arg3 as BudgetCategory[]) || [];
    currentTasks = (arg4 as TimelineTask[]) || [];
  } else {
    currentCategories = (arg2 as BudgetCategory[]) || [];
    currentTasks = (arg3 as TimelineTask[]) || [];
    proposal = arg4 as ReplanProposal;
  }

  const newBudget = event.totalBudget + proposal.changesSummary.budgetDelta;
  const newGuests = event.guestCount + proposal.changesSummary.guestDelta;

  let newDate = event.date;
  if (proposal.changesSummary.dateShiftDays !== 0) {
    const d = new Date(event.date + 'T00:00:00');
    d.setDate(d.getDate() + proposal.changesSummary.dateShiftDays);
    newDate = d.toISOString().split('T')[0];
  }

  const updatedEvent: Event = {
    ...event,
    totalBudget: newBudget,
    guestCount: newGuests,
    date: newDate,
    updatedAt: new Date().toISOString(),
  };

  // Update categories with proposed allocation
  const catAdjustmentMap = new Map<string, number>();
  proposal.categoryAdjustments.forEach((adj) => {
    catAdjustmentMap.set(adj.categoryId, adj.proposedAllocated);
  });

  const updatedCategories = currentCategories.map((cat) => {
    const proposed = catAdjustmentMap.get(cat.id);
    if (proposed !== undefined) {
      const allocatedPercent = newBudget > 0 ? Math.round((proposed / newBudget) * 100) : 0;
      return {
        ...cat,
        allocatedAmount: proposed,
        estimatedAmount: proposed,
        allocatedPercent,
      };
    }
    return cat;
  });

  // Update timeline tasks with shifted due dates and priorities, PRESERVING completed status
  const taskAdjustmentMap = new Map<string, { newDueDate: string; newPriority: TaskPriority }>();
  proposal.timelineAdjustments.forEach((adj) => {
    taskAdjustmentMap.set(adj.taskId, { newDueDate: adj.newDueDate, newPriority: adj.newPriority });
  });

  const updatedTasks = currentTasks.map((task) => {
    const adj = taskAdjustmentMap.get(task.id);
    if (adj) {
      return {
        ...task,
        dueDate: task.status === 'completed' ? task.dueDate : adj.newDueDate,
        priority: adj.newPriority,
      };
    }
    return task;
  });

  return {
    event: updatedEvent,
    categories: updatedCategories,
    tasks: updatedTasks,
    updatedEvent,
    updatedCategories,
    updatedTasks,
  };
}

/**
 * Generates initial vendor list and comparison checklists
 */
export function generateVendorChecklist(event: Event): { vendors: Vendor[]; checklist: ChecklistItem[] } {
  const vendors: Vendor[] = [];
  const checklist: ChecklistItem[] = [];

  const addVendor = (name: string, category: string, estPercent: number) => {
    const est = Math.round((event.totalBudget * estPercent) / 100);
    vendors.push({
      id: generateId(),
      eventId: event.id,
      name,
      category,
      estimatedCost: est,
      agreedCost: 0,
      amountPaid: 0,
      bookingStatus: 'researching',
      paymentStatus: 'pending',
      contractNotes: '',
      eventNotes: 'Compare at least 2 quotes before confirming.',
    });
  };

  const addCheck = (category: string, title: string, description: string) => {
    checklist.push({
      id: generateId(),
      eventId: event.id,
      category,
      title,
      description,
      isCompleted: false,
    });
  };

  if (event.type === 'wedding') {
    addVendor('Grand Banquet & Lawn Coordinator', 'Venue', 0.28);
    addVendor('Gourmet Master Caterer', 'Catering', 0.16);
    addVendor('Candid & Traditional Studio', 'Photography', 0.12);
    addVendor('Floral & Mandap Scenography', 'Decor', 0.10);
    addVendor('Live Ensemble & DJ Entertainment', 'Music', 0.06);

    addCheck('Venue Verification', 'Verify generator backup and overtime fee terms in writing', 'Ensure no surprise charges if celebration runs late.');
    addCheck('Catering Quality', 'Confirm certified food safety protocols and dietary counters', 'Separate designated allergen/vegetarian serving tongs.');
    addCheck('Media Rights', 'Confirm RAW photo ownership and expected album delivery window', 'Industry standard is 4 to 8 weeks.');
    addCheck('Accessibility Audit', 'Inspect wheelchair ramps and accessible restroom access', 'Required for elder relatives and guests.');
  } else if (event.type === 'birthday') {
    addVendor('Party Space / Private Hall', 'Venue', 0.22);
    addVendor('Artisan Confectioner & Cake Studio', 'Bakery', 0.10);
    addVendor('Balloon Scenographer & Theme Decor', 'Decor', 0.12);
    addVendor('Interactive Emcee & Activity Host', 'Entertainment', 0.10);

    addCheck('Venue Safety', 'Ensure child-proof electrical outlets and open play area', 'Safe space for active games.');
    addCheck('Cake Handling', 'Confirm refrigerated storage at venue until cake cutting ceremony', 'Crucial for butter cream / ice cream cakes.');
  } else if (event.type === 'community') {
    addVendor('Civic Grounds Management', 'Venue', 0.20);
    addVendor('Pro Audio & Outdoor Stage Crew', 'AV & Sound', 0.22);
    addVendor('Community Kitchen Caterer', 'Catering', 0.24);
    addVendor('Sanitation & Waste Management Partner', 'Sanitation', 0.10);

    addCheck('Permit Clearances', 'Verify municipal NOC and fire safety certificate', 'Mandatory for public community assemblies.');
    addCheck('Safety First', 'Stock central first-aid kit with burn/cut care and oral rehydration', 'Position prominently near registration.');
  } else {
    addVendor('Event Space Partner', 'Venue', 0.25);
    addVendor('Catering & Hospitality Service', 'Catering', 0.25);
    addCheck('Contract Check', 'Verify cancellation and refund terms in written contract', 'Standard practice for event agreements.');
  }

  return { vendors, checklist };
}

/**
 * Generates personalized, context-specific ideas and recommendations
 */
export function generatePersonalizedIdeas(event: Event): SavedIdea[] {
  const ideas: SavedIdea[] = [];
  const style = event.preferences.style || 'elegant';
  const hasDietary = event.preferences.dietaryRequirements.length > 0;
  const isOutdoor = event.venuePreference === 'outdoor' || event.venuePreference === 'mixed';

  // 1. Theme and Decor Idea
  ideas.push({
    id: generateId(),
    eventId: event.id,
    category: 'theme',
    title: `${style.charAt(0).toUpperCase() + style.slice(1)} Aesthetic Curation`,
    description: `A balanced ${style} design using ${event.preferences.themeDescription || 'natural textures, gentle warm lighting, and understated brass or metallic accents'}.`,
    practicalTip: 'Focus 70% of decorative budget on the central stage / entrance photo area where 90% of guest photos will be captured.',
    isSaved: true,
    isUsed: false,
  });

  // 2. Menu Concept
  const dietaryNote = hasDietary
    ? `with dedicated stations for ${event.preferences.dietaryRequirements.join(' & ')} guests`
    : 'with balanced seasonal flavors';
  ideas.push({
    id: generateId(),
    eventId: event.id,
    category: 'menu',
    title: 'Curated Tasting & Dietary-Inclusive Banquet',
    description: `A thoughtfully paced dining experience ${dietaryNote}. Includes welcome infused coolers, artisanal starters, and hearty signature mains.`,
    practicalTip: 'Print small, elegant menu cards with clear allergen icons (GF, Vegan, Nut-Free) to minimize guest inquiries.',
    isSaved: true,
    isUsed: false,
  });

  // 3. Weather / Contingency
  if (isOutdoor) {
    ideas.push({
      id: generateId(),
      eventId: event.id,
      category: 'contingency',
      title: 'Weather-Proof Contingency Framework',
      description: 'Complete backup plan with waterproof canopy tenting, enclosed side draping, and elevated wooden flooring.',
      practicalTip: 'Contract a 48-hour tentative hold on marquee tents with your decor vendor with a nominal deposit.',
      isSaved: true,
      isUsed: false,
    });
  }

  // 4. Guest Engagement
  ideas.push({
    id: generateId(),
    eventId: event.id,
    category: 'guest_experience',
    title: 'Interactive Memory Capsule & Audio Guestbook',
    description: 'A vintage rotary phone or QR-activated digital guestbook where friends and family record voice toasts and heartfelt memories.',
    practicalTip: 'Place this in a quiet lounge nook away from loud stage loudspeakers so audio recordings remain crisp.',
    isSaved: false,
    isUsed: false,
  });

  // 5. Sustainable Planning
  ideas.push({
    id: generateId(),
    eventId: event.id,
    category: 'sustainability',
    title: 'Eco-Conscious Zero-Plastic Protocol',
    description: 'Replace single-use plastic water bottles with elegant glass carafes and donate surplus untouched food to local verified food banks.',
    practicalTip: 'Partner with a local charity prior to the event; they provide food-grade insulated boxes and take care of pickup.',
    isSaved: false,
    isUsed: false,
  });

  return ideas;
}

/**
 * Calculates a balanced event readiness score (0 - 100)
 */
export function calculateReadinessScore(
  event: Event,
  tasks: TimelineTask[],
  vendors: Vendor[],
  budgetMetrics: BudgetMetrics,
  referenceDate: Date = new Date()
): ReadinessMetrics {
  const eventDate = new Date(event.date + 'T00:00:00');
  const now = new Date(referenceDate);
  now.setHours(0, 0, 0, 0);

  const diffTime = eventDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isPast = daysRemaining < 0;
  const isUrgentLeadTime = daysRemaining <= 14 && daysRemaining >= 0;

  // Task readiness: % of completed tasks
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const taskReadiness = tasks.length > 0 ? Math.round(((completedTasks + inProgressTasks * 0.4) / tasks.length) * 100) : 50;

  // Vendor readiness: % of booked vendors
  const bookedVendors = vendors.filter((v) => v.bookingStatus === 'booked').length;
  const contactedVendors = vendors.filter((v) => v.bookingStatus === 'contacted' || v.bookingStatus === 'negotiating').length;
  const vendorReadiness = vendors.length > 0 ? Math.round(((bookedVendors + contactedVendors * 0.4) / vendors.length) * 100) : 50;

  // Budget readiness: healthy if allocations set and not excessively overspent
  let budgetReadiness = 100;
  if (budgetMetrics.isOverspent) {
    budgetReadiness = Math.max(30, 100 - Math.min(60, Math.round((budgetMetrics.overspentAmount / budgetMetrics.totalBudget) * 100)));
  }

  // Weighted overall readiness
  const overallScore = Math.round(taskReadiness * 0.45 + vendorReadiness * 0.35 + budgetReadiness * 0.2);

  let label = 'Getting Started';
  if (overallScore >= 85) label = 'Celebration Ready';
  else if (overallScore >= 70) label = 'Almost Ready';
  else if (overallScore >= 50) label = 'On Track';
  else if (overallScore >= 30) label = 'In Progress';

  return {
    overallScore,
    label,
    budgetReadiness,
    taskReadiness,
    vendorReadiness,
    daysRemaining,
    isPast,
    isUrgentLeadTime,
  };
}

/**
 * Intelligent deterministic local planning assistant response generator
 * Used when no AI API key is configured or as instant offline response
 */
export function generateLocalAssistantResponse(
  message: string,
  event: Event,
  tasks: TimelineTask[],
  vendors: Vendor[],
  budget: BudgetMetrics,
  categories: BudgetCategory[] = [],
  expenses: Expense[] = []
): { text: string; suggestions: string[]; replanProposal?: ReplanProposal } {
  const query = message.toLowerCase();

  // 0. Intelligent Replanning Intent Detection & Execution
  const replanIntent = parseReplanIntent(message, event);
  if (replanIntent.isReplanIntent) {
    // If request is ambiguous without specified amounts or dates, request clarification rather than inventing numbers
    if (replanIntent.isAmbiguous) {
      const completedCount = tasks.filter((t) => t.status === 'completed').length;
      const expenseCount = expenses.length;
      return {
        text: `### Intelligent Plan Adaptation for **${event.name}**\n\n` +
          `I am ready to help you adapt your celebration plan, reallocate category targets, and recalibrate milestone deadlines without losing any of your **${completedCount} completed tasks** or **${expenseCount} recorded expenses**.\n\n` +
          `**To construct an accurate blueprint, please specify your target changes:**\n` +
          `- **New Budget**: What is your revised budget target (e.g., "${formatCurrency(Math.round(event.totalBudget * 0.8), event.currency)}" or "cut budget by 15%")?\n` +
          `- **Timeline Shift**: Has the celebration date moved earlier or later (e.g., "two weeks earlier", or a specific date)?\n` +
          `- **Guest Count & Priorities**: Are there changes to your ${event.guestCount} guests, or specific categories you wish to shield?\n\n` +
          `*Alternatively, open the **Intelligent Replan** tool from the header to simulate multiple budget and date scenarios interactively.*`,
        suggestions: [
          'What are my 3 most urgent tasks?',
          'How can I reduce costs without compromising guest experience?',
          'What vendors do I still need to book?',
          'Compare vendor quotations',
        ],
      };
    }

    // Explicit parameters extracted: calculate structured replan proposal
    const targetBudget = replanIntent.extractedBudget !== undefined
      ? Math.max(1000, replanIntent.extractedBudget)
      : event.totalBudget;

    const targetDate = replanIntent.extractedDate || event.date;

    const targetGuests = replanIntent.extractedGuestCount !== undefined
      ? Math.max(1, replanIntent.extractedGuestCount)
      : event.guestCount;

    const priorityFocus = replanIntent.extractedPriorityFocus || event.preferences.priorityFocus || 'food_guest_experience';

    const proposal = generateReplanProposal(
      event,
      categories,
      expenses,
      tasks,
      vendors,
      {
        newTotalBudget: targetBudget,
        newDate: targetDate,
        newGuestCount: targetGuests,
        priorityFocus,
      }
    );

    const budgetDelta = proposal.changesSummary.budgetDelta;
    const dateShiftDays = proposal.changesSummary.dateShiftDays;
    const guestDelta = proposal.changesSummary.guestDelta;

    const protectedCats = proposal.categoryAdjustments.filter((c) => c.isProtected);
    const trimmedCats = proposal.categoryAdjustments.filter((c) => c.delta < 0);

    let reallocationsSummary = '';
    if (protectedCats.length > 0) {
      const names = protectedCats.map((c) => `**${c.categoryName}** (${formatCurrency(c.proposedAllocated, event.currency)})`).join(', ');
      reallocationsSummary += `1. **Protected Priorities**: ${names} maintained to safeguard core experience.\n`;
    }
    if (trimmedCats.length > 0) {
      trimmedCats.slice(0, 3).forEach((c, idx) => {
        const itemNumber = protectedCats.length > 0 ? idx + 2 : idx + 1;
        reallocationsSummary += `${itemNumber}. **${c.categoryName}**: Adjusted by -${formatCurrency(Math.abs(c.delta), event.currency)}. ${c.reason}\n`;
      });
    }
    if (!reallocationsSummary) {
      reallocationsSummary = '1. **Category Allocations**: Balanced across all celebration categories according to your preferences.\n';
    }

    let responseText = `### Intelligent Plan Revision Blueprint for **${event.name}**\n\n` +
      `I have evaluated your request and constructed a connected replan without disrupting your existing records:\n\n` +
      `- **Budget Adjustment**: ${budgetDelta === 0 ? 'Maintained on target' : `${budgetDelta < 0 ? 'Decreased' : 'Adjusted'} by **${formatCurrency(Math.abs(budgetDelta), event.currency)}** (New target: **${formatCurrency(targetBudget, event.currency)}**)`}\n` +
      `- **Timeline Shift**: ${dateShiftDays === 0 ? `Date remains on schedule: **${event.date}**` : `Event date moved ${Math.abs(dateShiftDays)} days ${dateShiftDays < 0 ? 'earlier' : 'later'} to **${targetDate}**`}\n` +
      (guestDelta !== 0 ? `- **Guest Count**: Updated to **${targetGuests}** (${guestDelta < 0 ? '-' : '+'}${Math.abs(guestDelta)} guests)\n` : '') +
      `- **Guiding Principle**: **${priorityFocus.replace(/_/g, ' ').toUpperCase()}** protected\n\n` +
      `### Strategic Reallocations:\n` +
      reallocationsSummary +
      `\n*Preserved Assets: ${proposal.preservedItems.completedTasksCount} completed tasks, ${proposal.preservedItems.actualExpensesCount} recorded expenses, and ${proposal.preservedItems.bookedVendorsCount} vendor bookings remain untouched.*`;

    return {
      text: responseText,
      suggestions: ['Apply this revised plan', 'How will this affect our timeline?', 'Compare vendor quotations'],
      replanProposal: proposal,
    };
  }

  // 1. Urgent tasks
  if (query.includes('urgent') || query.includes('task') || query.includes('next') || query.includes('finish')) {
    const pendingTasks = tasks.filter((t) => t.status !== 'completed');
    const urgentOnes = pendingTasks
      .sort((a, b) => (a.priority === 'urgent' ? -1 : 1))
      .slice(0, 4);

    if (urgentOnes.length === 0) {
      return {
        text: `Splendid job! All existing timeline tasks are marked completed. Review your day-of run of show or check with your venue coordinator for final timings.`,
        suggestions: ['How to reduce budget?', 'Rain contingency plan', 'Vendor booking status'],
      };
    }

    const taskList = urgentOnes
      .map((t, i) => `${i + 1}. **${t.title}** (Due: ${t.dueDate}, Priority: ${t.priority.toUpperCase()})${t.description ? `\n   ${t.description}` : ''}`)
      .join('\n\n');

    return {
      text: `Here are your most critical next tasks for **${event.name}**:\n\n${taskList}\n\n*Tip: Tackle urgent priority milestones first to avoid vendor booking lockouts.*`,
      suggestions: ['How can I reduce costs?', 'What vendors do I still need to book?', 'Create a vegetarian menu'],
    };
  }

  // 2. Budget / cost reduction
  if (query.includes('cost') || query.includes('reduce') || query.includes('budget') || query.includes('save') || query.includes('money')) {
    const formattedTotal = event.currency + ' ' + event.totalBudget.toLocaleString();
    const formattedSpent = event.currency + ' ' + budget.totalActual.toLocaleString();
    const formattedRemaining = event.currency + ' ' + budget.remainingBudget.toLocaleString();

    let costAdvice = `**Financial Position for ${event.name}:**\n` +
      `- Total Planned Budget: **${formattedTotal}**\n` +
      `- Recorded Expenses: **${formattedSpent}** (${budget.utilizationPercent}% spent)\n` +
      `- Remaining Balance: **${formattedRemaining}**\n\n` +
      `### Strategic Cost-Saving Recommendations (Without Hurting Guest Experience):\n` +
      `1. **Curate In-Season Florals & Warm Ambient Candles**: Seasonal blooms cost up to 40% less than imported florals and look fresher in photographs.\n` +
      `2. **Streamline Course Timing**: Consolidate repetitive appetizers into 3 standout culinary signatures to prevent costly food wastage.\n` +
      `3. **Bundle Vendor Services**: Inquire whether your photographer offers aerial drone coverage in a combined package, or if your sound provider includes stage uplighting.\n` +
      `4. **Smart Beverage Distribution**: Offer signature welcome mocktails/cocktails instead of an unmonitored open bar.\n\n` +
      `*Essential note: CelebrAI never recommends cutting accessibility accommodations, emergency medical kits, or food safety hygiene as cost-cutting measures.*`;

    return {
      text: costAdvice,
      suggestions: ['What are my most urgent tasks?', 'Suggest a menu concept', 'Rain contingency plan'],
    };
  }

  // 3. Rain / Weather contingency
  if (query.includes('rain') || query.includes('weather') || query.includes('outdoor') || query.includes('storm')) {
    return {
      text: `### Weather Contingency Strategy for ${event.name} (${event.venuePreference} venue):\n\n` +
        `1. **Tent & Marquee Tent Hold**: Place a refundable 48-hour weather hold on high-peak waterproof canopies with guttered sides.\n` +
        `2. **Water-Resistant Electrical Routing**: Ensure all sound cables, stage amplifiers, and power distribution boxes are elevated on rubber pallets.\n` +
        `3. **Guest Comfort Essentials**: Prepare a stylish basket at the entry containing compact transparent umbrellas and dry towels.\n` +
        `4. **Alternative Photo Backdrops**: Identify an interior sheltered portico or decorated lobby with good natural light as a backup photoshoot location.\n` +
        `5. **Decision Cutoff**: Agree with your caterer and decorator on a firm "Call Time" (typically 6 hours prior to guest arrival) to trigger the rain plan seamlessly.`,
      suggestions: ['What are my most urgent tasks?', 'How to reduce costs?', 'Check vendor status'],
    };
  }

  // 4. Vendors
  if (query.includes('vendor') || query.includes('book') || query.includes('hire') || query.includes('quote')) {
    const unbooked = vendors.filter((v) => v.bookingStatus !== 'booked' && v.bookingStatus !== 'cancelled');
    const booked = vendors.filter((v) => v.bookingStatus === 'booked');

    let text = `### Vendor Status Overview for ${event.name}:\n` +
      `- **Confirmed Bookings (${booked.length})**: ${booked.map((v) => v.name).join(', ') || 'None yet'}\n` +
      `- **Pending Action (${unbooked.length})**: ${unbooked.map((v) => `${v.name} (${v.bookingStatus})`).join(', ') || 'All vendors booked!'}\n\n`;

    if (unbooked.length > 0) {
      text += `**Next Action**: Lock in **${unbooked[0].name}** first. Request itemized quotations comparing coverage hours, cancellation terms, and overtime rates. Use the Quotation Comparison tab to audit multiple quotes side-by-side.`;
    } else {
      text += `All primary vendor categories are booked! Your next step is finalizing the day-of load-in schedule with your venue manager.`;
    }

    return {
      text,
      suggestions: ['What are my urgent tasks?', 'How should I redistribute remaining budget?', 'Suggest guest activities'],
    };
  }

  // 5. Menu & Dietary
  if (query.includes('menu') || query.includes('food') || query.includes('catering') || query.includes('vegetarian') || query.includes('diet')) {
    const dietaryList = event.preferences.dietaryRequirements.join(', ') || 'Standard & Vegetarian';
    return {
      text: `### Personalized Culinary Concept for ${event.guestCount} Guests:\n\n` +
        `Accommodating preferences: **${dietaryList}**\n\n` +
        `1. **Welcome Sips & Light Starters**:\n` +
        `   - Artisanal Spiced Pomegranate Cooler & Cucumber Mint Fizz\n` +
        `   - Herb-crusted Paneer / Tofu Tikka skewers with coriander chimichurri\n` +
        `   - Crisp phyllo tartlets with caramelized shallots and wild mushrooms\n\n` +
        `2. **Main Banquet Feast**:\n` +
        `   - Rich slow-cooked saffron dal / hearty legume ragout\n` +
        `   - Seasonal heritage vegetable medley with toasted pine nuts\n` +
        `   - Fragrant dum biryani / saffron pilaf served with fresh pomegranate raita\n` +
        `   - Artisanal bread basket (garlic naan, seeded sourdough, gluten-free flatbreads)\n\n` +
        `3. **Sweet Finale**:\n` +
        `   - Warm artisanal gulab jamun with cardamom pistachio gelato / vegan berry sorbet\n\n` +
        `*Operational tip: Clearly label each live buffet chafing dish with prominent allergen markers (GF, Nut-Free, Vegan) for seamless self-service.*`,
      suggestions: ['How can I reduce catering costs?', 'What are my urgent tasks?', 'Rain contingency plan'],
    };
  }

  // 6. Cake & Bakery Specialization
  if (query.includes('cake') || query.includes('dessert') || query.includes('sweet') || query.includes('bakery') || query.includes('flavor')) {
    if (event.type === 'birthday') {
      return {
        text: `### Curated Cake & Sweet Table Concepts for ${event.name} (${event.guestCount} guests):\n\n` +
          `1. **"Confetti Cloud" (Vanilla Bean & Fresh Berry Compote)**:\n` +
          `   - Light golden vanilla sponge with fun rainbow crumb layering, filled with crushed strawberry cream. Approachable and universally loved by all ages.\n\n` +
          `2. **"Cookies & Cream Ganache" (Rich Chocolate & Oreo Swirl)**:\n` +
          `   - Tender cocoa sponge paired with whipped white chocolate Oreo buttercream. Rich, visually striking, and holds up well at room temperature.\n\n` +
          `3. **"Tropical Mango Sunshine" (Seasonal Mango & Passionfruit Mousse)**:\n` +
          `   - Zesty, refreshing, and naturally sweet—ideal for afternoon parties. Pairs wonderfully with fresh fruit skewers on the side.\n\n` +
          `*Portioning Guide: For ${event.guestCount} guests, a 2-tier 3.5 kg cake or a 2 kg centerpiece cake accompanied by 30 mini cupcakes ensures fast, clean cake cutting without long queues.*`,
        suggestions: ['Suggest 3 engaging party activities', 'What are my most urgent tasks?', 'How to track bakery expenses?'],
      };
    } else {
      return {
        text: `### Designer Cake & Confectionery Blueprint for ${event.name} (${event.preferences.style} style):\n\n` +
          `1. **Artisanal Floral Tier (Pistachio & Rose Water Cardamom)**:\n` +
          `   - Textured buttercream adorned with pressed edible petals and delicate gold leaf foil, honoring the celebration's aesthetic.\n\n` +
          `2. **Belgian Dark Chocolate & Salted Caramel Crunch**:\n` +
          `   - Decadent layered chocolate mousse with hazelnut praline crunch—a sophisticated crowd-pleaser for evening celebrations.\n\n` +
          `3. **Meyer Lemon Curd & Elderflower Sponge**:\n` +
          `   - Refreshing, light palate-cleanser tier that complements multi-course banquets without feeling heavy.\n\n` +
          `*Logistics Tip: Confirm refrigeration access at ${event.location} with your venue coordinator and schedule bakery delivery 2 hours prior to guest arrival.*`,
        suggestions: ['Suggest a full menu concept', 'Compare catering quotations', 'Review vendor booking deadlines'],
      };
    }
  }

  // 7. Decor, Florals & Ambience
  if (query.includes('decor') || query.includes('floral') || query.includes('flower') || query.includes('light') || query.includes('theme') || query.includes('backdrop')) {
    return {
      text: `### Atmosphere & Decor Concept for ${event.name} (${event.venuePreference} venue, ${event.preferences.style} style):\n\n` +
        `1. **Focal Welcome Archway**: Frame the primary guest entrance with structured greenery, textured fabrics, and personalized welcoming signage.\n` +
        `2. **Warm Ambient Illuminations**: Cluster warm 2700K fairy string lights, glass hurricane candles, and battery-operated pillar lanterns to create an inviting golden-hour glow.\n` +
        `3. **Tabletop Vignettes**: Use seasonal local florals in mismatched brass or ceramic vessels instead of oversized centerpieces, ensuring guests can converse freely across dining tables.\n` +
        `4. **Interactive Photo Backdrop**: Create a dedicated memory photo station featuring a bespoke neon or wooden family crest flanked by cascading foliage.\n\n` +
        `*Budget Strategy: Re-purpose ceremonial backdrop florals to frame the head dining table during dinner to save up to 25% on floral allocations.*`,
      suggestions: ['How can I reduce decor costs?', 'Rain contingency plan', 'What vendors do I still need to book?'],
    };
  }

  // 8. Photography & Memories
  if (query.includes('photo') || query.includes('camera') || query.includes('video') || query.includes('cinemat') || query.includes('album')) {
    return {
      text: `### Photography & Visual Coverage Strategy for ${event.name}:\n\n` +
        `1. **Golden Hour Portrait Window**: Reserve a 45-minute window before sunset specifically for portraits of the celebrants and immediate family.\n` +
        `2. **Must-Have Shot Checklist**: Share a pre-vetted shot list with your photographer (candid guest laughs, emotional parent moments, detail shots of decor and cake).\n` +
        `3. **Unobtrusive Candid Filming**: Request a documentary-style cinema reel (3–5 minute highlight clip set to meaningful acoustic music) for easy mobile sharing.\n` +
        `4. **Day-of Photo Delivery Teaser**: Negotiate 10 edited preview frames delivered within 24 hours of the event for immediate social sharing.\n\n` +
        `*Audit Tip: Use CelebrAI's Quotation Comparison matrix to compare raw footage rights, turnaround times, and drone coverage inclusions across photographers.*`,
      suggestions: ['Compare photography quotations', 'What are my urgent tasks?', 'Suggest guest activities'],
    };
  }

  // 9. Attire, Styling & Dressing
  if (query.includes('attire') || query.includes('dress') || query.includes('suit') || query.includes('lehenga') || query.includes('outfit') || query.includes('makeup') || query.includes('styling')) {
    return {
      text: `### Celebration Styling Guide for ${event.name} (${event.preferences.style} aesthetic):\n\n` +
        `1. **Color Harmony**: Align attire tones with the event palette; rich jewel tones (emerald, deep sapphire, burgundy) or soft pastels (sage, champagne, blush) photograph exceptionally well.\n` +
        `2. **Comfort & Movement**: Ensure footwear and ceremonial garments allow 6+ hours of active socializing and dancing.\n` +
        `3. **Fitting Timeline**: Schedule final garment alterations 14 days prior to the event, followed by a final try-on session 3 days before.\n` +
        `4. **Emergency Day-of Styling Kit**: Pack safety pins, garment tape, fabric stain wipes, blister patches, and miniature sewing kit in your host bag.`,
      suggestions: ['What are my most urgent tasks?', 'Suggest decor styling', 'Check timeline milestones'],
    };
  }

  // 10. Activities / guest engagement
  if (query.includes('activity') || query.includes('game') || query.includes('entertainment') || query.includes('idea')) {
    return {
      text: `### 3 Guest Engagement Ideas for ${event.guestCount} Guests at your ${event.type}:\n\n` +
        `1. **The Vintage Audio Guestbook**: Set up a retro telephone on a bistro table where guests lift the receiver, hear a recorded welcome from the hosts, and leave heartfelt messages.\n` +
        `2. **Collaborative Polaroid Memory Mosaic**: Provide instant cameras and wooden clothespins where guests clip candid snaps alongside a personal written blessing.\n` +
        `3. **Interactive Trivia / Spotlight Moments**: A short 15-minute digital quiz accessible via phone QR codes celebrating memorable stories about the celebrants.\n\n` +
        `*Tip: Space activities during transition windows (e.g. while photos are being taken) so guests never experience downtime.*`,
      suggestions: ['What are my most urgent tasks?', 'Suggest a menu concept', 'Vendor booking status'],
    };
  }

  // Default helpful response
  return {
    text: `I'm analyzing your plan for **${event.name}** (${event.guestCount} guests in ${event.location} on ${event.date}).\n\n` +
      `Your current budget utilization is **${budget.utilizationPercent}%** with **${event.currency} ${budget.remainingBudget.toLocaleString()}** remaining.\n\n` +
      `How can I assist your planning today? You can ask me to re-plan if your budget or date changes, request vendor comparison tips, or review urgent tasks.`,
    suggestions: [
      'Our budget has dropped by 15%, and the celebration is happening two weeks earlier. Please revise our plan.',
      'What are my 3 most urgent tasks?',
      'How can I reduce costs without compromising guest experience?',
      'What vendors do I still need to book?',
      'Give me a rain contingency plan',
    ],
  };
}
