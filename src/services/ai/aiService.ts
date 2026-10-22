/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BudgetMetrics, ChatMessage, Event, TimelineTask, Vendor } from '../../domain/types';
import { generateLocalAssistantResponse } from '../planning/planningEngine';

export interface AssistantResponse {
  text: string;
  isLiveAI: boolean;
  suggestions?: string[];
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
    history: ChatMessage[];
  }): Promise<AssistantResponse> {
    const { message, event, tasks, vendors, budgetMetrics, history } = params;

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
          budgetMetrics,
          history: history.slice(-4).map((h) => ({ role: h.role, text: h.text })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          text: data.text,
          isLiveAI: Boolean(data.isLiveAI),
          suggestions: data.suggestions || [],
        };
      }
    } catch (err) {
      console.warn('[CelebrAI] Network error calling /api/assistant/chat, falling back locally:', err);
    }

    // Direct local fallback if server unreachable
    if (event) {
      const local = generateLocalAssistantResponse(message, event, tasks, vendors, budgetMetrics);
      return {
        text: local.text,
        isLiveAI: false,
        suggestions: local.suggestions,
      };
    }

    return {
      text: 'CelebrAI local planning assistant is ready. Please select or create an event to get context-specific recommendations.',
      isLiveAI: false,
      suggestions: ['Create a new event'],
    };
  }
}
