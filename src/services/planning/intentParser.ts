/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, ReplanRequest } from '../../domain/types';

export interface ParsedReplanIntent {
  isReplanIntent: boolean;
  hasExplicitParameters: boolean;
  isAmbiguous: boolean;
  extractedBudget?: number;
  extractedDate?: string;
  extractedGuestCount?: number;
  extractedPriorityFocus?: 'food_guest_experience' | 'venue_atmosphere' | 'media_memories' | 'balanced' | 'custom';
  ambiguityReason?: string;
  rawMatches?: {
    budgetText?: string;
    dateText?: string;
    guestText?: string;
    priorityText?: string;
  };
}

/**
 * Parses user input for replanning intent and extracts structured parameters
 * without relying on any hardcoded amounts, dates, or assumptions.
 */
export function parseReplanIntent(message: string, currentEvent?: Event | null): ParsedReplanIntent {
  if (!message || typeof message !== 'string') {
    return { isReplanIntent: false, hasExplicitParameters: false, isAmbiguous: false };
  }

  const query = message.trim().toLowerCase();

  // 1. Broad replan intent indicators
  const replanKeywords = [
    'replan',
    'revise',
    're-evaluate',
    'reevaluate',
    're-plan',
    'restructure',
    'adapt our plan',
    'adapt the plan',
    'update the plan',
    'change the plan',
    'change our plan',
    'reschedule',
  ];

  const budgetKeywords = [
    'budget drop',
    'budget dropped',
    'budget cut',
    'budget decrease',
    'budget decreased',
    'budget reduction',
    'budget reduced',
    'cut budget',
    'reduce budget',
    'drop budget',
    'decrease budget',
    'lower budget',
    'spend less',
    'less budget',
  ];

  const dateKeywords = [
    'earlier',
    'sooner',
    'moved up',
    'brought forward',
    'postponed',
    'delayed',
    'new date',
    'date changed',
    'rescheduled',
  ];

  // 1a. Filter out informational advice questions (e.g. "How can I reduce costs without compromising guest experience?")
  const isInformationalAdvice =
    (query.startsWith('how') || query.includes('how to') || query.includes('tips') || query.includes('ways to') || query.includes('advice') || query.includes('suggest')) &&
    !query.includes('replan') &&
    !query.includes('revise') &&
    !query.includes('dropped to') &&
    !query.includes('cut to') &&
    !query.includes('reduced to') &&
    !query.includes('is now') &&
    !query.includes('earlier') &&
    !query.includes('sooner');

  if (isInformationalAdvice) {
    return { isReplanIntent: false, hasExplicitParameters: false, isAmbiguous: false };
  }

  const hasReplanKeyword = replanKeywords.some((kw) => query.includes(kw));
  const hasBudgetKeyword = budgetKeywords.some((kw) => query.includes(kw));
  const hasDateKeyword = dateKeywords.some((kw) => query.includes(kw));
  const hasBudgetWord = query.includes('budget');
  const hasGuestWord = query.includes('guest') || query.includes('headcount') || query.includes('attendee');

  const isReplanIntent =
    hasReplanKeyword ||
    hasBudgetKeyword ||
    (hasBudgetWord && (query.includes('cut') || query.includes('drop') || query.includes('lower') || query.includes('change') || query.includes('new'))) ||
    (hasDateKeyword && (query.includes('date') || query.includes('event') || query.includes('wedding') || query.includes('birthday') || query.includes('happening'))) ||
    (hasGuestWord && (query.includes('drop') || query.includes('reduce') || query.includes('less') || query.includes('more') || query.includes('change')));

  if (!isReplanIntent) {
    return { isReplanIntent: false, hasExplicitParameters: false, isAmbiguous: false };
  }

  let extractedBudget: number | undefined;
  let extractedDate: string | undefined;
  let extractedGuestCount: number | undefined;
  let extractedPriorityFocus: ParsedReplanIntent['extractedPriorityFocus'];
  const rawMatches: ParsedReplanIntent['rawMatches'] = {};

  // 2. Budget extraction
  // 2a. Percentage cut (e.g. "cut budget by 20%", "15% budget cut", "drop budget 10%")
  const percentMatch = query.match(/(?:cut|reduce|drop|decrease|down|lower)?\s*(?:the\s+)?budget\s*(?:by|of)?\s*([0-9]{1,2}(?:\.[0-9]+)?)\s*%/i) ||
    query.match(/([0-9]{1,2}(?:\.[0-9]+)?)\s*%\s*(?:budget\s+cut|cut\s+in\s+budget|reduction|drop|decrease)/i);

  if (percentMatch && currentEvent && currentEvent.totalBudget > 0) {
    const pct = parseFloat(percentMatch[1]);
    if (pct > 0 && pct < 100) {
      extractedBudget = Math.round(currentEvent.totalBudget * (1 - pct / 100));
      rawMatches.budgetText = `${pct}% reduction`;
    }
  }

  // 2b. Explicit target budget (e.g. "budget has dropped to ₹6,50,000", "budget is now 500000", "new budget $45,000", "budget 7.5 lakh")
  if (!extractedBudget) {
    // Look for patterns like "budget ... to/is/at <number>"
    const targetBudgetRegex = /(?:budget|total|cost|target)\s*(?:has\s+)?(?:dropped|cut|reduced|decreased|changed|moved|adjusted|is\s+now|is)?\s*(?:to|at|is|:|of)?\s*[$€£₹]?\s*([0-9]+(?:[,.][0-9]+)*)\s*(lakhs?|lacs?|lac|l|k|million|m)?\b/i;
    const targetMatch = query.match(targetBudgetRegex);

    if (targetMatch && targetMatch[1]) {
      const rawNum = targetMatch[1].replace(/,/g, '');
      let multiplier = 1;
      const unit = (targetMatch[2] || '').toLowerCase();
      if (unit === 'k') multiplier = 1000;
      else if (unit.startsWith('l')) multiplier = 100000;
      else if (unit.startsWith('m')) multiplier = 1000000;

      const parsedNum = parseFloat(rawNum) * multiplier;
      if (!isNaN(parsedNum) && parsedNum > 100) {
        extractedBudget = Math.round(parsedNum);
        rawMatches.budgetText = targetMatch[0].trim();
      }
    }
  }

  // 2c. Direct currency figure in the prompt if "budget" or "cut" is present
  if (!extractedBudget) {
    const standaloneCurrencyMatch = query.match(/(?:[$€£₹]|rs\.?|inr|usd|eur|gbp)\s*([0-9]+(?:[,.][0-9]+)*)\s*(lakhs?|lacs?|lac|l|k|million|m)?\b/i);
    if (standaloneCurrencyMatch && standaloneCurrencyMatch[1]) {
      const rawNum = standaloneCurrencyMatch[1].replace(/,/g, '');
      let multiplier = 1;
      const unit = (standaloneCurrencyMatch[2] || '').toLowerCase();
      if (unit === 'k') multiplier = 1000;
      else if (unit.startsWith('l')) multiplier = 100000;
      else if (unit.startsWith('m')) multiplier = 1000000;

      const parsedNum = parseFloat(rawNum) * multiplier;
      if (!isNaN(parsedNum) && parsedNum > 100) {
        extractedBudget = Math.round(parsedNum);
        rawMatches.budgetText = standaloneCurrencyMatch[0].trim();
      }
    }
  }

  // 2d. Subtractive delta (e.g. "cut budget by 50000", "reduce budget by 1 lakh")
  if (!extractedBudget && currentEvent) {
    const deltaMatch = query.match(/(?:cut|reduce|drop|decrease|lower)\s*(?:the\s+)?budget\s+by\s*[$€£₹]?\s*([0-9]+(?:[,.][0-9]+)*)\s*(lakhs?|lacs?|lac|l|k|million|m)?\b/i);
    if (deltaMatch && deltaMatch[1]) {
      const rawNum = deltaMatch[1].replace(/,/g, '');
      let multiplier = 1;
      const unit = (deltaMatch[2] || '').toLowerCase();
      if (unit === 'k') multiplier = 1000;
      else if (unit.startsWith('l')) multiplier = 100000;
      else if (unit.startsWith('m')) multiplier = 1000000;

      const delta = parseFloat(rawNum) * multiplier;
      if (!isNaN(delta) && delta > 0 && delta < currentEvent.totalBudget) {
        extractedBudget = Math.round(currentEvent.totalBudget - delta);
        rawMatches.budgetText = deltaMatch[0].trim();
      }
    }
  }

  // 3. Date extraction
  // 3a. Explicit ISO date (e.g. "2026-11-15")
  const isoMatch = query.match(/\b(20\d\d-[01]\d-[0-3]\d)\b/);
  if (isoMatch) {
    extractedDate = isoMatch[1];
    rawMatches.dateText = isoMatch[1];
  }

  // 3b. Relative shifts earlier or later (e.g. "two weeks earlier", "2 weeks earlier", "10 days earlier", "1 month earlier")
  if (!extractedDate && currentEvent?.date) {
    const relativeEarlierMatch = query.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(weeks?|days?|months?)\s*(earlier|sooner|ahead|prior|before)/i);
    const relativeLaterMatch = query.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(weeks?|days?|months?)\s*(later|postponed|delayed|after)/i);

    const relMatch = relativeEarlierMatch || relativeLaterMatch;
    if (relMatch) {
      const isEarlier = Boolean(relativeEarlierMatch);
      const wordToNum: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      };
      const rawCount = relMatch[1].toLowerCase();
      const count = wordToNum[rawCount] || parseInt(rawCount, 10) || 1;
      const unit = relMatch[2].toLowerCase();

      let shiftDays = count;
      if (unit.startsWith('week')) shiftDays = count * 7;
      else if (unit.startsWith('month')) shiftDays = count * 30;

      const d = new Date(currentEvent.date + 'T00:00:00');
      d.setDate(d.getDate() + (isEarlier ? -shiftDays : shiftDays));
      extractedDate = d.toISOString().split('T')[0];
      rawMatches.dateText = relMatch[0].trim();
    }
  }

  // 4. Guest count extraction
  const guestMatch = query.match(/(?:guest\s+count|guests?|attendees?|headcount)\s*(?:is\s+now|changed\s+to|dropped\s+to|increased\s+to|reduced\s+to|to|at)?\s*([0-9]{1,5})\b/i) ||
    query.match(/\b([0-9]{1,5})\s*(?:guests|attendees|people|heads)\b/i);

  if (guestMatch && guestMatch[1]) {
    const parsedGuests = parseInt(guestMatch[1], 10);
    if (!isNaN(parsedGuests) && parsedGuests > 0 && parsedGuests < 50000) {
      // Ensure it wasn't just a currency match
      if (!extractedBudget || parsedGuests !== extractedBudget) {
        extractedGuestCount = parsedGuests;
        rawMatches.guestText = `${parsedGuests} guests`;
      }
    }
  }

  // 5. Priority Focus extraction
  if (query.includes('food') || query.includes('catering') || query.includes('dining') || query.includes('culinary') || query.includes('guest experience')) {
    extractedPriorityFocus = 'food_guest_experience';
    rawMatches.priorityText = 'Food & Guest Experience';
  } else if (query.includes('venue') || query.includes('decor') || query.includes('floral') || query.includes('setting') || query.includes('atmosphere')) {
    extractedPriorityFocus = 'venue_atmosphere';
    rawMatches.priorityText = 'Venue & Atmosphere';
  } else if (query.includes('photo') || query.includes('video') || query.includes('media') || query.includes('cinema') || query.includes('memory') || query.includes('memories')) {
    extractedPriorityFocus = 'media_memories';
    rawMatches.priorityText = 'Media & Memories';
  } else if (query.includes('balanced') || query.includes('equal') || query.includes('proportional')) {
    extractedPriorityFocus = 'balanced';
    rawMatches.priorityText = 'Balanced Proportional';
  } else if (currentEvent?.preferences?.priorityFocus) {
    // Preserve existing saved priority if not specified in prompt
    extractedPriorityFocus = currentEvent.preferences.priorityFocus;
  }

  // 6. Ambiguity evaluation
  const hasExplicitParameters = Boolean(
    extractedBudget !== undefined ||
    extractedDate !== undefined ||
    extractedGuestCount !== undefined
  );

  const isAmbiguous = isReplanIntent && !hasExplicitParameters;
  let ambiguityReason: string | undefined;

  if (isAmbiguous) {
    ambiguityReason =
      'You requested to replan or revise, but did not specify a new budget amount, percentage reduction, or timeline date. Please specify your target numbers or use the simulation controls.';
  }

  return {
    isReplanIntent,
    hasExplicitParameters,
    isAmbiguous,
    extractedBudget,
    extractedDate,
    extractedGuestCount,
    extractedPriorityFocus,
    ambiguityReason,
    rawMatches,
  };
}
