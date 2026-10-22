/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Coins,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  BudgetFlexibility,
  Event,
  EventStyle,
  EventType,
  VenuePreference,
} from '../../domain/types';
import {
  formatCurrency,
  validateEventBasics,
  validateEventBudgetAndGuests,
} from '../../domain/validation';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const COMMON_DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Jain Options',
  'Halal',
  'Gluten-Free',
  'Nut-Free',
  'Dairy-Free',
];

const COMMON_ACCESSIBILITY_OPTIONS = [
  'Step-Free Wheelchair Access',
  'Elevator / Lift to Banquet Hall',
  'Accessible Restrooms',
  'Priority Seating for Seniors',
  'Sign Language / Clear Audio Loop',
  'Sensory Quiet Rest Area',
];

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  isOpen,
  onClose,
  onCreateEvent,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Basics
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('wedding');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0];
  });
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [venuePreference, setVenuePreference] = useState<VenuePreference>('mixed');

  // Step 2: Guests & Budget
  const [guestCount, setGuestCount] = useState<number>(150);
  const [totalBudget, setTotalBudget] = useState<number>(800000);
  const [currency, setCurrency] = useState('INR');
  const [flexibility, setFlexibility] = useState<BudgetFlexibility>('moderate');
  const [planningStage, setPlanningStage] = useState('Initial Planning & Research');

  // Step 3: Style & Preferences
  const [style, setStyle] = useState<EventStyle>('elegant');
  const [themeDescription, setThemeDescription] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState<string[]>(['Vegetarian']);
  const [customDietary, setCustomDietary] = useState('');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([
    'Step-Free Wheelchair Access',
  ]);
  const [culturalConsiderations, setCulturalConsiderations] = useState('');
  const [mustHaveActivities, setMustHaveActivities] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleNextFromStep1 = () => {
    const res = validateEventBasics({ name, type, date, location });
    if (!res.isValid) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    const res = validateEventBudgetAndGuests({ guestCount, totalBudget, currency });
    if (!res.isValid) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    setStep(3);
  };

  const handleFinalSubmit = () => {
    const allDietary = [...dietaryRequirements];
    if (customDietary.trim()) {
      allDietary.push(customDietary.trim());
    }

    const activitiesList = mustHaveActivities
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    onCreateEvent({
      name: name.trim(),
      type,
      date,
      endDate: isMultiDay ? endDate || date : undefined,
      isMultiDay,
      location: location.trim(),
      venuePreference,
      guestCount: Math.max(0, Number(guestCount)),
      totalBudget: Math.max(0, Number(totalBudget)),
      currency,
      flexibility,
      planningStage,
      preferences: {
        style,
        themeDescription: themeDescription.trim() || undefined,
        dietaryRequirements: allDietary,
        accessibilityNeeds,
        culturalConsiderations: culturalConsiderations.trim() || undefined,
        mustHaveActivities: activitiesList,
        additionalNotes: additionalNotes.trim() || undefined,
      },
    });

    onClose();
  };

  const toggleDietary = (item: string) => {
    setDietaryRequirements((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleAccessibility = (item: string) => {
    setAccessibilityNeeds((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1f16]/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#fdfbf7] border border-[#e8dfcf] rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
        {/* Wizard Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f8f3ea] border-b border-[#e8dfcf]">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#0f2b20]">Plan a New Celebration</h2>
            <p className="text-xs text-[#52635b] mt-0.5">
              Step {step} of 4 ·{' '}
              {step === 1 && 'Celebration Basics'}
              {step === 2 && 'Guests & Budget'}
              {step === 3 && 'Style & Inclusivity'}
              {step === 4 && 'Review Plan Blueprint'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#52635b] hover:text-[#0f2b20] hover:bg-[#ede5d5] rounded-md transition-colors"
            aria-label="Close wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#e8dfcf] h-1">
          <div
            className="bg-[#143c2c] h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Wizard Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {/* STEP 1: BASICS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Diya & Neil's Sangeet & Wedding"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                />
                {errors.name && <p className="text-xs text-rose-700 mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Event Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  >
                    <option value="wedding">Wedding & Ceremonies</option>
                    <option value="birthday">Birthday Celebration</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="community">Community Festival / Gathering</option>
                    <option value="other">Private Celebration / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Celebration Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  />
                  {errors.date && <p className="text-xs text-rose-700 mt-1">{errors.date}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="multi-day"
                  checked={isMultiDay}
                  onChange={(e) => setIsMultiDay(e.target.checked)}
                  className="rounded text-[#143c2c] focus:ring-[#143c2c]"
                />
                <label htmlFor="multi-day" className="text-xs font-medium text-[#2d3b35]">
                  Multi-day or weekend celebration
                </label>
              </div>

              {isMultiDay && (
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    City / Location *
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mumbai / Jaipur / San Francisco"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  />
                  {errors.location && <p className="text-xs text-rose-700 mt-1">{errors.location}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Venue Preference
                  </label>
                  <select
                    value={venuePreference}
                    onChange={(e) => setVenuePreference(e.target.value as VenuePreference)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  >
                    <option value="indoor">Indoor (Banquet / Hall / House)</option>
                    <option value="outdoor">Outdoor (Lawn / Beach / Garden)</option>
                    <option value="mixed">Mixed (Courtyard & Indoor Ballroom)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GUESTS & BUDGET */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Expected Guest Count *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                    />
                    <Users className="w-4 h-4 text-[#7d8b84] absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.guestCount && (
                    <p className="text-xs text-rose-700 mt-1">{errors.guestCount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Currency *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                    <option value="AED">AED - UAE Dirham</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Total Planned Budget *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  />
                  <Coins className="w-4 h-4 text-[#7d8b84] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-[#52635b] mt-1 font-mono">
                  Formatted: {formatCurrency(totalBudget, currency)}
                </p>
                {errors.totalBudget && (
                  <p className="text-xs text-rose-700 mt-1">{errors.totalBudget}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Budget Flexibility
                  </label>
                  <select
                    value={flexibility}
                    onChange={(e) => setFlexibility(e.target.value as BudgetFlexibility)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  >
                    <option value="strict">Strict (Hard financial limit)</option>
                    <option value="moderate">Moderate (±10% wiggle room)</option>
                    <option value="flexible">Flexible (Experience-driven)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Current Planning Stage
                  </label>
                  <select
                    value={planningStage}
                    onChange={(e) => setPlanningStage(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  >
                    <option value="Initial Planning & Research">Initial Planning & Research</option>
                    <option value="Venue Hunting">Venue Hunting</option>
                    <option value="Vendors Research & Booking">Vendors Research & Booking</option>
                    <option value="Final Coordination (1-3 weeks out)">Final Coordination (1-3 weeks out)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: STYLE & PREFERENCES */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Preferred Aesthetic Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as EventStyle)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  >
                    <option value="elegant">Elegant & Timeless</option>
                    <option value="traditional">Traditional & Heritage</option>
                    <option value="modern">Modern & Contemporary</option>
                    <option value="minimalist">Minimalist & Clean</option>
                    <option value="rustic">Rustic & Natural</option>
                    <option value="festive">Festive & Vibrant</option>
                    <option value="cultural">Cultural & Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Theme / Decor Palette Notes
                  </label>
                  <input
                    type="text"
                    value={themeDescription}
                    onChange={(e) => setThemeDescription(e.target.value)}
                    placeholder="e.g. Ivory & Emerald green, fairy lights, brass lamps"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                  />
                </div>
              </div>

              {/* Dietary Considerations */}
              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1.5">
                  Dietary Considerations (CelebrAI will tailor catering blueprints accordingly)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_DIETARY_OPTIONS.map((item) => {
                    const active = dietaryRequirements.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => toggleDietary(item)}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                          active
                            ? 'bg-[#143c2c] text-white border-[#143c2c]'
                            : 'bg-white text-[#384841] border-[#d8cdb8] hover:bg-[#f5efe4]'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={customDietary}
                  onChange={(e) => setCustomDietary(e.target.value)}
                  placeholder="Other dietary requirements (e.g. strictly peanut-free)..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                />
              </div>

              {/* Accessibility Accommodations */}
              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1.5">
                  Accessibility Accommodations (Protected from cost cuts)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMMON_ACCESSIBILITY_OPTIONS.map((item) => {
                    const active = accessibilityNeeds.includes(item);
                    return (
                      <label
                        key={item}
                        className="flex items-center gap-2 text-xs text-[#2d3b35] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleAccessibility(item)}
                          className="rounded text-[#143c2c] focus:ring-[#143c2c]"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Cultural or Voluntary Considerations */}
              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Cultural or Traditional Nuances (Voluntarily provided)
                </label>
                <input
                  type="text"
                  value={culturalConsiderations}
                  onChange={(e) => setCulturalConsiderations(e.target.value)}
                  placeholder="e.g. Sangeet ceremony, Vedic rituals, evening tea reception..."
                  className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Must-Have Activities (One per line)
                </label>
                <textarea
                  rows={2}
                  value={mustHaveActivities}
                  onChange={(e) => setMustHaveActivities(e.target.value)}
                  placeholder="Grand bridal entryway&#10;Live acoustic saxophonist&#10;Interactive memory guestbook"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#d8cdb8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#143c2c]"
                />
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CREATE */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-[#f8f3ea] border border-[#e8dfcf] rounded-lg space-y-3">
                <div className="flex items-baseline justify-between border-b border-[#e2d7c3] pb-2">
                  <h3 className="font-serif text-lg font-semibold text-[#0f2b20]">{name}</h3>
                  <span className="text-xs uppercase tracking-wider text-[#143c2c] font-semibold">
                    {type}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[#6e7d76]">Date:</span>
                    <p className="font-medium text-[#143c2c]">{date}</p>
                  </div>
                  <div>
                    <span className="text-[#6e7d76]">Location:</span>
                    <p className="font-medium text-[#143c2c]">{location}</p>
                  </div>
                  <div>
                    <span className="text-[#6e7d76]">Guest Count:</span>
                    <p className="font-medium text-[#143c2c] font-mono">{guestCount} guests</p>
                  </div>
                  <div>
                    <span className="text-[#6e7d76]">Total Budget:</span>
                    <p className="font-medium text-[#143c2c] font-mono">
                      {formatCurrency(totalBudget, currency)}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[#384841] space-y-1 pt-1">
                  <p>
                    <strong className="text-[#143c2c]">Venue:</strong> {venuePreference} ·{' '}
                    <strong className="text-[#143c2c]">Style:</strong> {style}
                  </p>
                  {dietaryRequirements.length > 0 && (
                    <p>
                      <strong className="text-[#143c2c]">Dietary:</strong>{' '}
                      {dietaryRequirements.join(', ')}
                    </p>
                  )}
                  {accessibilityNeeds.length > 0 && (
                    <p>
                      <strong className="text-[#143c2c]">Accessibility:</strong>{' '}
                      {accessibilityNeeds.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* What will be generated notification */}
              <div className="flex items-start gap-2.5 p-3.5 bg-white border border-[#e8dfcf] rounded-md text-xs text-[#384841]">
                <Sparkles className="w-4 h-4 text-[#bd9b46] shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-[#143c2c]">Automatic Deterministic Plan Generation</p>
                  <p className="text-[11px] text-[#61746b] mt-0.5">
                    CelebrAI will immediately initialize a normalized category budget, date-aware
                    chronological timeline tasks, vendor selection checklists, and curated ideas.
                    Works seamlessly online or offline.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f8f3ea] border-t border-[#e8dfcf]">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#143c2c] hover:bg-[#ede5d5] rounded-md transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                onClick={
                  step === 1
                    ? handleNextFromStep1
                    : step === 2
                    ? handleNextFromStep2
                    : () => setStep(4)
                }
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Create Celebration Plan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
