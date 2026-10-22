# CelebrAI — Every celebration, beautifully planned.

> **AI-Powered Celebration & Event Planning Copilot**  
> *Challenge 5: Celebration & Event Planner*

CelebrAI transforms complex event coordination—weddings, milestone birthdays, anniversaries, and community festivals—into an actionable, coordinated, and stress-free plan. Rather than returning generic chat responses, CelebrAI links an intelligent context-aware copilot directly with dynamic budget breakdowns, date-aware timelines, vendor contracts, and personalized ideas.

---

## 1. Chosen Vertical & Problem Statement

### The Problem
Planning celebrations involves high financial stakes, emotional investment, and logistical chaos. Event hosts often struggle with:
1. **Unrealistic Budgets & Silent Creep**: Lack of category-specific benchmarks leading to early overspending on venues, leaving insufficient funds for catering or emergencies.
2. **Arbitrary Deadlines**: Generic checklists that fail to adapt when an event is 3 weeks away versus 6 months away.
3. **Double-Counting Confusion**: Inability to clearly distinguish between what is estimated, what is contractually committed to vendors, and what has actually been paid out.
4. **Superficial AI Advice**: Chatbots that offer generic slogans without understanding local cultural nuances, specific guest dietary needs, or accessibility requirements.

### Intended Users
* **Couples & Families**: Organizing weddings, sangeets, receptions, and multi-day ceremonies.
* **Milestone Celebrants**: Planning milestone birthdays (1st, 18th, 50th) and anniversaries.
* **Community & Cultural Organizers**: Coordinating public festivals, block reunions, and civic assemblies requiring permits, volunteer safety, and crowd equipment.

---

## 2. Key Features

* **Real 4-Step Event Creation Wizard**: Captures celebration basics, guest count, budgets in multiple currencies (INR, USD, EUR, GBP, CAD, AUD, AED), flexibility levels, venue preferences (indoor, outdoor, mixed), dietary preferences, and accessibility needs.
* **Intelligent Deterministic Planning Engine**:
  * **Exact Budget Allocation**: Allocates total budget into category percentages with mathematical normalization to eliminate rounding drift.
  * **Date-Aware Dynamic Timeline**: Automatically calibrates task milestones against remaining days. For short planning windows (< 30 days), flags compressed deadlines and prioritizes urgent tasks without scheduling in the past.
  * **Vendor Contract & Booking Directory**: Tracks researching, contacted, negotiating, booked, and cancelled statuses with agreed costs, amounts paid, and pending balances.
  * **Personalized Ideas & Inclusivity**: Generates tailored themes, menus respecting dietary constraints, weather contingencies for outdoor venues, and guest engagement concepts.
* **Full-Stack Gemini 3.8 Flash Integration**:
  * Server-side route (`/api/assistant/chat`) calling `@google/genai` with model `gemini-3.8-flash`.
  * **Zero-Failure Local Deterministic Fallback**: If no Gemini API key is configured or the connection drops, the application seamlessly activates its built-in rule-based planning engine.
* **Financial Integrity**: Live budget utilization, paid vs. committed tracking, and actionable cost-saving recommendations that strictly protect essential safety and accessibility funding.
* **Privacy-First Local Persistence**: Account-free experience storing data securely in browser `localStorage`.
* **Portability & Day-of Execution**: One-click JSON backup export/import and print-friendly Run-of-Show event briefs.

---

## 3. Technical Architecture

CelebrAI is structured as a full-stack TypeScript application with strict separation between UI, domain business rules, persistence, and AI services.

```
celebr-ai/
├── src/
│   ├── domain/               # Pure domain models, validation, and formatters
│   │   ├── types.ts          # Strongly-typed domain interfaces
│   │   └── validation.ts     # Input validation, currency formatters, UUIDs
│   ├── services/
│   │   ├── planning/         # Pure deterministic planning engine
│   │   │   └── planningEngine.ts # Budget blueprints, date math, readiness score
│   │   ├── storage/          # LocalStorage abstraction with versioning
│   │   │   └── storageService.ts
│   │   └── ai/               # Client AI service & status probing
│   │       └── aiService.ts
│   ├── components/           # Modular UI components
│   │   ├── layout/           # Top bar header, sidebar, mobile navigation
│   │   ├── dashboard/        # Overview KPIs, countdown, upcoming milestones
│   │   ├── events/           # Portfolio management, 4-step wizard modal
│   │   ├── budget/           # Budget management, expense logger, visual bar
│   │   ├── timeline/         # Chronological milestones, status toggles
│   │   ├── vendors/          # Vendor directory, contracts, checklists
│   │   ├── ideas/            # Contextual concepts (themes, menus, rain plans)
│   │   ├── assistant/        # Conversational copilot with prompt chips
│   │   └── common/           # Printable run-of-show summary
│   ├── __tests__/            # Automated unit tests with Vitest
│   │   └── planning.test.ts  # 15+ comprehensive unit tests
│   ├── App.tsx               # Root application coordinator
│   └── main.tsx              # React DOM entry point
├── server.ts                 # Full-stack Express backend with Gemini API proxy
├── vite.config.ts            # Vite configuration with Tailwind CSS v4
├── metadata.json             # AI Studio applet metadata & major capabilities
└── package.json
```

