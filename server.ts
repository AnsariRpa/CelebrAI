/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { generateLocalAssistantResponse } from './src/services/planning/planningEngine';
import { parseReplanIntent } from './src/services/planning/intentParser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '1mb' }));

// Basic Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health and AI configuration check
app.get('/api/health', (_req: Request, res: Response) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  res.json({
    status: 'ok',
    hasGeminiKey,
    environment: isProduction ? 'production' : 'development',
    serverTime: new Date().toISOString(),
  });
});

// AI Assistant Chat Route
app.post('/api/assistant/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      message: rawMessage,
      event,
      tasks = [],
      vendors = [],
      categories = [],
      expenses = [],
      budgetMetrics = {},
      history = [],
    } = req.body;

    if (!rawMessage || typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
      res.status(400).json({ error: 'Valid user message is required.' });
      return;
    }

    const message = rawMessage.trim().slice(0, 2000);

    // Structured replan intent detection without hardcoded amounts or demonstration assumptions
    const parsedIntent = parseReplanIntent(message, event);

    let potentialReplanProposal = undefined;
    if (event && parsedIntent.isReplanIntent && parsedIntent.hasExplicitParameters) {
      const replanEval = generateLocalAssistantResponse(
        message,
        event,
        tasks,
        vendors,
        budgetMetrics,
        categories,
        expenses
      );
      potentialReplanProposal = replanEval.replanProposal;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini key is available, attempt live generation using Gemini 3.8 Flash
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        // Construct a bounded, practical context summary
        const eventSummary = event
          ? `Event: "${event.name}" (${event.type}), Date: ${event.date}, Location: ${event.location}, Guests: ${event.guestCount}, Budget: ${event.currency} ${event.totalBudget}, Actual Spent: ${event.currency} ${budgetMetrics.totalActual || 0}, Remaining: ${event.currency} ${budgetMetrics.remainingBudget || 0}. Style: ${event.preferences?.style || 'Standard'}. Dietary: ${event.preferences?.dietaryRequirements?.join(', ') || 'None stated'}. Accessibility: ${event.preferences?.accessibilityNeeds?.join(', ') || 'None stated'}. Priority Focus: ${event.preferences?.priorityFocus || 'food_guest_experience'}.`
          : 'No specific event selected.';

        const urgentTasks = tasks
          .filter((t: { status: string; priority: string }) => t.status !== 'completed' && (t.priority === 'urgent' || t.priority === 'high'))
          .slice(0, 4)
          .map((t: { title: string; dueDate: string }) => `- ${t.title} (due ${t.dueDate})`)
          .join('\n');

        const systemInstruction = `You are CelebrAI, an expert, thoughtful, and highly actionable event planning copilot.
Your job is to help users organize weddings, birthdays, anniversaries, and community celebrations with clarity, aesthetic restraint, and practical advice.

CRITICAL RULES:
1. Always respect the stated budget, guest count, dietary, and accessibility constraints.
2. If the user reports a budget drop, date shift, or requests to replan/revise, provide clear trade-offs, explain which categories are protected (e.g. food quality and guest experience), show which costs are trimmed, and confirm that completed tasks and actual expenses are safely preserved.
3. Provide concrete, actionable next steps rather than generic platitudes.
4. Clearly label cost estimates as illustrative approximations, not verified merchant quotations.
5. Never recommend cutting emergency safety, food hygiene, or accessibility measures as cost savings.
6. If the event is in the near future (compressed window), prioritize urgent immediate tasks.
7. Keep answers structured, elegant, and concise with bullet points where appropriate.

Current Event Context:
${eventSummary}

Pending Urgent Milestones:
${urgentTasks || 'None at this moment.'}`;

        // Format recent messages for context
        const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

        // Add last 3 user/assistant turns if available
        if (Array.isArray(history)) {
          const recent = history.slice(-4);
          for (const item of recent) {
            if (item.text && item.role) {
              contents.push({
                role: item.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: item.text }],
              });
            }
          }
        }

        // Add current user turn
        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini call timeout')), 6500)
        );

        const response = await Promise.race([geminiPromise, timeoutPromise]);

        const responseText = response.text || '';
        if (responseText.trim().length > 0) {
          res.json({
            text: responseText,
            isLiveAI: true,
            replanProposal: potentialReplanProposal,
            suggestions: potentialReplanProposal
              ? [
                  'Review and apply revised plan',
                  'What are my 3 most urgent tasks?',
                  'How to reduce costs further?',
                  'Check vendor quotation comparison',
                ]
              : [
                  'What are my 3 most urgent tasks?',
                  'How can I reduce costs without compromising guest experience?',
                  'What vendors do I still need to book?',
                  'Give me a rain contingency plan',
                ],
          });
          return;
        }
      } catch (geminiError) {
        console.warn('[CelebrAI] Gemini API call failed, falling back to local planning engine:', geminiError);
        // Seamlessly continue to deterministic fallback below
      }
    }

    // Deterministic fallback response when Gemini key is not present or failed
    if (event) {
      const fallback = generateLocalAssistantResponse(
        message,
        event,
        tasks,
        vendors,
        budgetMetrics,
        categories,
        expenses
      );
      res.json({
        text: fallback.text,
        isLiveAI: false,
        suggestions: fallback.suggestions,
        replanProposal: fallback.replanProposal,
        isFallback: true,
      });
      return;
    }

    res.json({
      text: 'CelebrAI local planning assistant is ready. Please select or create an event to get context-specific recommendations.',
      isLiveAI: false,
      suggestions: ['Create a new event'],
    });
  } catch (error) {
    console.error('[CelebrAI] Assistant route error:', error);
    res.status(500).json({ error: 'Failed to generate planning recommendation.' });
  }
});

// Server bootstrap
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CelebrAI server active at http://0.0.0.0:${PORT} [${isProduction ? 'PROD' : 'DEV'}]`);
  });
}

startServer().catch((err) => {
  console.error('[CelebrAI] Fatal server startup error:', err);
  process.exit(1);
});
