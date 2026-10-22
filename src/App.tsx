/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './components/layout/Header';
import { NavTab, Sidebar } from './components/layout/Sidebar';
import { OverviewView } from './components/dashboard/OverviewView';
import { MyEventsView } from './components/events/MyEventsView';
import { BudgetView } from './components/budget/BudgetView';
import { TimelineView } from './components/timeline/TimelineView';
import { VendorsView } from './components/vendors/VendorsView';
import { IdeasView } from './components/ideas/IdeasView';
import { AssistantView } from './components/assistant/AssistantView';
import { EventWizardModal } from './components/events/EventWizardModal';
import { PrintableSummary } from './components/common/PrintableSummary';
import {
  BudgetCategory,
  ChecklistItem,
  Event,
  Expense,
  SavedIdea,
  TimelineTask,
  Vendor,
} from './domain/types';
import {
  calculateBudgetMetrics,
  calculateReadinessScore,
} from './services/planning/planningEngine';
import { StorageService } from './services/storage/storageService';
import { AIService } from './services/ai/aiService';

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);

  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Initial load and storage bootstrapping
  useEffect(() => {
    StorageService.init();
    loadAllData();
    AIService.checkStatus().then((res) => setHasGeminiKey(res.hasGeminiKey));
  }, []);

  const loadAllData = () => {
    const loadedEvents = StorageService.getEvents();
    const activeId = StorageService.getActiveEventId();
    setEvents(loadedEvents);
    setActiveEventId(activeId);

    if (activeId) {
      setCategories(StorageService.getCategories(activeId));
      setExpenses(StorageService.getExpenses(activeId));
      setTasks(StorageService.getTasks(activeId));
      setVendors(StorageService.getVendors(activeId));
      setChecklist(StorageService.getChecklist(activeId));
      setIdeas(StorageService.getIdeas(activeId));
    } else {
      setCategories([]);
      setExpenses([]);
      setTasks([]);
      setVendors([]);
      setChecklist([]);
      setIdeas([]);
    }
  };

  const activeEvent = useMemo(() => {
    if (!activeEventId) return events[0] || null;
    return events.find((e) => e.id === activeEventId) || events[0] || null;
  }, [events, activeEventId]);

  // Derived budget summaries
  const budgetMetrics = useMemo(() => {
    if (!activeEvent) {
      return {
        totalBudget: 0,
        totalAllocated: 0,
        totalEstimated: 0,
        totalActual: 0,
        totalPaid: 0,
        totalCommitted: 0,
        remainingBudget: 0,
        utilizationPercent: 0,
        isOverspent: false,
        overspentAmount: 0,
        costSavingSuggestions: [],
      };
    }
    return calculateBudgetMetrics(activeEvent.totalBudget, categories, expenses, vendors);
  }, [activeEvent, categories, expenses, vendors]);

  // Derived readiness score
  const readiness = useMemo(() => {
    if (!activeEvent) {
      return {
        overallScore: 0,
        label: 'No Event',
        budgetReadiness: 0,
        taskReadiness: 0,
        vendorReadiness: 0,
        daysRemaining: 0,
        isPast: false,
        isUrgentLeadTime: false,
      };
    }
    return calculateReadinessScore(activeEvent, tasks, vendors, budgetMetrics);
  }, [activeEvent, tasks, vendors, budgetMetrics]);

  const handleSelectEvent = (eventId: string) => {
    StorageService.setActiveEventId(eventId);
    setActiveEventId(eventId);
    setCategories(StorageService.getCategories(eventId));
    setExpenses(StorageService.getExpenses(eventId));
    setTasks(StorageService.getTasks(eventId));
    setVendors(StorageService.getVendors(eventId));
    setChecklist(StorageService.getChecklist(eventId));
    setIdeas(StorageService.getIdeas(eventId));
  };

  const handleCreateEvent = (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = StorageService.createEvent(eventData);
    loadAllData();
    setActiveEventId(created.id);
    setCurrentTab('overview');
    showNotification(`Plan initialized for "${created.name}"!`);
  };

  const handleDeleteEvent = (eventId: string) => {
    StorageService.deleteEvent(eventId);
    loadAllData();
    showNotification('Event removed.');
  };

  // Budget expense handlers
  const handleAddExpense = (expense: Expense) => {
    StorageService.addExpense(expense);
    setExpenses(StorageService.getExpenses(expense.eventId));
    setCategories(StorageService.getCategories(expense.eventId));
    showNotification('Expense recorded.');
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (activeEventId) {
      StorageService.deleteExpense(expenseId);
      setExpenses(StorageService.getExpenses(activeEventId));
      setCategories(StorageService.getCategories(activeEventId));
      showNotification('Expense removed.');
    }
  };

  const handleUpdateCategory = (category: BudgetCategory) => {
    StorageService.updateCategory(category);
    if (activeEventId) {
      setCategories(StorageService.getCategories(activeEventId));
      showNotification('Category estimate updated.');
    }
  };

  // Task handlers
  const handleAddTask = (task: TimelineTask) => {
    StorageService.addTask(task);
    if (activeEventId) {
      setTasks(StorageService.getTasks(activeEventId));
      showNotification('Milestone added.');
    }
  };

  const handleUpdateTask = (task: TimelineTask) => {
    StorageService.updateTask(task);
    if (activeEventId) {
      setTasks(StorageService.getTasks(activeEventId));
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (activeEventId) {
      StorageService.deleteTask(taskId);
      setTasks(StorageService.getTasks(activeEventId));
      showNotification('Milestone deleted.');
    }
  };

  // Vendor handlers
  const handleAddVendor = (vendor: Vendor) => {
    StorageService.addVendor(vendor);
    if (activeEventId) {
      setVendors(StorageService.getVendors(activeEventId));
      showNotification('Vendor partner saved.');
    }
  };

  const handleUpdateVendor = (vendor: Vendor) => {
    StorageService.updateVendor(vendor);
    if (activeEventId) {
      setVendors(StorageService.getVendors(activeEventId));
      showNotification('Vendor record updated.');
    }
  };

  const handleDeleteVendor = (vendorId: string) => {
    if (activeEventId) {
      StorageService.deleteVendor(vendorId);
      setVendors(StorageService.getVendors(activeEventId));
      showNotification('Vendor removed.');
    }
  };

  // Checklist handlers
  const handleToggleChecklist = (itemId: string) => {
    StorageService.toggleChecklistItem(itemId);
    if (activeEventId) {
      setChecklist(StorageService.getChecklist(activeEventId));
    }
  };

  const handleAddChecklistItem = (item: ChecklistItem) => {
    StorageService.addChecklistItem(item);
    if (activeEventId) {
      setChecklist(StorageService.getChecklist(activeEventId));
      showNotification('Checklist item added.');
    }
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (activeEventId) {
      StorageService.deleteChecklistItem(itemId);
      setChecklist(StorageService.getChecklist(activeEventId));
    }
  };

  // Ideas handlers
  const handleToggleIdeaSaved = (ideaId: string) => {
    StorageService.toggleIdeaSaved(ideaId);
    if (activeEventId) {
      setIdeas(StorageService.getIdeas(activeEventId));
    }
  };

  const handleToggleIdeaUsed = (ideaId: string) => {
    StorageService.toggleIdeaUsed(ideaId);
    if (activeEventId) {
      setIdeas(StorageService.getIdeas(activeEventId));
    }
  };

  // Export & Import
  const handleExportEvent = (eventId: string) => {
    const jsonStr = StorageService.exportEventBackup(eventId);
    if (!jsonStr) return;

    const targetEvt = events.find((e) => e.id === eventId) || activeEvent;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `celebr_ai_${(targetEvt?.name || 'event').toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Backup downloaded.');
  };

  const handleImportBackup = (jsonString: string) => {
    const res = StorageService.importEventBackup(jsonString);
    if (res.success && res.eventId) {
      loadAllData();
      handleSelectEvent(res.eventId);
      setCurrentTab('overview');
      showNotification('Celebration plan restored successfully!');
    } else {
      showNotification('Failed to import backup: ' + (res.error || 'Invalid file'));
    }
  };

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const unbookedVendorsCount = vendors.filter((v) => v.bookingStatus !== 'booked').length;

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col text-[#1c2826]">
      {/* Top Bar */}
      <Header
        activeEvent={activeEvent}
        events={events}
        onSelectEvent={handleSelectEvent}
        onOpenWizard={() => setIsWizardOpen(true)}
        onPrint={() => setIsPrintOpen(true)}
        onExport={() => activeEvent && handleExportEvent(activeEvent.id)}
        hasGeminiKey={hasGeminiKey}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingTasksCount={pendingTasksCount}
          unbookedVendorsCount={unbookedVendorsCount}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 min-w-0">
          {currentTab === 'overview' && (
            <OverviewView
              event={activeEvent}
              budgetMetrics={budgetMetrics}
              readiness={readiness}
              tasks={tasks}
              vendors={vendors}
              categories={categories}
              ideas={ideas}
              onNavigate={setCurrentTab}
              onOpenWizard={() => setIsWizardOpen(true)}
            />
          )}

          {currentTab === 'events' && (
            <MyEventsView
              events={events}
              activeEventId={activeEventId}
              onSelectEvent={handleSelectEvent}
              onDeleteEvent={handleDeleteEvent}
              onOpenWizard={() => setIsWizardOpen(true)}
              onExportEvent={handleExportEvent}
              onImportBackup={handleImportBackup}
            />
          )}

          {currentTab === 'budget' && activeEvent && (
            <BudgetView
              event={activeEvent}
              categories={categories}
              expenses={expenses}
              budgetMetrics={budgetMetrics}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onUpdateCategory={handleUpdateCategory}
            />
          )}

          {currentTab === 'timeline' && activeEvent && (
            <TimelineView
              event={activeEvent}
              tasks={tasks}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {currentTab === 'vendors' && activeEvent && (
            <VendorsView
              event={activeEvent}
              vendors={vendors}
              checklist={checklist}
              onAddVendor={handleAddVendor}
              onUpdateVendor={handleUpdateVendor}
              onDeleteVendor={handleDeleteVendor}
              onToggleChecklist={handleToggleChecklist}
              onAddChecklistItem={handleAddChecklistItem}
              onDeleteChecklistItem={handleDeleteChecklistItem}
            />
          )}

          {currentTab === 'ideas' && activeEvent && (
            <IdeasView
              event={activeEvent}
              ideas={ideas}
              onToggleSaved={handleToggleIdeaSaved}
              onToggleUsed={handleToggleIdeaUsed}
            />
          )}

          {currentTab === 'assistant' && (
            <AssistantView
              event={activeEvent}
              tasks={tasks}
              vendors={vendors}
              budgetMetrics={budgetMetrics}
              hasGeminiKey={hasGeminiKey}
            />
          )}
        </main>
      </div>

      {/* Floating feedback notification toast */}
      {feedbackMessage && (
        <div className="fixed bottom-16 md:bottom-6 right-6 z-50 bg-[#0f2b20] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg border border-[#24634a] animate-fade-in flex items-center gap-2">
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Modals */}
      <EventWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateEvent={handleCreateEvent}
      />

      {isPrintOpen && activeEvent && (
        <PrintableSummary
          event={activeEvent}
          tasks={tasks}
          vendors={vendors}
          categories={categories}
          budgetMetrics={budgetMetrics}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
}