---

## 4. How Event Data Flows Through the Application

1. **Creation**: User fills the 4-step wizard. `validateEventBasics` and `validateEventBudgetAndGuests` ensure valid inputs.
2. **Blueprint Generation**: `generateBudgetAllocation`, `generateTimeline`, `generateVendorChecklist`, and `generatePersonalizedIdeas` execute purely synchronously, generating tailored records.
3. **Storage**: `StorageService` atomically persists the event and child entities to `localStorage` under versioned keys.
4. **Reactive Recalculation**: `calculateBudgetMetrics` and `calculateReadinessScore` compute live metrics whenever expenses or tasks change.
5. **AI Augmentation**: When the user asks the assistant a question, client sends a bounded context snapshot (event parameters, budget summary, top urgent tasks) to `/api/assistant/chat`. If Gemini is unavailable, the deterministic engine generates context-specific answers immediately.

---

## 5. Security & Privacy Considerations

1. **Zero Secret Exposure**: Gemini API keys are accessed exclusively server-side via `process.env.GEMINI_API_KEY`. No API keys or tokens are ever exposed to client bundles or browser localStorage.
2. **XSS & Injection Protection**: User inputs and AI text are rendered strictly as text nodes in React rather than raw HTML (`dangerouslySetInnerHTML` is never used).
3. **No Dynamic Execution**: Absolutely no `eval()` or `new Function()` execution.
4. **Untrusted Data Sanitization**: Uploaded JSON backup files pass through `validateImportedData` schema validation before restoration.
5. **Private Client Storage**: All user event details remain entirely on the user's browser device. No personal event data is logged to third-party databases.

---

## 6. Accessibility (a11y) Highlights

* **Semantic Elements**: Full use of `<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`, and `<table>` elements.
* **Keyboard Accessible**: All buttons, form controls, dropdowns, and status toggles can be navigated and activated via keyboard.
* **High-Contrast Design System**: Built with deep forest green (`#0f2b20`), ivory canvas (`#faf7f2`), and champagne gold accents meeting WCAG AA requirements.
* **Zero-Pill Discipline**: Metadata is presented as unboxed, legible text with typographic separators (`·`), avoiding cluttered badge overlays.
* **Color Independence**: Statuses pair clear textual labels (e.g., "Overdue", "Booked", "Paid") alongside visual cues for color-blind accessibility.

---

## 7. Testing Strategy

Unit tests are written with **Vitest** for all pure business logic functions:
* **Budget Allocations**: Tests that allocated category amounts sum to 100% of the total budget with zero rounding drift across various numbers.
* **Overspending & Budget Math**: Validates that actual expenses, paid amounts, committed amounts, and cost-saving suggestions are accurate.
* **Date Calculations**: Tests milestone generation across multi-month planning periods, compressed windows (< 30 days), and past dates.
* **Input & Import Validation**: Tests rejection of invalid types, negative budgets, and malformed JSON payloads.
* **Fallback AI**: Tests that the local engine correctly answers urgent task queries, rain contingency queries, and dietary menu queries.

### Running Tests
```bash
npm run test
```

---

## 8. Prerequisites & Installation

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd celebr-ai

# Install dependencies
npm install
```

### Running Locally
```bash
# Start full-stack development server (runs Express + Vite on port 3000)
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Production Build
```bash
# Compile frontend assets
npm run build

# Start production server
npm run start
```

---

## 9. AI Configuration (Gemini API)

CelebrAI automatically checks for `GEMINI_API_KEY` in environment variables:
1. In Google AI Studio, the key is automatically injected at runtime through user secrets.
2. In local development or standalone deployments, add your key to `.env`:
   ```bash
   GEMINI_API_KEY="your-gemini-api-key-here"
   ```
3. **Graceful Fallback**: If no key is set, CelebrAI will clearly state that the Local Deterministic Planning Engine is active. Every feature—budget management, timeline generation, vendor checklists, and local assistant Q&A—works without any external API dependencies.

---

## 10. Data Persistence & Limitations

* **Local Storage Limitation**: Data is stored in the browser's `localStorage`. Clearing browser cache or switching devices will not automatically sync celebrations.
* **Backup & Restore**: Use the **Export JSON** feature on the header or My Events page to create portable backup files, and the **Restore Backup** feature to transfer events across browsers.
* **Printable Briefs**: Use the **Print** icon on the header to generate a printable run-of-show or save as a PDF for physical event day coordination.

---

## 11. License

Apache-2.0 License. Built for the Google AI Studio AI Hackathon.
