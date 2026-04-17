import { NextResponse } from "next/server";
import { chat } from "@/lib/ai/claude";
import { buildSystemPrompt, heuristicParse } from "@/lib/ai/assistant-prompts";
import { askGemini, isGeminiAvailable } from "@/lib/ai/gemini";
import { formatKnowledgeBaseForAI } from "@/lib/help/help-content";
import {
  analyzeGaps,
  detectConflicts,
  resolveProjectByName,
  resolveUserByName,
  mergeEntities,
  buildConfirmationSummary,
  logAssistantAction,
  type ParsedIntent,
  type TaskEntities,
} from "@/lib/ai/assistant-engine";
import {
  mockTasks,
  mockUsers,
  mockProjectMembers,
  getProjects,
  getUserById,
  CURRENT_USER_ID,
} from "@/lib/db/mock-data";

export const runtime = "nodejs";

interface RequestBody {
  text: string;
  locale: string;
  /** Previously extracted entities - passed back during clarification loop */
  carryover?: TaskEntities;
  /** Previous action - if we're continuing a dialog */
  carryoverAction?: string;
  /** Is this a confirmation response? */
  mode?: "parse" | "confirm";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const { text, locale: rawLocale, carryover, carryoverAction } = body;
    // Ensure locale is always a valid value — default to "he"
    const locale = rawLocale && ["he", "en", "ru", "fr", "es"].includes(rawLocale) ? rawLocale : "he";

