/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BudgetCategory,
  BudgetMetrics,
  ChatMessage,
  Event,
  Expense,
  ReplanProposal,
  TimelineTask,
  Vendor,
} from '../../domain/types';
import { generateLocalAssistantResponse } from '../planning/planningEngine';

export interface AssistantResponse {
  text: string;
  isLiveAI: boolean;
  modelUsed?: string;
  suggestions?: string[];
  replanProposal?: ReplanProposal;
  error?: string;
}

export class AIService {
  private static cachedHealth: { hasGeminiKey: boolean; timestamp: number } | null = null;

  /**
   * Checks whether the server environment has a configured Gemini API key
   */
  static async checkStatus(): Promise<{ hasGeminiKey: boolean }> {
    const now = Date.now();
    if (this.cachedHealth && now - this.cachedHealth.timestamp < 30000) {
      return { hasGeminiKey: this.cachedHealth.hasGeminiKey };
    }

    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        const hasKey = Boolean(data.hasGeminiKey);
        this.cachedHealth = { hasGeminiKey: hasKey, timestamp: now };
        return { hasGeminiKey: hasKey };
      }
    } catch (err) {
      console.warn('[CelebrAI] Health probe failed, defaulting to local engine:', err);
    }

    return { hasGeminiKey: false };
  }

  /**
   * Sends user message to planning assistant
   */
  static async sendMessage(params: {
    message: string;
    event: Event | null;
    tasks: TimelineTask[];
    vendors: Vendor[];
    budgetMetrics: BudgetMetrics;
    categories?: BudgetCategory[];
    expenses?: Expense[];
    history: ChatMessage[];
  }): Promise<AssistantResponse> {
    const { message, event, tasks, vendors, budgetMetrics, categories = [], expenses = [], history } = params;

    // Attempt server route
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          event,
          tasks,
          vendors,
          categories,
          expenses,
          budgetMetrics,
          history: history.slice(-4).map((h) => ({ role: h.role, text: h.text })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          text: data.text,
          isLiveAI: Boolean(data.isLiveAI),
          modelUsed: data.modelUsed,
          suggestions: data.suggestions || [],
          replanProposal: data.replanProposal,
        };
      }
    } catch (err) {
      console.warn('[CelebrAI] Network error calling /api/assistant/chat, falling back locally:', err);
    }

    // Direct local fallback if server unreachable
    if (event) {
      const local = generateLocalAssistantResponse(
        message,
        event,
        tasks,
        vendors,
        budgetMetrics,
        categories,
        expenses
      );
      return {
        text: local.text,
        isLiveAI: false,
        suggestions: local.suggestions,
        replanProposal: local.replanProposal,
      };
    }

    return {
      text: 'CelebrAI local planning assistant is ready. Please select or create an event to get context-specific recommendations.',
      isLiveAI: false,
      suggestions: ['Create a new event'],
    };
  }
}
