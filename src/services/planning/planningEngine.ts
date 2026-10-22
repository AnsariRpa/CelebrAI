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
  SavedIdea,
  TimelineTask,
  Vendor,
} from '../../domain/types';
import { generateId } from '../../domain/validation';

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
 * Generates a realistic, date-aware chronological timeline of planning tasks
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
      // Event is today or past
      return event.date;
    }

    if (totalDaysRemaining <= targetDaysBeforeEvent) {
      // Compressed deadline: schedule between today and event date
      const fractionalOffset = Math.max(1, Math.floor(totalDaysRemaining * 0.4));
      return addDays(now, Math.min(fractionalOffset, totalDaysRemaining));
    }

    // Standard schedule: event date minus target days
    return addDays(eventDate, -targetDaysBeforeEvent);
  };

  const tasks: TimelineTask[] = [];

  // Blueprint milestones by event type
  if (event.type === 'wedding') {
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Finalize & Reserve Main Celebration Venue',
      description: 'Review hall capacity for ' + event.guestCount + ' guests, air-conditioning, backup generators, and curfew times.',
      dueDate: calculateDueDate(120),
      priority: 'urgent',
      status: 'not_started',
      category: 'Venue & Facilities',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
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
      id: generateId(),
      eventId: event.id,
      title: 'Menu Tasting & Catering Finalization',
      description: 'Finalize menu items honoring dietary preferences (' + (event.preferences.dietaryRequirements.join(', ') || 'Standard') + ').',
      dueDate: calculateDueDate(60),
      priority: 'high',
      status: 'not_started',
      category: 'Catering',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Send Save-the-Dates & Digital RSVPs',
      description: 'Dispatch invitations to ' + event.guestCount + ' estimated guests with venue map and accommodations info.',
      dueDate: calculateDueDate(45),
      priority: 'medium',
      status: 'not_started',
      category: 'Invitations',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
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
      id: generateId(),
      eventId: event.id,
      title: 'Verify Accessibility Accommodations',
      description: 'Confirm step-free ramps, priority seating, and mobility assistance at the entrance.',
      dueDate: calculateDueDate(20),
      priority: 'high',
      status: 'not_started',
      category: 'Accessibility',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Final Guest Count & Seating Chart',
      description: 'Lock in head count with caterer and provide designated VIP/family table layout.',
      dueDate: calculateDueDate(10),
      priority: 'urgent',
      status: 'not_started',
      category: 'Coordination',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Day-Before Vendor Walkthrough & Run of Show',
      description: 'Conduct sound-check, review timeline with emcee, and confirm vendor arrival slots.',
      dueDate: calculateDueDate(1),
      priority: 'urgent',
      status: 'not_started',
      category: 'Logistics',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Day-Of Celebration Coordination',
      description: 'Supervise vendor load-in, coordinate couple entry, and oversee guest banquet flow.',
      dueDate: event.date,
      priority: 'urgent',
      status: 'not_started',
      category: 'Execution',
      isCompressedDeadline: false,
    });
  } else if (event.type === 'birthday') {
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Reserve Birthday Party Venue / Hall',
      description: 'Book space suitable for ' + event.guestCount + ' guests with space for activities.',
      dueDate: calculateDueDate(30),
      priority: 'urgent',
      status: 'not_started',
      category: 'Venue',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
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
      id: generateId(),
      eventId: event.id,
      title: 'Send Party Invitations & Gather RSVPs',
      description: 'Collect headcounts and allergies from guests.',
      dueDate: calculateDueDate(12),
      priority: 'high',
      status: 'not_started',
      category: 'Invitations',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
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
      id: generateId(),
      eventId: event.id,
      title: 'Procure Theme Decor & Return Favors',
      description: 'Gather photo backdrop, balloon garland, and curated gift boxes.',
      dueDate: calculateDueDate(4),
      priority: 'medium',
      status: 'not_started',
      category: 'Decor',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Day-Of Party Setup & Celebration',
      description: 'Decorate venue 2 hours prior, coordinate cake cutting, and host fun games.',
      dueDate: event.date,
      priority: 'urgent',
      status: 'not_started',
      category: 'Execution',
      isCompressedDeadline: false,
    });
  } else if (event.type === 'community') {
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Secure Civic Venue & Mandatory Permits',
      description: 'File noise permits, municipal ground approvals, and emergency egress notifications.',
      dueDate: calculateDueDate(60),
      priority: 'urgent',
      status: 'not_started',
      category: 'Permits',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
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
      id: generateId(),
      eventId: event.id,
      title: 'Contract Sound, Stage & Power Generators',
      description: 'Ensure adequate microphones, outdoor PA amplification, and backup power switch.',
      dueDate: calculateDueDate(25),
      priority: 'high',
      status: 'not_started',
      category: 'Equipment',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Deploy First-Aid & Emergency Safety Station',
      description: 'Confirm presence of certified first-responder and hydration / water stations.',
      dueDate: calculateDueDate(10),
      priority: 'urgent',
      status: 'not_started',
      category: 'Safety',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
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
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Confirm Event Venue Reservation',
      description: 'Lock in event space and confirm guest seating capacity for ' + event.guestCount + ' people.',
      dueDate: calculateDueDate(30),
      priority: 'urgent',
      status: 'not_started',
      category: 'Venue',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Finalize Food & Beverage Catering',
      description: 'Review catering order with consideration for ' + (event.preferences.dietaryRequirements.join(', ') || 'all guests') + '.',
      dueDate: calculateDueDate(15),
      priority: 'high',
      status: 'not_started',
      category: 'Catering',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Send Invitations & Confirm Attendees',
      description: 'Distribute invitations and confirm headcount.',
      dueDate: calculateDueDate(10),
      priority: 'medium',
      status: 'not_started',
      category: 'Invitations',
      isCompressedDeadline: isCompressed,
    });
    tasks.push({
      id: generateId(),
      eventId: event.id,
      title: 'Day-Of Celebration Execution',
      description: 'Coordinate with hosts, welcome guests, and enjoy the celebration.',
      dueDate: event.date,
      priority: 'urgent',
      status: 'not_started',
      category: 'Execution',
      isCompressedDeadline: false,
    });
  }

  return tasks;
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
    description: 'An vintage rotary phone or QR-activated digital guestbook where friends and family record voice toasts and heartfelt memories.',
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
  budget: BudgetMetrics
): { text: string; suggestions: string[] } {
  const query = message.toLowerCase();

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
  if (query.includes('vendor') || query.includes('book') || query.includes('hire')) {
    const unbooked = vendors.filter((v) => v.bookingStatus !== 'booked' && v.bookingStatus !== 'cancelled');
    const booked = vendors.filter((v) => v.bookingStatus === 'booked');

    let text = `### Vendor Status Overview for ${event.name}:\n` +
      `- **Confirmed Bookings (${booked.length})**: ${booked.map((v) => v.name).join(', ') || 'None yet'}\n` +
      `- **Pending Action (${unbooked.length})**: ${unbooked.map((v) => `${v.name} (${v.bookingStatus})`).join(', ') || 'All vendors booked!'}\n\n`;

    if (unbooked.length > 0) {
      text += `**Next Action**: Lock in **${unbooked[0].name}** first. Request written quotes comparing coverage hours, cancellation terms, and overtime rates.`;
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

  // 6. Activities / guest engagement
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
      `How can I assist your planning today? Choose one of the quick topics below or ask any specific question about your budget, timeline, vendors, or run-of-show.`,
    suggestions: [
      'What are my 3 most urgent tasks?',
      'How can I reduce costs without compromising guest experience?',
      'What vendors do I still need to book?',
      'Create a vegetarian menu for my event',
      'Give me a rain contingency plan',
    ],
  };
}