    console.log(`[assistant] locale=${locale} (raw=${rawLocale}) text="${text.slice(0, 50)}"`);

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Empty input" }, { status: 400 });
    }

    const projects = getProjects();
    const currentUser = getUserById(CURRENT_USER_ID);
    if (!currentUser) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    // ============================================
    // 1. Intent Recognition - Claude or heuristic
    // ============================================
    let parsed: ParsedIntent;

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const systemPrompt = buildSystemPrompt(locale);
        const raw = await chat([{ role: "user", content: text }], systemPrompt);
        // Strip markdown fences if Claude wraps output
        const cleaned = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        const obj = JSON.parse(cleaned);
        parsed = {
          action: obj.action || "unknown",
          entities: obj.entities || {},
          rawText: text,
          confidence: obj.confidence ?? 0.7,
          responseText: obj.responseText,
        };
      } catch (err) {
        console.warn("[assistant] Claude parsing failed, using heuristic:", err);
        const heur = heuristicParse(text, locale);
        parsed = {
          action: heur.action as any,
          entities: heur.entities,
          rawText: text,
          confidence: heur.confidence,
          responseText: heur.responseText,
        };
      }
    } else {
      const heur = heuristicParse(text, locale);
      parsed = {
        action: heur.action as any,
        entities: heur.entities,
        rawText: text,
        confidence: heur.confidence,
        responseText: heur.responseText,
      };
    }

    // ============================================
    // 1b. GEMINI AI FALLBACK for informational questions
    // Detect language from text characters + locale for proper response
    // ============================================
    const hasHebrewInText = /[\u0590-\u05FF]/.test(text);
    const hasCyrillicInText = /[\u0400-\u04FF]/.test(text);
    // Determine response language: script detection → locale → Hebrew default
    const responseLang = hasHebrewInText ? "he" : hasCyrillicInText ? "ru" : (["en", "fr", "es"].includes(locale) ? locale : "he");
    const isQuestionLike = /[?？]|איך|מה|כיצד|למה|הסבר|ספר|how|what|why|explain|tell|describe|как|что|почему|объясни|расскажи|comment|qu[eé]|expliqu|cómo|qué|por qué|explica/i.test(text);
    const shouldTryGemini =
      isGeminiAvailable() &&
      (parsed.action === "unknown" || (isQuestionLike && parsed.action !== "create_task" && parsed.action !== "create_project"));

    if (shouldTryGemini) {
      try {
        const context = formatKnowledgeBaseForAI(responseLang === "he" ? "he" : "en");
        const answer = await askGemini(text, context, responseLang);
        parsed.action = "query_tasks";
        parsed.responseText = answer;
        parsed.confidence = 0.9;
        console.log(`[assistant] Gemini answered in ${responseLang}`);
      } catch (err) {
        console.warn("[assistant] Gemini failed, using heuristic response:", err);
        // Keep the heuristic response as fallback
      }
    }

    // ============================================
    // 2. Merge with carryover entities (clarification dialog)
    // ============================================
    if (carryover) {
      parsed.entities = mergeEntities(carryover, parsed.entities);
    }
    if (carryoverAction && parsed.action === "unknown") {
      parsed.action = carryoverAction as any;
    }

    // ============================================
    // 3. Resolve name hints to IDs
    // ============================================
    if (parsed.entities.projectNameHint && !parsed.entities.projectId) {
      parsed.entities.projectId = resolveProjectByName(parsed.entities.projectNameHint, projects);
    }
    if (parsed.entities.assigneeNameHint && !parsed.entities.assigneeId) {
      parsed.entities.assigneeId = resolveUserByName(parsed.entities.assigneeNameHint, mockUsers);
    }

    // ============================================
    // 4. Gap Analysis
    // ============================================
    const gaps = analyzeGaps(parsed, projects, mockUsers);

    // ============================================
    // 5. Conflict Detection
    // ============================================
    const conflicts = detectConflicts(parsed, currentUser, mockTasks, mockProjectMembers);
    const blockingConflicts = conflicts.filter((c) => c.blocking);

    // ============================================
    // 6. Determine next stage
    // ============================================
    let stage: "clarification" | "confirmation" | "blocked" | "query_response";
    let summary = "";

    if (blockingConflicts.length > 0) {
      stage = "blocked";
      logAssistantAction({
        actorUserId: currentUser.id,
        actorUserName: currentUser.name,
        action: `${parsed.action}_blocked`,
        entityType: "intent",
        details: { text, conflicts: blockingConflicts, parsed },
      });
    } else if (gaps.length > 0) {
      stage = "clarification";
    } else if (
      parsed.action === "query_risks" ||
      parsed.action === "query_tasks" ||
      parsed.action === "query_workload" ||
      parsed.action === "unknown"
    ) {
      stage = "query_response";
    } else {
      stage = "confirmation";
      summary = buildConfirmationSummary(parsed, projects, mockUsers, locale);
    }

    return NextResponse.json({
      stage,
      intent: parsed,
      gaps,
      conflicts,
      summary,
      _locale: locale, // debug: sent back so client can verify
    });
  } catch (err) {
    console.error("[assistant] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PUT = execute a confirmed action
 */
export async function PUT(req: Request) {
  try {
    const { intent } = (await req.json()) as { intent: ParsedIntent };
    const currentUser = getUserById(CURRENT_USER_ID);
    if (!currentUser) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    if (intent.action === "create_task") {
      const e = intent.entities;
      if (!e.title || !e.projectId || !e.assigneeId || !e.plannedStart || !e.plannedEnd) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // In mock mode - add to in-memory array
      const newTask = {
        id: `task-new-${Date.now()}`,
        wbsNodeId: e.projectId,
        parentTaskId: null,
        title: e.title,
        description: e.description || "",
        status: (e.status || "not_started") as any,
        priority: (e.priority || "medium") as any,
        assigneeId: e.assigneeId,
        plannedStart: e.plannedStart,
        plannedEnd: e.plannedEnd,
        actualStart: null,
        actualEnd: null,
        estimateHours: e.estimateHours || 8,
        actualHours: 0,
        progressPercent: 0,
        tags: e.tags || [],
        dependencies: [],
      };
      mockTasks.push(newTask);

      // Audit log
      logAssistantAction({
        actorUserId: currentUser.id,
        actorUserName: currentUser.name,
        action: "create_task",
        entityType: "Task",
        entityId: newTask.id,
        details: {
          title: newTask.title,
          projectId: newTask.wbsNodeId,
          assigneeId: newTask.assigneeId,
          viaAssistant: true,
        },
      });

      return NextResponse.json({ success: true, taskId: newTask.id });
    }

    return NextResponse.json(
      { error: `Action ${intent.action} not yet implemented for execution` },
      { status: 501 }
    );
  } catch (err) {
    console.error("[assistant PUT] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
