/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CornerDownLeft,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { BudgetMetrics, ChatMessage, Event, TimelineTask, Vendor } from '../../domain/types';
import { AIService } from '../../services/ai/aiService';

interface AssistantViewProps {
  event: Event | null;
  tasks: TimelineTask[];
  vendors: Vendor[];
  budgetMetrics: BudgetMetrics;
  hasGeminiKey: boolean;
}

const DEFAULT_CHIPS = [
  'What are my 3 most urgent tasks?',
  'How can I reduce costs without compromising guest experience?',
  'Suggest a dietary-friendly menu concept for our guests',
  'What vendors do I still need to book?',
  'Give me a rain contingency plan for our venue',
  'Suggest 3 engaging guest activities',
];

export const AssistantView: React.FC<AssistantViewProps> = ({
  event,
  tasks,
  vendors,
  budgetMetrics,
  hasGeminiKey,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-01',
      role: 'assistant',
      text: event
        ? `Welcome! I'm your CelebrAI Copilot for **${event.name}** (${event.guestCount} guests in ${event.location} on ${event.date}).\n\nI have complete real-time awareness of your budget status, date-aware timeline deadlines, and vendor progress. How can I assist your planning today?`
        : `Welcome to CelebrAI! Please select or create a celebration to begin context-aware copilot planning.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: DEFAULT_CHIPS,
      isLiveAI: hasGeminiKey,
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    setError(null);
    setInput('');

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await AIService.sendMessage({
        message: textToSend,
        event,
        tasks,
        vendors,
        budgetMetrics,
        history: [...messages, userMessage],
      });

      const assistantMessage: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions || DEFAULT_CHIPS,
        isLiveAI: response.isLiveAI,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('[CelebrAI] Assistant turn error:', err);
      setError('Encountered an issue processing your request. Please try again or choose a suggested topic below.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] bg-white border border-[#e8dfcf] rounded-xl overflow-hidden shadow-xs">
      {/* Header bar with Engine Indicator */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-[#fcfaf6] border-b border-[#e8dfcf]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#f5efe4] text-[#143c2c] rounded-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-base font-semibold text-[#0f2b20]">
              CelebrAI Planning Copilot
            </h2>
            <p className="text-[11px] text-[#6e7d76]">
              {event ? `Coordinating ${event.name} · ${event.guestCount} guests` : 'Context Assistant'}
            </p>
          </div>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2 text-xs text-[#52635b]">
          <span
            className={`w-2 h-2 rounded-full ${
              hasGeminiKey ? 'bg-[#bd9b46]' : 'bg-[#7d8b84]'
            }`}
          />
          <span className="font-medium text-[11px]">
            {hasGeminiKey ? 'Live Gemini 3.8 Flash' : 'Deterministic Planning Engine'}
          </span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#faf8f5]/50">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-[#143c2c] text-white'
                    : 'bg-[#f5efe4] text-[#143c2c] border border-[#e2d7c3]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#bd9b46]" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#143c2c] text-white rounded-tr-none'
                    : 'bg-white border border-[#e8dfcf] text-[#2d3b35] rounded-tl-none shadow-xs'
                }`}
              >
                {/* Assistant origin marker */}
                {!isUser && msg.isLiveAI !== undefined && (
                  <div className="text-[10px] text-[#7d8b84] font-mono uppercase tracking-wider mb-1.5 pb-1 border-b border-[#f0eae1] flex items-center justify-between">
                    <span>{msg.isLiveAI ? 'Gemini 3.8 Flash Response' : 'Local Planning Engine'}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                )}

                {/* Body Content with formatted paragraphs */}
                <div className="space-y-2 whitespace-pre-wrap">
                  {msg.text}
                </div>

                {/* Suggestions chips on last assistant message */}
                {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-[#f0eae1] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7d76] block">
                      Quick Clarifications & Next Actions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(sug)}
                          disabled={isLoading}
                          className="text-[11px] px-2.5 py-1 bg-[#fcfaf6] hover:bg-[#f5efe4] border border-[#e2d7c3] rounded text-[#143c2c] text-left transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#f5efe4] text-[#143c2c] border border-[#e2d7c3] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#bd9b46] animate-spin" />
            </div>
            <div className="bg-white border border-[#e8dfcf] rounded-xl rounded-tl-none p-3.5 text-xs text-[#6e7d76] flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#143c2c]" />
              <span>Analyzing event context and calculating recommendations...</span>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSend(messages[messages.length - 1]?.text)}
              className="text-xs font-semibold text-rose-900 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-4 bg-white border-t border-[#e8dfcf]">
        <div className="relative flex items-end bg-[#faf8f5] border border-[#d8cdb8] rounded-lg p-2 focus-within:border-[#143c2c] focus-within:ring-1 focus-within:ring-[#143c2c] transition-colors">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              event
                ? `Ask about budget, timeline tasks, vendor terms, rain plans, or menu ideas for ${event.name}...`
                : 'Ask CelebrAI a question...'
            }
            className="w-full bg-transparent text-xs text-[#0f2b20] placeholder-[#85968e] focus:outline-none resize-none pr-10"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-md transition-colors shrink-0 ${
              input.trim() && !isLoading
                ? 'bg-[#143c2c] text-white hover:bg-[#0f2b20]'
                : 'text-[#a3b3aa] cursor-not-allowed'
            }`}
            title="Send (Enter)"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-[#7d8b84]">
          <span>Shift + Enter for new line · Enter to submit</span>
          <span>{hasGeminiKey ? 'Gemini 3.8 Flash' : 'Local Deterministic Fallback'}</span>
        </div>
      </div>
    </div>
  );
};
